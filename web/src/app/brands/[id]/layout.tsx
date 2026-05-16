import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../lib/supabase/service';
import { signOut } from '../../../lib/actions';
import { Brand } from '../../../db/schema';
import BrandNav from './BrandNav';
import { computeBrandReadiness } from '../../../lib/readiness';

const PLATFORM_LABELS: Record<string, string> = {
  facebook:  'FB',
  instagram: 'IG',
  twitter:   'X',
  linkedin:  'LI',
  tiktok:    'TK',
  telegram:  'TG',
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook:  'bg-blue-900 text-blue-300',
  instagram: 'bg-pink-900 text-pink-300',
  twitter:   'bg-sky-900 text-sky-300',
  linkedin:  'bg-blue-900 text-blue-200',
  tiktok:    'bg-slate-700 text-slate-200',
  telegram:  'bg-cyan-900 text-cyan-300',
};

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export default async function BrandLayout({ children, params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: accountsData }, { count: sportSourceCount }, readiness] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('platform_accounts').select('platform').eq('brand_id', params.id).eq('is_active', true),
    db.from('data_sources')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', params.id)
      .neq('status', 'archived')
      .ilike('source_type', '%sport%'),
    computeBrandReadiness(params.id),
  ]);

  if (!brandData) notFound();

  const brand = brandData as Pick<Brand, 'id' | 'name'>;

  // Deduplicate platforms from active platform_accounts
  const seenPlatforms = new Set<string>();
  const enabledPlatforms = (accountsData ?? [])
    .map((a: { platform: string }) => a.platform)
    .filter((p) => { if (seenPlatforms.has(p)) return false; seenPlatforms.add(p); return true; });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-slate-700 bg-slate-900 px-4 py-3 flex items-center gap-4">
        <Link
          href="/brands"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap"
        >
          ← Brands
        </Link>

        <span className="text-sm font-semibold text-slate-100 truncate">{brand.name}</span>

        {/* Readiness badge */}
        <Link
          href={`/brands/${params.id}/setup`}
          className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
            readiness.isReady
              ? 'bg-emerald-900 text-emerald-300 hover:bg-emerald-800'
              : 'bg-amber-900 text-amber-300 hover:bg-amber-800'
          }`}
        >
          {readiness.isReady ? 'Ready' : 'Setup incomplete'}
        </Link>

        {/* Enabled platform badges */}
        {enabledPlatforms.length > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            {enabledPlatforms.map((p) => (
              <span
                key={p}
                title={p}
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${PLATFORM_COLORS[p] ?? 'bg-slate-700 text-slate-300'}`}
              >
                {PLATFORM_LABELS[p] ?? p.toUpperCase().slice(0, 2)}
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto">
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <BrandNav brandId={params.id} sportEnabled={!!sportSourceCount} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
