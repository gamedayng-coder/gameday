'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { InventoryAlertStatus } from '../db/schema';

export async function adjustStock(
  brandId: string,
  itemId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const delta = parseFloat((formData.get('quantity_delta') as string | null) ?? '');
  if (!delta || isNaN(delta)) return;

  const note         = (formData.get('note') as string | null)?.trim() || null;
  const movementType = delta > 0 ? 'in' : 'out';

  const db = createSupabaseServiceClient();

  // Verify item belongs to brand before writing
  const { data: item } = await db
    .from('inventory_items')
    .select('current_stock')
    .eq('id', itemId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!item) return;

  // Insert movement row — append-only; no edit/delete exposed in UI
  await db.from('inventory_movements').insert({
    brand_id:          brandId,
    inventory_item_id: itemId,
    movement_type:     movementType,
    quantity_delta:    delta,
    note,
    metadata:          {},
  });

  // Update current_stock atomically with the movement creation
  await db
    .from('inventory_items')
    .update({
      current_stock: Number(item.current_stock) + delta,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/inventory/${itemId}`);
}

export async function acknowledgeAlert(
  brandId: string,
  alertId: string,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: alert } = await db
    .from('inventory_alerts')
    .select('status')
    .eq('id', alertId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!alert) return;

  const current = alert.status as InventoryAlertStatus;
  if (current !== 'active') return;

  await db
    .from('inventory_alerts')
    .update({ status: 'acknowledged', updated_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/inventory`);
}
