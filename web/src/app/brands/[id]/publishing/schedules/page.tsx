import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { PublishingSchedule } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function SchedulesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: schedulesData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('publishing_schedules')
      .select('*')
      .eq('brand_id', params.id)
      .order('platform')
      .order('name'),
  ]);

  if (!brandData) redirect('/brands');

  const schedules = (schedulesData ?? []) as PublishingSchedule[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Publishing Schedules</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brandData.name} · schedule windows per platform
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/publishing/schedules/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          New schedule
        </Link>
      </div>

      {schedules.length === 0 ? (
        <p className="text-sm text-slate-500">No schedules configured.</p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <Link
              key={s.id}
              href={`/brands/${params.id}/publishing/schedules/${s.id}`}
              className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-100">{s.name}</span>
                    <span className="text-xs text-slate-500 capitalize">{s.platform}</span>
                    <span className="text-xs text-slate-500 capitalize">{s.cadence_type}</span>
                  </div>
                  <p className="text-xs text-slate-500">{s.timezone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
