import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export default async function SportsLayout({ children, params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { count } = await db
    .from('data_sources')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', params.id)
    .neq('status', 'archived')
    .ilike('source_type', '%sport%');

  if (!count) redirect(`/brands/${params.id}/profile`);

  return <>{children}</>;
}
