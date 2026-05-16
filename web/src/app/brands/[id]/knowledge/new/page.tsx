import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createKnowledgeItem } from '../../../../../lib/brand-knowledge-actions';
import KnowledgeItemForm from '../KnowledgeItemForm';

type Props = { params: { id: string } };

export default async function NewKnowledgeItemPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const createAction = createKnowledgeItem.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Add knowledge item</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Add a free-form knowledge entry for this brand.
        </p>
      </div>
      <KnowledgeItemForm submitAction={createAction} submitLabel="Save item" />
    </div>
  );
}
