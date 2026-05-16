'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { BookingStatus } from '../db/schema';

type AllowedTransitions = Partial<Record<BookingStatus, BookingStatus[]>>;

export const ALLOWED_TRANSITIONS: AllowedTransitions = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed', 'refunded'],
  // cancelled, refunded, disputed: terminal — no webapp transitions
};

export async function updateBookingStatus(
  brandId: string,
  bookingId: string,
  newStatus: BookingStatus,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: booking } = await db
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!booking) return;

  const current = booking.status as BookingStatus;
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(newStatus)) return;

  await db
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('brand_id', brandId);

  await db.from('booking_events').insert({
    booking_id: bookingId,
    event_type: newStatus,
    from_status: current,
    to_status: newStatus,
  });

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
  revalidatePath(`/brands/${brandId}/bookings`);
}

export async function updateBooking(
  brandId: string,
  bookingId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const scheduledStart = formData.get('scheduled_start') as string | null;
  const scheduledEnd   = formData.get('scheduled_end') as string | null;

  await db
    .from('bookings')
    .update({
      notes:           formData.get('notes') as string | null || null,
      scheduled_start: scheduledStart || null,
      scheduled_end:   scheduledEnd || null,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
}

export async function addBookingNote(
  brandId: string,
  bookingId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const noteText = (formData.get('event_text') as string | null)?.trim();
  if (!noteText) return;

  const db = createSupabaseServiceClient();

  await db.from('booking_events').insert({
    booking_id: bookingId,
    event_type: 'note',
    event_text: noteText,
  });

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
}

export async function createBooking(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db   = createSupabaseServiceClient();
  const now  = new Date().toISOString();
  const id   = randomUUID();

  const customerRecordId = (formData.get('customer_record_id') as string | null)?.trim() || null;
  const bookingRef       = (formData.get('booking_reference') as string | null)?.trim() || null;
  const scheduledStart   = (formData.get('scheduled_start') as string | null) || null;
  const scheduledEnd     = (formData.get('scheduled_end') as string | null) || null;
  const notes            = (formData.get('notes') as string | null)?.trim() || null;
  const bookingType      = (formData.get('booking_type') as string | null)?.trim() || null;
  const source           = (formData.get('source') as string | null)?.trim() || null;

  const { data, error } = await db
    .from('bookings')
    .insert({
      id,
      brand_id:           brandId,
      customer_record_id: customerRecordId || null,
      booking_reference:  bookingRef || `BK-${id.slice(0, 8).toUpperCase()}`,
      status:             'pending',
      scheduled_start:    scheduledStart || null,
      scheduled_end:      scheduledEnd   || null,
      notes,
      metadata: {
        ...(bookingType ? { booking_type: bookingType } : {}),
        ...(source      ? { source }                   : {}),
      },
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await db.from('booking_events').insert({
    booking_id: data.id,
    event_type: 'created',
    to_status:  'pending',
  });

  revalidatePath(`/brands/${brandId}/bookings`);
  redirect(`/brands/${brandId}/bookings/${data.id}`);
}

export async function addBookingLineItem(
  brandId: string,
  bookingId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const itemName = (formData.get('item_name') as string | null)?.trim();
  if (!itemName) return;

  const qty        = parseFloat((formData.get('quantity')   as string) || '1') || 1;
  const unitPrice  = parseFloat((formData.get('unit_price') as string) || '')  || null;
  const totalPrice = unitPrice != null ? +(unitPrice * qty).toFixed(2) : null;

  const db = createSupabaseServiceClient();
  await db.from('booking_line_items').insert({
    booking_id: bookingId,
    item_type:  (formData.get('item_type')   as string | null) || 'service',
    item_name:  itemName,
    quantity:   qty,
    unit_price: unitPrice,
    total_price: totalPrice,
    notes:      (formData.get('item_notes')  as string | null)?.trim() || null,
    metadata:   {},
  });

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
}

export async function updateBookingLineItem(
  brandId: string,
  bookingId: string,
  itemId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const itemName = (formData.get('item_name') as string | null)?.trim();
  if (!itemName) return;

  const qty        = parseFloat((formData.get('quantity')   as string) || '1') || 1;
  const unitPrice  = parseFloat((formData.get('unit_price') as string) || '')  || null;
  const totalPrice = unitPrice != null ? +(unitPrice * qty).toFixed(2) : null;

  const db = createSupabaseServiceClient();

  const { data: booking } = await db
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('brand_id', brandId)
    .maybeSingle();
  if (!booking) return;

  await db
    .from('booking_line_items')
    .update({
      item_type:   (formData.get('item_type')  as string | null) || 'service',
      item_name:   itemName,
      quantity:    qty,
      unit_price:  unitPrice,
      total_price: totalPrice,
      notes:       (formData.get('item_notes') as string | null)?.trim() || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('booking_id', bookingId);

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
}

export async function deleteBookingLineItem(
  brandId: string,
  bookingId: string,
  itemId: string,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: booking } = await db
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('brand_id', brandId)
    .maybeSingle();
  if (!booking) return;

  await db
    .from('booking_line_items')
    .delete()
    .eq('id', itemId)
    .eq('booking_id', bookingId);

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
}

export async function addBookingEvent(
  brandId: string,
  bookingId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const eventText = (formData.get('event_text') as string | null)?.trim();
  if (!eventText) return;

  const eventType  = (formData.get('event_type')   as string | null)?.trim() || 'note';
  const occurredAt = (formData.get('occurred_at')  as string | null) || null;

  const db = createSupabaseServiceClient();
  await db.from('booking_events').insert({
    booking_id: bookingId,
    event_type: eventType,
    event_text: eventText,
    metadata:   occurredAt ? { occurred_at: occurredAt } : {},
  });

  revalidatePath(`/brands/${brandId}/bookings/${bookingId}`);
}
