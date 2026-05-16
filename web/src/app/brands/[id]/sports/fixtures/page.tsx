import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { SportsFixture, SportsFixtureStatus } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = {
  params: { id: string };
  searchParams: { status?: string; competition_id?: string };
};

const STATUS_COLOURS: Record<SportsFixtureStatus, string> = {
  scheduled:  'bg-slate-700 text-slate-400',
  live:       'bg-green-900/40 text-green-300',
  completed:  'bg-blue-900/40 text-blue-300',
  postponed:  'bg-yellow-900/40 text-yellow-300',
  cancelled:  'bg-slate-800 text-slate-600',
};

const STATUS_TABS: SportsFixtureStatus[] = ['scheduled', 'live', 'completed', 'postponed', 'cancelled'];

type FixtureRow = SportsFixture & {
  home_team: { name: string; short_name: string | null } | null;
  away_team: { name: string; short_name: string | null } | null;
  competition: { name: string } | null;
};

export default async function FixturesPage({ params, searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const statusFilter = (searchParams.status as SportsFixtureStatus | undefined) ?? 'scheduled';

  const [{ data: brandData }, { data: fixturesData }, { data: competitionsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('sports_fixtures')
      .select(`
        *,
        home_team:sports_teams!home_team_id(name, short_name),
        away_team:sports_teams!away_team_id(name, short_name),
        competition:sports_competitions(name)
      `)
      .eq('brand_id', params.id)
      .eq('status', statusFilter)
      .order('kickoff_at', { ascending: statusFilter === 'scheduled' || statusFilter === 'live' }),
      db.from('sports_competitions')
      .select('id, name')
      .eq('brand_id', params.id)
      .order('name'),
  ]);

  if (!brandData) redirect('/brands');

  const fixtures = (fixturesData ?? []) as FixtureRow[];
  const competitions = (competitionsData ?? []) as { id: string; name: string }[];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Fixtures</h1>
        <p className="text-sm text-slate-500 mt-0.5">{brandData.name}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-700 pb-2">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={`/brands/${params.id}/sports/fixtures?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${
              statusFilter === s
                ? 'bg-slate-700 text-slate-100 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {fixtures.length === 0 ? (
        <p className="text-sm text-slate-500">No {statusFilter} fixtures.</p>
      ) : (
        <div className="space-y-2">
          {fixtures.map((f) => {
            const homeTeam = f.home_team?.short_name ?? f.home_team?.name ?? '—';
            const awayTeam = f.away_team?.short_name ?? f.away_team?.name ?? '—';
            const isScored = f.home_score != null && f.away_score != null;

            return (
              <Link
                key={f.id}
                href={`/brands/${params.id}/sports/fixtures/${f.id}`}
                className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[f.status as SportsFixtureStatus]}`}>
                        {f.status}
                      </span>
                      {f.competition && (
                        <span className="text-xs text-slate-500 truncate">{f.competition.name}</span>
                      )}
                      {f.round_name && (
                        <span className="text-xs text-slate-600">{f.round_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-100 w-24 text-right truncate">{homeTeam}</span>
                      {isScored ? (
                        <span className="text-sm font-bold text-slate-100 tabular-nums">
                          {f.home_score} – {f.away_score}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">vs</span>
                      )}
                      <span className="text-sm font-semibold text-slate-100 w-24 truncate">{awayTeam}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {f.kickoff_at && (
                      <p className="text-xs text-slate-500">
                        {new Date(f.kickoff_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                    {f.venue_name && (
                      <p className="text-xs text-slate-700 mt-0.5">{f.venue_name}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
