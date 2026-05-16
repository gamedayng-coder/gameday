import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { BrandPolicy } from '../../../../db/schema';
import {
  createPolicy,
  updatePolicy,
  deletePolicy,
} from '../../../../lib/brand-policy-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const CATEGORIES = ['general', 'compliance', 'content', 'tone', 'legal', 'other'];

export default async function BrandPoliciesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: policiesData }] = await Promise.all([
    db.from('brands').select('id').eq('id', params.id).maybeSingle(),
    db.from('brand_policies')
      .select('*')
      .eq('brand_id', params.id)
      .order('category')
      .order('title'),
  ]);

  if (!brandData) notFound();

  const policies = (policiesData ?? []) as BrandPolicy[];

  const createAction = createPolicy.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Brand policies</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Operational guidelines, compliance rules, and content policies for this brand.
        </p>
      </div>

      {/* Policy list */}
      {policies.length === 0 ? (
        <p className="text-sm text-slate-500 mb-8">No policies yet. Add one below.</p>
      ) : (
        <div className="space-y-3 mb-8">
          {policies.map((policy) => {
            const updateAction = updatePolicy.bind(null, params.id, policy.id);
            const deleteAction = deletePolicy.bind(null, params.id, policy.id);
            return (
              <div
                key={policy.id}
                className={`bg-slate-800 border rounded-xl p-4 ${policy.is_active ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-100">{policy.title}</span>
                    <span className="ml-2 text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                      {policy.category}
                    </span>
                    {!policy.is_active && (
                      <span className="ml-2 text-xs text-slate-600">inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={updateAction}>
                      <input type="hidden" name="is_active" value={String(!policy.is_active)} />
                      <button
                        type="submit"
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {policy.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="text-xs text-red-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <p className="text-xs text-slate-400 whitespace-pre-wrap">{policy.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add policy form */}
      <div className="border border-slate-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Add policy</h2>
        <form action={createAction} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. No competitor mentions"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              defaultValue="general"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="body">Policy text</label>
            <textarea
              id="body"
              name="body"
              rows={4}
              required
              placeholder="Describe the policy, guideline, or rule…"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Add policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
