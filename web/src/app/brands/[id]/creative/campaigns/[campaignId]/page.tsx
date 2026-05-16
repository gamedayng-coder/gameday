import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import { updateCampaign, deleteCampaign } from '../../../../../../lib/campaign-actions';
import type { Campaign, CreativeAsset } from '../../../../../../db/schema';

export const dynamic = 'force-dynamic';

const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const;

const ASSET_STATUS_STYLES: Record<string, string> = {
  draft:            'bg-slate-600 text-slate-200',
  ready_for_review: 'bg-yellow-900 text-yellow-300',
  approved:         'bg-green-900 text-green-300',
  rejected:         'bg-red-900 text-red-300',
  published:        'bg-emerald-900 text-emerald-300',
  archived:         'bg-slate-700 text-slate-500',
};

type Props = { params: { id: string; campaignId: string } };

export default async function CampaignDetailPage({ params }: Props) {
  const { id: brandId, campaignId } = params;

  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: campaignData }, { data: assetsData }] = await Promise.all([
    db.from('campaigns').select('*').eq('id', campaignId).eq('brand_id', brandId).maybeSingle(),
    db.from('creative_assets').select('*').eq('campaign_id', campaignId).order('updated_at', { ascending: false }),
  ]);

  if (!campaignData) notFound();

  const campaign = campaignData as Campaign;
  const assets = (assetsData ?? []) as CreativeAsset[];

  const updateAction = updateCampaign.bind(null, brandId, campaignId);
  const deleteAction = deleteCampaign.bind(null, brandId, campaignId);

  return (
    <div className="px-8 py-8 max-w-3xl space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">
            <a href={`/brands/${brandId}/creative`} className="hover:text-slate-300 transition-colors">← Campaigns</a>
          </p>
          <h1 className="text-xl font-bold text-slate-100">{campaign.name}</h1>
          {campaign.objective && <p className="text-sm text-slate-400 mt-1">{campaign.objective}</p>}
        </div>
        <form action={deleteAction}>
          <button
            type="submit"
            className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
          >
            Delete
          </button>
        </form>
      </div>

      {/* Edit form */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</h2>
        <form action={updateAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={campaign.name}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                defaultValue={campaign.status}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="objective">Objective</label>
            <input
              id="objective"
              name="objective"
              type="text"
              defaultValue={campaign.objective ?? ''}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={campaign.description ?? ''}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="start_date">Start date</label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={campaign.start_date ?? ''}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="end_date">End date</label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={campaign.end_date ?? ''}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>

      {/* Assets linked to this campaign */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Assets ({assets.length})
          </h2>
          <Link
            href={`/brands/${brandId}/creative/assets`}
            className="text-xs text-indigo-400 hover:underline"
          >
            View all assets
          </Link>
        </div>

        {assets.length === 0 ? (
          <p className="text-sm text-slate-500">No assets linked to this campaign yet.</p>
        ) : (
          <ul className="space-y-2">
            {assets.map((a) => (
              <li key={a.id} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${ASSET_STATUS_STYLES[a.status] ?? 'bg-slate-600 text-slate-200'}`}>
                  {a.status.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.asset_type}{a.mime_type ? ` · ${a.mime_type}` : ''}</p>
                </div>
                {(a.file_url || a.file_path) && (
                  <span className="text-xs text-slate-600 shrink-0">has file</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Soft-linked content items note */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Content items mentioning this campaign</h2>
        <p className="text-xs text-slate-500">
          Content items are linked to campaigns by name match only (no foreign key).
          Search for <span className="font-mono text-slate-400">{campaign.name}</span> in the{' '}
          <Link href={`/brands/${brandId}/content`} className="text-indigo-400 hover:underline">content list</Link>.
        </p>
      </section>
    </div>
  );
}
