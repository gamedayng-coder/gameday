import { redirect } from 'next/navigation';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import { createSchedule } from '../../../../../../lib/publishing-schedule-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const CADENCE_TYPES = ['one_off', 'daily', 'weekly', 'monthly', 'custom'];
const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'telegram'];

export default async function NewSchedulePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: brandData } = await db
    .from('brands').select('id, name').eq('id', params.id).maybeSingle();
  if (!brandData) redirect('/brands');

  const action = createSchedule.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-xl">
      <h1 className="text-xl font-bold text-slate-100 mb-6">New Schedule</h1>

      <form action={action} className="space-y-4">
        <Field label="Name" name="name" required />

        <div>
          <label className="text-xs text-slate-400 block mb-1">Platform</label>
          <select
            name="platform"
            required
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
            required
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CADENCE_TYPES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Field label="Timezone" name="timezone" defaultValue="Europe/London" />
        <Field label="Recurrence rule" name="recurrence_rule" placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR" />

        <div className="pt-2">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create schedule
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type="text"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
      />
    </div>
  );
}
