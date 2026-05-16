import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { SportsStanding } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = {
  params: { id: string };
  searchParams: { competition_id?: string };
};

type StandingRow = SportsStanding & {
  team: { name: string; short_name: string | null } | null;
};

export default async function StandingsPage({ params, searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: competitionsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('sports_competitions')
      .select('id, name, season_label')
      .eq('brand_id', params.id)
      .order('name'),
  ]);

  if (!brandData) redirect('/brands');

  const competitions = (competitionsData ?? []) as { id: string; name: string; season_label: string | null }[];

  const selectedId = searchParams.competition_id ?? competitions[0]?.id ?? null;

  const { data: standingsData } = selectedId
    ? await db
        .from('sports_standings')
        .select('*, team:sports_teams(name, short_name)')
        .eq('brand_id', params.id)
        .eq('competition_id', selectedId)
        .order('position', { ascending: true, nullsFirst: false })
    : { data: [] };

  const standings = (standingsData ?? []) as StandingRow[];
  const selectedComp = competitions.find((c) => c.id === selectedId);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Standings</h1>
        <p className="text-sm text-slate-500 mt-0.5">{brandData.name}</p>
      </div>

      {competitions.length === 0 ? (
        <p className="text-sm text-slate-500">No competitions available.</p>
      ) : (
        <>
          {/* Competition picker */}
          <div className="flex gap-1 flex-wrap mb-6 border-b border-slate-700 pb-2">
            {competitions.map((c) => (
              <Link
                key={c.id}
                href={`/brands/${params.id}/sports/standings?competition_id=${c.id}`}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  selectedId === c.id
                    ? 'bg-slate-700 text-slate-100 font-medium'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {c.name}
                {c.season_label && <span className="ml-1 text-slate-600">{c.season_label}</span>}
              </Link>
            ))}
          </div>

          {selectedComp && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300">
                {selectedComp.name}
                {selectedComp.season_label && <span className="text-slate-500 font-normal ml-2">{selectedComp.season_label}</span>}
              </h2>
              <Link
                href={`/brands/${params.id}/sports/competitions/${selectedId}`}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Competition detail →
              </Link>
            </div>
          )}

          {standings.length === 0 ? (
            <p className="text-sm text-slate-500">No standings data for this competition.</p>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-500">
                    <th className="px-4 py-2 text-left w-8">#</th>
                    <th className="px-4 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-right">P</th>
                    <th className="px-3 py-2 text-right">W</th>
                    <th className="px-3 py-2 text-right">D</th>
                    <th className="px-3 py-2 text-right">L</th>
                    <th className="px-3 py-2 text-right">GF</th>
                    <th className="px-3 py-2 text-right">GA</th>
                    <th className="px-3 py-2 text-right">GD</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-300">Pts</th>
                    <th className="px-4 py-2 text-right">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-700/50 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-800/50'}`}
                    >
                      <td className="px-4 py-2.5 text-slate-500 tabular-nums">{s.position ?? i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-200">
                        {s.team?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{s.played ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{s.won ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{s.drawn ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{s.lost ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{s.goals_for ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{s.goals_against ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">
                        {s.goal_difference != null
                          ? (s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference)
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-100 tabular-nums">{s.points ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400 tracking-wider">
                        {s.form ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
