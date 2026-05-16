import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { SportsCompetition, SportsFixture, SportsFixtureStatus } from '../../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; competitionId: string } };

const STATUS_COLOURS: Record<SportsFixtureStatus, string> = {
  scheduled: 'bg-slate-700 text-slate-400',
  live:      'bg-green-900/40 text-green-300',
  completed: 'bg-blue-900/40 text-blue-300',
  postponed: 'bg-yellow-900/40 text-yellow-300',
  cancelled: 'bg-slate-800 text-slate-600',
};

type FixtureRow = SportsFixture & {
  home_team: { name: string; short_name: string | null } | null;
  away_team: { name: string; short_name: string | null } | null;
};

type TeamRow = { id: string; name: string; short_name: string | null; logo_url: string | null };

export default async function CompetitionDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: competitionData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('sports_competitions')
      .select('*')
      .eq('id', params.competitionId)
      .eq('brand_id', params.id)
      .maybeSingle(),
  ]);

  if (!brandData) redirect('/brands');
  if (!competitionData) redirect(`/brands/${params.id}/sports/standings`);

  const competition = competitionData as SportsCompetition;

  // Fetch recent/upcoming fixtures and teams linked via fixtures for this competition
  const [{ data: fixturesData }, { data: teamsData }] = await Promise.all([
    db.from('sports_fixtures')
      .select(`
        *,
        home_team:sports_teams!home_team_id(name, short_name),
        away_team:sports_teams!away_team_id(name, short_name)
      `)
      .eq('brand_id', params.id)
      .eq('competition_id', params.competitionId)
      .order('kickoff_at', { ascending: false })
      .limit(20),
    db.from('sports_teams')
      .select('id, name, short_name, logo_url')
      .eq('brand_id', params.id)
      .order('name'),
  ]);

  const fixtures = (fixturesData ?? []) as FixtureRow[];
  const teams = (teamsData ?? []) as TeamRow[];

  // Partition fixtures by status ordering: live first, then scheduled, then completed/other
  const live      = fixtures.filter((f) => f.status === 'live');
  const scheduled = fixtures.filter((f) => f.status === 'scheduled');
  const other     = fixtures.filter((f) => f.status !== 'live' && f.status !== 'scheduled');

  const orderedFixtures = [...live, ...scheduled, ...other];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/sports/standings`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Standings
      </Link>

      {/* Competition header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">{competition.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          {competition.country && (
            <span className="text-sm text-slate-500">{competition.country}</span>
          )}
          {competition.season_label && (
            <span className="text-xs text-slate-600">· {competition.season_label}</span>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 mb-6">
        <Link
          href={`/brands/${params.id}/sports/standings?competition_id=${competition.id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          View standings →
        </Link>
        <Link
          href={`/brands/${params.id}/sports/fixtures?status=scheduled`}
          className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          All fixtures →
        </Link>
      </div>

      {/* Fixtures */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fixtures</h2>

        {orderedFixtures.length === 0 ? (
          <p className="text-sm text-slate-500">No fixtures.</p>
        ) : (
          <div className="space-y-2">
            {orderedFixtures.map((f) => {
              const homeName = f.home_team?.short_name ?? f.home_team?.name ?? '—';
              const awayName = f.away_team?.short_name ?? f.away_team?.name ?? '—';
              const isScored = f.home_score != null && f.away_score != null;

              return (
                <Link
                  key={f.id}
                  href={`/brands/${params.id}/sports/fixtures/${f.id}`}
                  className="flex items-center justify-between bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[f.status as SportsFixtureStatus]}`}>
                      {f.status}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-200">{homeName}</span>
                      {isScored ? (
                        <span className="font-bold text-slate-100 tabular-nums">{f.home_score}–{f.away_score}</span>
                      ) : (
                        <span className="text-slate-600">vs</span>
                      )}
                      <span className="font-medium text-slate-200">{awayName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {f.kickoff_at && (
                      <p className="text-xs text-slate-500">
                        {new Date(f.kickoff_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Teams */}
      {teams.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Teams <span className="text-slate-700 font-normal normal-case tracking-normal">({teams.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5"
              >
                <p className="text-sm font-medium text-slate-200">{t.name}</p>
                {t.short_name && (
                  <p className="text-xs text-slate-500">{t.short_name}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metadata */}
      <div className="mt-6 text-xs text-slate-700 space-y-0.5">
        <p>ID: <span className="font-mono">{competition.id}</span></p>
        {competition.external_id && <p>External ID: <span className="font-mono">{competition.external_id}</span></p>}
        <p>Updated: {new Date(competition.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );
}
