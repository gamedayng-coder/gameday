import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { Brand, BrandEvent } from '../../../../db/schema';
import EventsClient from './EventsClient';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function BrandEventsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: eventsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db
      .from('brand_events')
      .select('*')
      .eq('brand_id', params.id)
      .order('event_date', { ascending: false }),
  ]);

  if (!brandData) redirect('/brands');

  const brand = brandData as Pick<Brand, 'id' | 'name'>;
  const events: BrandEvent[] = (eventsData ?? []) as BrandEvent[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Events</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {brand.name} · brand moments that drive content
        </p>
      </div>

      <EventsClient brandId={params.id} initialEvents={events} />
    </div>
  );
}
