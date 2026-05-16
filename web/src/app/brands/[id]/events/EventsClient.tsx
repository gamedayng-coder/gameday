'use client';

import { useState } from 'react';
import { BrandEvent } from '../../../../db/schema';

const SUGGESTED_TYPES = [
  'Product launch', 'Campaign', 'Sale / promo', 'Conference', 'Partnership',
  'Press release', 'Award', 'Milestone', 'Content drop', 'Other',
];

interface Props {
  brandId: string;
  initialEvents: BrandEvent[];
}

export default function EventsClient({ brandId, initialEvents }: Props) {
  const [events, setEvents] = useState<BrandEvent[]>(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !eventDate) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/brands/${brandId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          event_type: eventType.trim() || 'general',
          event_date: eventDate,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to create event');
      }
      const created = await res.json() as BrandEvent;
      setEvents((prev) => [created, ...prev]);
      setName('');
      setEventType('');
      setEventDate('');
      setDescription('');
      setShowForm(false);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Delete this event?')) return;
    const res = await fetch(`/api/brands/${brandId}/events/${eventId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    }
  }

  function formatDate(iso: string) {
    // iso is YYYY-MM-DD from Postgres DATE type
    const [y, m, d] = iso.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-400">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setShowForm((v) => !v); setError(''); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add event'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-100">New event</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Event name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Sale Launch"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Date *</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Event type</label>
            <input
              type="text"
              list="event-type-suggestions"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. Product launch, Campaign, Sale…"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
            <datalist id="event-type-suggestions">
              {SUGGESTED_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about the event…"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-10 text-center">
          <p className="text-slate-400 text-sm">No events yet.</p>
          <p className="text-slate-500 text-xs mt-1">Add an event above to start tracking brand moments.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex items-start gap-4"
            >
              {/* Date badge */}
              <div className="shrink-0 text-center bg-slate-700 rounded-lg px-3 py-2 min-w-[56px]">
                <p className="text-xs text-slate-400 uppercase tracking-wide leading-none">
                  {formatDate(ev.event_date).split(' ')[0]}
                </p>
                <p className="text-lg font-bold text-white leading-tight">
                  {formatDate(ev.event_date).split(' ')[1]?.replace(',', '')}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(ev.event_date).split(' ')[2]}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-100 text-sm">{ev.name}</span>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full capitalize">
                    {ev.event_type}
                  </span>
                </div>
                {ev.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                )}
              </div>

              <button
                onClick={() => handleDelete(ev.id)}
                className="shrink-0 text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
