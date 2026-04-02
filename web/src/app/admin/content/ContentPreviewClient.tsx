"use client";

import { useState } from "react";
import type { ContentItem, ContentStatus } from "@/lib/content-db";
import type { Poster } from "@/lib/poster-db";
import type { ManualEvent } from "@/lib/manual-events-db";

// Per-platform constraints
const PLATFORMS = [
  { id: "twitter", label: "Twitter / X", limit: 280, hashtags: false, icon: "𝕏" },
  { id: "instagram", label: "Instagram", limit: 2200, hashtags: true, icon: "📸" },
  { id: "facebook", label: "Facebook", limit: 63206, hashtags: false, icon: "f" },
  { id: "tiktok", label: "TikTok", limit: 2200, hashtags: true, icon: "♪" },
  { id: "telegram", label: "Telegram", limit: 4096, hashtags: false, icon: "✈" },
  { id: "linkedin", label: "LinkedIn", limit: 3000, hashtags: false, icon: "in" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

function truncateForPlatform(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + "…";
}

function buildPlatformCaptions(base: string): Record<PlatformId, string> {
  const captions: Partial<Record<PlatformId, string>> = {};
  for (const p of PLATFORMS) {
    captions[p.id] = truncateForPlatform(base, p.limit);
  }
  return captions as Record<PlatformId, string>;
}

interface Props {
  items: ContentItem[];
  posters: Poster[];
  events: ManualEvent[];
}

export default function ContentPreviewClient({ items: initial, posters, events }: Props) {
  const [items, setItems] = useState<ContentItem[]>(initial);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformId>("twitter");
  const [editingCaption, setEditingCaption] = useState<string | null>(null); // platform being edited
  const [captions, setCaptions] = useState<Partial<Record<PlatformId, string>>>({});
  const [baseCaption, setBaseCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [newPosterId, setNewPosterId] = useState("");
  const [newEventId, setNewEventId] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function openItem(item: ContentItem) {
    setSelected(item);
    setBaseCaption(item.caption);
    const existing = (() => { try { return JSON.parse(item.platform_captions) as Record<PlatformId, string>; } catch { return {}; } })();
    // Fill any missing platforms from base caption
    const full = buildPlatformCaptions(item.caption);
    setCaptions({ ...full, ...existing });
    setEditingCaption(null);
    setActiveTab("twitter");
    setStatusMsg(null);
  }

  async function saveCaption(platform: PlatformId, value: string) {
    if (!selected) return;
    const updated = { ...captions, [platform]: value };
    setCaptions(updated);
    setEditingCaption(null);
    await fetch(`/api/content/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_captions: updated }),
    });
  }

  async function saveBaseCaption() {
    if (!selected) return;
    const newCaptions = buildPlatformCaptions(baseCaption);
    setCaptions(newCaptions);
    await fetch(`/api/content/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: baseCaption, platform_captions: newCaptions }),
    });
    setSelected((prev) => prev ? { ...prev, caption: baseCaption } : prev);
  }

  async function setStatus(status: ContentStatus) {
    if (!selected) return;
    setSaving(true);
    const payload: { status: ContentStatus; scheduled_at?: string } = { status };
    if (status === "scheduled" && scheduleAt) payload.scheduled_at = scheduleAt;
    const res = await fetch(`/api/content/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json() as ContentItem;
      setItems((prev) => prev.map((i) => (i.id === selected.id ? updated : i)));
      setSelected(updated);
      setStatusMsg(status === "approved" ? "Approved for publishing." : status === "scheduled" ? `Scheduled for ${scheduleAt}.` : "Discarded.");
    }
    setSaving(false);
  }

  async function createItem() {
    if (!newCaption.trim()) return;
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: newCaption,
        poster_id: newPosterId || null,
        event_id: newEventId || null,
        platform_captions: buildPlatformCaptions(newCaption),
      }),
    });
    if (res.ok) {
      const item = await res.json() as ContentItem;
      setItems((prev) => [item, ...prev]);
      setShowCreate(false);
      setNewCaption("");
      setNewPosterId("");
      setNewEventId("");
    }
  }

  const currentCaption = captions[activeTab] ?? selected?.caption ?? "";
  const platformMeta = PLATFORMS.find((p) => p.id === activeTab)!;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Content Preview</h1>
          <p className="text-sm text-zinc-500 mt-1">Review posters and captions before publishing.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 transition-opacity"
        >
          + New content
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 mb-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-800">New content item</h2>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Caption</label>
            <textarea
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              rows={3}
              placeholder="Write your base caption…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Link poster (optional)</label>
              <select
                value={newPosterId}
                onChange={(e) => setNewPosterId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">None</option>
                {posters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fixture_home_team && p.fixture_away_team
                      ? `${p.fixture_home_team} vs ${p.fixture_away_team}`
                      : p.type} — {p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Link event (optional)</label>
              <select
                value={newEventId}
                onChange={(e) => setNewEventId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">None</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createItem} className="rounded-full bg-zinc-900 text-white text-sm px-5 py-2 font-medium hover:opacity-90 transition-opacity">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="text-sm text-zinc-500 hover:text-zinc-900 px-2 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items list */}
        <div className="lg:col-span-1 space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-zinc-400 text-sm">
              No content items yet.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => openItem(item)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                  selected?.id === item.id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-zinc-700 line-clamp-2">{item.caption || <span className="text-zinc-400 italic">No caption</span>}</p>
                {item.event_title && <p className="text-xs text-zinc-400 mt-1">{item.event_title}</p>}
              </button>
            ))
          )}
        </div>

        {/* Preview pane */}
        {selected ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Poster preview */}
            {selected.poster_image_path ? (
              <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100">
                <img src={selected.poster_image_path} alt="Poster" className="w-full object-contain max-h-96" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 h-40 flex items-center justify-center text-zinc-400 text-sm">
                No poster attached
              </div>
            )}

            {/* Base caption + regenerate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600">Base caption</label>
                <span className="text-xs text-zinc-400">{baseCaption.length} chars</span>
              </div>
              <textarea
                value={baseCaption}
                onChange={(e) => setBaseCaption(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                onClick={saveBaseCaption}
                className="text-xs text-zinc-700 underline underline-offset-2 hover:text-zinc-900 transition-colors"
              >
                Apply to all platforms
              </button>
            </div>

            {/* Platform tabs */}
            <div>
              <div className="flex gap-1 flex-wrap mb-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveTab(p.id); setEditingCaption(null); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      activeTab === p.id
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "text-zinc-600 border-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>

              {/* Platform preview card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-800">{platformMeta.label}</p>
                  <span className={`text-xs ${currentCaption.length > platformMeta.limit * 0.9 ? "text-amber-600" : "text-zinc-400"}`}>
                    {currentCaption.length} / {platformMeta.limit}
                  </span>
                </div>

                {editingCaption === activeTab ? (
                  <div className="space-y-2">
                    <textarea
                      defaultValue={currentCaption}
                      id="caption-edit"
                      rows={5}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const el = document.getElementById("caption-edit") as HTMLTextAreaElement | null;
                          if (el) saveCaption(activeTab, el.value);
                        }}
                        className="text-xs text-zinc-700 underline underline-offset-2 hover:text-zinc-900 transition-colors"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingCaption(null)} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{currentCaption || <span className="text-zinc-400 italic">Empty</span>}</p>
                    <button
                      onClick={() => setEditingCaption(activeTab)}
                      className="absolute top-0 right-0 text-xs text-zinc-400 hover:text-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Status message */}
            {statusMsg && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                {statusMsg}
              </div>
            )}

            {/* Actions: Approve / Schedule / Discard */}
            {selected.status === "draft" && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setStatus("approved")}
                  disabled={saving}
                  className="rounded-full bg-emerald-600 text-white text-sm px-5 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Approve
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                  <button
                    onClick={() => { setScheduling(true); setStatus("scheduled"); }}
                    disabled={saving || !scheduleAt}
                    className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {scheduling ? "Scheduling…" : "Schedule"}
                  </button>
                </div>
                <button
                  onClick={() => setStatus("discarded")}
                  disabled={saving}
                  className="text-sm text-red-500 hover:text-red-700 underline underline-offset-2 disabled:opacity-40 transition-colors"
                >
                  Discard
                </button>
              </div>
            )}
            {selected.status !== "draft" && (
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                <StatusBadge status={selected.status} />
                {selected.scheduled_at && (
                  <span className="text-xs text-zinc-500">Scheduled: {new Date(selected.scheduled_at).toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 text-sm h-64">
            Select a content item to preview
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContentStatus | string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    approved: "bg-emerald-50 text-emerald-700",
    scheduled: "bg-blue-50 text-blue-700",
    published: "bg-violet-50 text-violet-700",
    discarded: "bg-red-50 text-red-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}
