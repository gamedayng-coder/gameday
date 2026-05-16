import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { createEnquiry } from '../../../../../lib/enquiry-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const CHANNELS = ['email', 'phone', 'social_dm', 'social_comment', 'web_form', 'manual'];

export default async function NewEnquiryPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: brandData } = await db
    .from('brands').select('id, name').eq('id', params.id).maybeSingle();
  if (!brandData) redirect('/brands');

  const action = createEnquiry.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-xl">
      <h1 className="text-xl font-bold text-slate-100 mb-6">New Enquiry</h1>
      <form action={action} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Channel</label>
          <select
            name="channel"
            required
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Field label="Subject" name="subject" />
        <div>
          <label className="text-xs text-slate-400 block mb-1">Message body</label>
          <textarea
            name="message_body"
            rows={4}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Field label="Enquiry type (optional)" name="enquiry_type" />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          Create enquiry
        </button>
      </form>
    </div>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type="text"
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
