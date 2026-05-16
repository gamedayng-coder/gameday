import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { BrandKnowledgeItem } from '../../../../../db/schema';
import {
  updateKnowledgeItem,
  deleteKnowledgeItem,
} from '../../../../../lib/brand-knowledge-actions';
import KnowledgeItemForm from '../KnowledgeItemForm';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; itemId: string } };

export default async function KnowledgeItemDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data } = await db
    .from('brand_knowledge_items')
    .select('*')
    .eq('id', params.itemId)
    .eq('brand_id', params.id)
    .maybeSingle();

  if (!data) notFound();

  const item = data as BrandKnowledgeItem;
  const updateAction = updateKnowledgeItem.bind(null, params.id, params.itemId);
  const deleteAction = deleteKnowledgeItem.bind(null, params.id, params.itemId);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`/brands/${params.id}/knowledge`}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Knowledge
        </Link>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{item.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Edit knowledge item</p>
        </div>
        <form action={deleteAction}>
          <button
            type="submit"
            className="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Delete
          </button>
        </form>
      </div>

      <KnowledgeItemForm item={item} submitAction={updateAction} submitLabel="Save changes" />
    </div>
  );
}
