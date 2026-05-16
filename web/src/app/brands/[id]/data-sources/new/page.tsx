import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { createDataSource } from '../../../../../lib/data-source-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function NewDataSourcePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: credentialsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('credentials').select('id, name, service').order('name'),
  ]);

  if (!brandData) redirect('/brands');

  const credentials = (credentialsData ?? []) as { id: string; name: string; service: string }[];
  const action = createDataSource.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href={`/brands/${params.id}/data-sources`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Data Sources
      </Link>

      <h1 className="text-xl font-bold text-slate-100 mb-6">New data source</h1>

      <form action={action} className="space-y-5">

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Football API — Premier League"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Source type <span className="text-red-400">*</span>
          </label>
          <input
            name="source_type"
            type="text"
            required
            placeholder="e.g. sports_fixtures"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Provider <span className="text-red-400">*</span>
          </label>
          <input
            name="provider"
            type="text"
            required
            placeholder="e.g. api-football"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Source purpose</label>
          <input
            name="source_purpose"
            type="text"
            placeholder="e.g. fixture_sync"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Base URL</label>
          <input
            name="base_url"
            type="url"
            placeholder="https://api.example.com/v3"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {credentials.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Credential</label>
            <select
              name="credential_id"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— none —</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.service})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Create source
          </button>
          <Link
            href={`/brands/${params.id}/data-sources`}
            className="text-sm text-slate-500 hover:text-slate-300 px-5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
