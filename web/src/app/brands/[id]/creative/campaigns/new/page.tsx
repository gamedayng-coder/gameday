import { redirect } from 'next/navigation';
import { getUser } from '../../../../../../lib/supabase/server';
import { createCampaign } from '../../../../../../lib/campaign-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function NewCampaignPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const action = createCampaign.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">New campaign</h1>
        <p className="text-sm text-slate-500 mt-0.5">Group creative work and assets under one campaign.</p>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="name">
            Campaign name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Summer Launch 2026"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="objective">Objective</label>
          <input
            id="objective"
            name="objective"
            type="text"
            placeholder="e.g. Drive product awareness"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Campaign overview…"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="start_date">Start date</label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="end_date">End date</label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <a
            href={`/brands/${params.id}/creative`}
            className="text-sm text-slate-400 hover:text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create campaign
          </button>
        </div>
      </form>
    </div>
  );
}
