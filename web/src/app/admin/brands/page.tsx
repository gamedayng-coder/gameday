import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../lib/supabase/service';
import { computeBrandReadiness, BrandReadiness } from '../../../lib/readiness';
import { setBrandIsDemo } from './actions';

export const dynamic = 'force-dynamic';

// ── Readiness summary helpers ──────────────────────────────────────────

const REQUIRED_CHECKS: { key: keyof BrandReadiness['checks']; label: string; short: string }[] = [
  { key: 'profileComplete',       label: 'Profile complete',        short: 'Profile'     },
  { key: 'voiceConfigured',       label: 'Voice configured',        short: 'Voice'       },
  { key: 'templatePresent',       label: 'Template present',        short: 'Template'    },
  { key: 'credentialConnected',   label: 'Credential connected',    short: 'Credential'  },
  { key: 'platformAccountActive', label: 'Platform account active', short: 'Account'     },
];

function CheckDot({
  pass,
  label,
  skipped = false,
}: {
  pass: boolean;
  label: string;
  skipped?: boolean;
}) {
  if (skipped) {
    return (
      <span title={`${label}: N/A`} className="w-2 h-2 rounded-full bg-slate-700 inline-block" />
    );
  }
  return (
    <span
      title={`${label}: ${pass ? 'pass' : 'fail'}`}
      className={`w-2 h-2 rounded-full inline-block ${pass ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  );
}

type FilterTab = 'all' | 'demo' | 'live';

// ── Page ──────────────────────────────────────────────────────────────

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const filter: FilterTab =
    searchParams.filter === 'demo' ? 'demo'
    : searchParams.filter === 'live' ? 'live'
    : 'all';

  const db = createSupabaseServiceClient();
  let query = db
    .from('brands')
    .select('id, name, is_demo, created_at, updated_at')
    .order('name');

  if (filter === 'demo') query = query.eq('is_demo', true);
  if (filter === 'live') query = query.eq('is_demo', false);

  const { data: brandsData } = await query;

  const brands = (brandsData ?? []) as {
    id: string;
    name: string;
    is_demo: boolean;
    created_at: string;
    updated_at: string;
  }[];

  // Parallelise readiness computation across all brands
  const readinessResults = await Promise.all(
    brands.map((b) => computeBrandReadiness(b.id)),
  );

  const rows = brands.map((brand, i) => ({
    brand,
    readiness: readinessResults[i],
  }));

  const readyCount = rows.filter((r) => r.readiness.isReady).length;
  const demoCount = rows.filter((r) => r.brand.is_demo).length;

  const TAB_LABELS: Record<FilterTab, string> = {
    all: 'All',
    demo: 'Demo',
    live: 'Live',
  };

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-100">Brands</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
              Internal
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {brands.length} tenant{brands.length !== 1 ? 's' : ''} ·{' '}
            {readyCount} go-live ready
            {filter === 'all' && demoCount > 0 && (
              <> · {demoCount} demo</>
            )}
          </p>
        </div>
        <Link
          href="/brands/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New brand
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-800 pb-0">
        {(['all', 'demo', 'live'] as FilterTab[]).map((tab) => (
          <Link
            key={tab}
            href={tab === 'all' ? '/admin/brands' : `/admin/brands?filter=${tab}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {TAB_LABELS[tab]}
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Pass
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Fail
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" /> N/A
        </span>
        <span className="ml-4">
          Dots: Profile · Voice · Template · Credential · Account
        </span>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">
            {filter === 'demo'
              ? 'No demo brands yet.'
              : filter === 'live'
              ? 'No live brands yet.'
              : 'No brands yet.'}
          </p>
          {filter === 'all' && (
            <Link
              href="/brands/new"
              className="inline-block mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Create the first brand →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Checks
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Last updated
                </th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(({ brand, readiness }) => {
                const { checks, isReady } = readiness;
                const requiredPassed = REQUIRED_CHECKS.filter((c) => {
                  const check = checks[c.key];
                  return check !== null && check.pass;
                }).length;
                const requiredTotal = REQUIRED_CHECKS.filter(
                  (c) => checks[c.key] !== null,
                ).length;

                return (
                  <tr
                    key={brand.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Brand name + demo badge */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/brands/${brand.id}/setup`}
                          className="font-medium text-slate-200 hover:text-indigo-400 transition-colors"
                        >
                          {brand.name}
                        </Link>
                        {brand.is_demo && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-800">
                            Demo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ready badge */}
                    <td className="py-3 px-3 text-center">
                      {isReady ? (
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300">
                          Ready
                        </span>
                      ) : (
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                          {requiredPassed}/{requiredTotal}
                        </span>
                      )}
                    </td>

                    {/* Per-check dots */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {REQUIRED_CHECKS.map((c) => {
                          const check = checks[c.key];
                          return (
                            <CheckDot
                              key={c.key}
                              pass={check?.pass ?? false}
                              label={c.label}
                              skipped={check === null}
                            />
                          );
                        })}
                      </div>
                    </td>

                    {/* Last updated */}
                    <td className="py-3 px-3 text-right text-xs text-slate-500">
                      {new Date(brand.updated_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* Demo toggle */}
                        <form
                          action={setBrandIsDemo.bind(null, brand.id, !brand.is_demo)}
                        >
                          <button
                            type="submit"
                            className={`text-xs transition-colors ${
                              brand.is_demo
                                ? 'text-amber-500 hover:text-amber-300'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title={brand.is_demo ? 'Mark as live' : 'Mark as demo'}
                          >
                            {brand.is_demo ? 'Live ↑' : 'Demo ↓'}
                          </button>
                        </form>
                        {brand.is_demo && (
                          <Link
                            href={`/admin/brands/${brand.id}/seed`}
                            className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
                          >
                            Seed
                          </Link>
                        )}
                        <Link
                          href={`/brands/${brand.id}/setup`}
                          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          Setup
                        </Link>
                        <Link
                          href={`/brands/${brand.id}/setup/readiness`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Readiness →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
