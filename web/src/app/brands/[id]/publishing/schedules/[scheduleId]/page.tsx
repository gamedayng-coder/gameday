import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { PublishingSchedule } from '../../../../../../db/schema';
import { updateSchedule, deleteSchedule } from '../../../../../../lib/publishing-schedule-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; scheduleId: string } };

const CADENCE_TYPES = ['one_off', 'daily', 'weekly', 'monthly', 'custom'];
const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'telegram'];

export default async function ScheduleDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data } = await db
    .from('publishing_schedules')
    .select('*')
    .eq('id', params.scheduleId)
    .eq('brand_id', params.id)
    .maybeSingle();

  if (!data) redirect(`/brands/${params.id}/publishing/schedules`);

  const schedule = data as PublishingSchedule;
  const update = updateSchedule.bind(null, params.id, params.scheduleId);
  const del = deleteSchedule.bind(null, params.id, params.scheduleId);

  return (
    <div className="px-8 py-8 max-w-xl">
      <Link
        href={`/brands/${params.id}/publishing/schedules`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Schedules
      </Link>
      <h1 className="text-xl font-bold text-slate-100 mb-6">{schedule.name}</h1>

      <form action={update} className="space-y-4 mb-8">
        <Field label="Name" name="name" defaultValue={schedule.name} required />

        <div>
          <label className="text-xs text-slate-400 block mb-1">Platform</label>
          <select
            name="platform"
            defaultValue={schedule.platform}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Cadence</label>
          <select
            name="cadence_type"
            defaultValue={schedule.cadence_type}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CADENCE_TYPES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Field label="Timezone" name="timezone" defaultValue={schedule.timezone} />
        <Field label="Recurrence rule" name="recurrence_rule" defaultValue={schedule.recurrence_rule ?? ''} />

        <div>
          <label className="text-xs text-slate-400 block mb-1">Status</label>
          <select
            name="is_active"
            defaultValue={schedule.is_active ? 'true' : 'false'}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Save changes
          </button>
        </div>
      </form>

      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-red-400 mb-3">Danger zone</h2>
        <form action={del}>
          <button
            type="submit"
            className="border border-red-700 text-red-400 hover:bg-red-900/30 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Delete schedule
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type="text"
        required={required}
        defaultValue={defaultValue}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
