import Link from 'next/link';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { getDemoSeedState, SeedState } from '../../../../../lib/seed/demo';
import {
  seedProfile,
  seedVoice,
  seedTemplates,
  seedAutomation,
  seedDataSource,
  seedAll,
} from './actions';

export const dynamic = 'force-dynamic';

// ── Category rows ─────────────────────────────────────────────────────

type CategoryRow = {
  key: keyof SeedState;
  label: string;
  description: string;
  seeded: (state: SeedState) => boolean;
  detail: (state: SeedState) => string | null;
  action: (brandId: string) => Promise<void>;
  canReseed: boolean;
};

const CATEGORIES: CategoryRow[] = [
  {
    key: 'profile',
    label: 'Profile',
    description: 'Industry, core values, target audience, tone of voice, objectives, brand story',
    seeded: (s) => s.profile,
    detail: () => null,
    action: seedProfile,
    canReseed: true,
  },
  {
    key: 'voice',
    label: 'Voice',
    description: 'Tone, style, sample copy, platform guidelines',
    seeded: (s) => s.voice,
    detail: () => null,
    action: seedVoice,
    canReseed: true,
  },
  {
    key: 'templates',
    label: 'Templates',
    description: '2 caption templates — matchday call-to-action and result celebration',
    seeded: (s) => s.templates > 0,
    detail: (s) => s.templates > 0 ? `${s.templates} demo template${s.templates !== 1 ? 's' : ''}` : null,
    action: seedTemplates,
    canReseed: false,
  },
  {
    key: 'automation',
    label: 'Automation',
    description: '1 example automation rule (scheduled trigger, manual source)',
    seeded: (s) => s.automation > 0,
    detail: (s) => s.automation > 0 ? `${s.automation} demo rule${s.automation !== 1 ? 's' : ''}` : null,
    action: seedAutomation,
    canReseed: false,
  },
  {
    key: 'dataSource',
    label: 'Data source',
    description: '1 stub manual data source (status: draft)',
    seeded: (s) => s.dataSource > 0,
    detail: (s) => s.dataSource > 0 ? `${s.dataSource} demo source${s.dataSource !== 1 ? 's' : ''}` : null,
    action: seedDataSource,
    canReseed: false,
  },
];

// ── Page ──────────────────────────────────────────────────────────────

export default async function AdminBrandSeedPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: brand } = await db
    .from('brands')
    .select('id, name, is_demo')
    .eq('id', params.id)
    .single();

  if (!brand) notFound();

  const state = await getDemoSeedState(params.id);

  const seededCount = CATEGORIES.filter((c) => c.seeded(state)).length;
  const allSeeded = seededCount === CATEGORIES.length;

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 text-sm text-slate-500">
          <Link href="/admin/brands" className="hover:text-slate-300 transition-colors">
            Brands
          </Link>
          <span>/</span>
          <Link
            href={`/brands/${params.id}/setup`}
            className="hover:text-slate-300 transition-colors"
          >
            {brand.name}
          </Link>
          <span>/</span>
          <span className="text-slate-400">Seed</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Demo seed</h1>
              {brand.is_demo && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-800">
                  Demo
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {seededCount}/{CATEGORIES.length} categories initialised
            </p>
          </div>

          {/* Seed all */}
          {!allSeeded && (
            <form action={seedAll.bind(null, params.id)}>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Initialize all
              </button>
            </form>
          )}
          {allSeeded && (
            <span className="text-sm text-emerald-400 font-medium">All seeded ✓</span>
          )}
        </div>
      </div>

      {/* Notice if brand is not marked demo */}
      {!brand.is_demo && (
        <div className="mb-6 rounded-lg border border-amber-800 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          This brand is not marked as a demo. Seeding will still work, but consider{' '}
          <Link href="/admin/brands" className="underline hover:text-amber-100">
            marking it as demo
          </Link>{' '}
          from the brands list to keep it isolated in operator views.
        </div>
      )}

      {/* Category table */}
      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
        {CATEGORIES.map((cat) => {
          const isSeeded = cat.seeded(state);
          const detail = cat.detail(state);
          const showButton = !isSeeded || cat.canReseed;

          return (
            <div
              key={cat.key}
              className="flex items-center gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-800/40 transition-colors"
            >
              {/* State indicator */}
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {isSeeded ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
                    ✓
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-600" />
                )}
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                  {detail && (
                    <span className="text-xs text-slate-500">{detail}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{cat.description}</p>
              </div>

              {/* Action button */}
              {showButton && (
                <form action={cat.action.bind(null, params.id)} className="shrink-0">
                  <button
                    type="submit"
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isSeeded
                        ? 'text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600'
                        : 'text-white bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {isSeeded ? 'Re-seed' : 'Initialize'}
                  </button>
                </form>
              )}
              {isSeeded && !cat.canReseed && (
                <span className="shrink-0 text-xs text-slate-600">seeded</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-4 text-xs text-slate-600">
        Seeding is idempotent. Profile and voice are always overwritten with fixture data.
        Templates, rules, and data sources are skipped if demo entries already exist.
      </p>
    </div>
  );
}
