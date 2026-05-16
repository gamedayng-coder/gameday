import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { createCustomerRecord } from '../../../../../lib/customer-record-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function NewCustomerPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: brandData } = await db
    .from('brands').select('id, name').eq('id', params.id).maybeSingle();
  if (!brandData) redirect('/brands');

  const action = createCustomerRecord.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-xl">
      <h1 className="text-xl font-bold text-slate-100 mb-6">New Customer</h1>
      <form action={action} className="space-y-4">
        <Field label="Full name" name="full_name" />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />
        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          Create customer
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text' }: { label: string; name: string; type?: string }) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type={type}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
