import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { SportsFixture, SportsFixtureEvent, SportsFixtureStatus } from '../../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; fixtureId: string } };

const STATUS_COLOURS: Record<SportsFixtureStatus, string> = {
  scheduled: 'bg-slate-700 text-slate-400',
  live:      'bg-green-900/40 text-green-300',
  completed: 'bg-blue-900/40 text-blue-300',
  postponed: 'bg-yellow-900/40 text-yellow-300',
  cancelled: 'bg-slate-800 text-slate-600',
};

type FixtureDetail = SportsFixture & {
  home_team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null;
  away_team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null;
  competition: { id: string; name: string; country: string | null; season_label: string | null } | null;
};

type EventRow = SportsFixtureEvent & {
  team: { name: string; short_name: string | null } | null;
};

export default async function FixtureDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: fixtureData }, { data: eventsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('sports_fixtures')
      .select(`
        *,
        home_team:sports_teams!home_team_id(id, name, short_name, logo_url),
        away_team:sports_teams!away_team_id(id, name, short_name, logo_url),
        competition:sports_competitions(id, name, country, season_label)
      `)
      .eq('id', params.fixtureId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('sports_fixture_events')
      .select('*, team:sports_teams(name, short_name)')
      .eq('fixture_id', params.fixtureId)
      .eq('brand_id', params.id)
      .order('minute', { ascending: true, nullsFirst: false }),
  ]);

  if (!brandData) redirect('/brands');
  if (!fixtureData) redirect(`/brands/${params.id}/sports/fixtures`);

  const fixture = fixtureData as FixtureDetail;
  const events = (eventsData ?? []) as EventRow[];

  const homeName = fixture.home_team?.name ?? 'Home';
  const awayName = fixture.away_team?.name ?? 'Away';
  const isScored = fixture.home_score != null && fixture.away_score != null;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/sports/fixtures`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Fixtures
      </Link>

      {/* Match header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[fixture.status as SportsFixtureStatus]}`}>
            {fixture.status}
          </span>
          {fixture.competition && (
            <Link
              href={`/brands/${params.id}/sports/competitions/${fixture.competition.id}`}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {fixture.competition.name}
              {fixture.competition.season_label && ` · ${fixture.competition.season_label}`}
            </Link>
          )}
          {fixture.round_name && (
            <span className="text-xs text-slate-600">{fixture.round_name}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-slate-100">{homeName}</p>
            {fixture.home_team?.short_name && (
              <p className="text-xs text-slate-500">{fixture.home_team.short_name}</p>
            )}
          </div>

          <div className="text-center shrink-0">
            {isScored ? (
              <p className="text-3xl font-bold text-slate-100 tabular-nums">
                {fixture.home_score} – {fixture.away_score}
              </p>
            ) : (
              <p className="text-sm text-slate-600">vs</p>
            )}
            {fixture.kickoff_at && (
              <p className="text-xs text-slate-500 mt-1">
                {new Date(fixture.kickoff_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>

          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-slate-100">{awayName}</p>
            {fixture.away_team?.short_name && (
              <p className="text-xs text-slate-500">{fixture.away_team.short_name}</p>
            )}
          </div>
        </div>

        {(fixture.venue_name || fixture.result_summary) && (
          <div className="mt-4 pt-4 border-t border-slate-700 text-center space-y-0.5">
            {fixture.venue_name && (
              <p className="text-xs text-slate-500">{fixture.venue_name}</p>
            )}
            {fixture.result_summary && (
              <p className="text-xs text-slate-400">{fixture.result_summary}</p>
            )}
          </div>
        )}
      </div>

      {/* Events timeline */}
      {events.length > 0 && (
        <section className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-5 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Match events</h2>
          <div className="space-y-2">
            {events.map((e) => {
              const teamName = e.team?.short_name ?? e.team?.name;
              return (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="text-xs text-slate-600 tabular-nums w-8 shrink-0 pt-0.5">
                    {e.minute != null ? `${e.minute}'` : '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-300 capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                      {teamName && <span className="text-xs text-slate-600">{teamName}</span>}
                    </div>
                    {e.player_name && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {e.player_name}
                        {e.assist_player_name && <span className="text-slate-600"> · assist {e.assist_player_name}</span>}
                      </p>
                    )}
                    {e.description && (
                      <p className="text-xs text-slate-600 mt-0.5">{e.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Metadata */}
      <section className="text-xs text-slate-700 space-y-0.5">
        <p>ID: <span className="font-mono">{fixture.id}</span></p>
        {fixture.external_id && <p>External ID: <span className="font-mono">{fixture.external_id}</span></p>}
        <p>Updated: {new Date(fixture.updated_at).toLocaleString()}</p>
      </section>
    </div>
  );
}
