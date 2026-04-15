"use client";

import { useState } from "react";
import Link from "next/link";
import type { Brand, TrainingDataItem, ContentType, Sentiment } from "@/lib/training-data-db";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "post", label: "Sample post" },
  { value: "caption", label: "Sample caption" },
  { value: "poster", label: "Reference poster (URL)" },
  { value: "competitor", label: "Competitor content" },
  { value: "inspiration", label: "Inspiration reference" },
];

const PLATFORMS = ["", "twitter", "linkedin", "instagram", "tiktok", "telegram", "facebook"];

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "✓ Good example",
  negative: "✗ What to avoid",
};

export default function TrainingDataClient({
  brand,
  items: initial,
}: {
  brand: Brand;
  items: TrainingDataItem[];
}) {
  const [items, setItems] = useState<TrainingDataItem[]>(initial);
  const [filter, setFilter] = useState<{ content_type: string; sentiment: string }>({
    content_type: "",
    sentiment: "",
  });
  const [form, setForm] = useState<{
    content_type: ContentType;
    content: string;
    platform: string;
    tone: string;
    campaign: string;
    sentiment: Sentiment;
    source_url: string;
  }>({
    content_type: "post",
    content: "",
    platform: "",
    tone: "",
    campaign: "",
    sentiment: "positive",
    source_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = items.filter((item) => {
    if (filter.content_type && item.content_type !== filter.content_type) return false;
    if (filter.sentiment && item.sentiment !== filter.sentiment) return false;
    return true;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/brands/${brand.id}/training-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: form.content_type,
          content: form.content.trim(),
          platform: form.platform || null,
          tone: form.tone || null,
          campaign: form.campaign || null,
          sentiment: form.sentiment,
          source_url: form.source_url || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to add item");
      }
      const item = await res.json() as TrainingDataItem;
      setItems((prev) => [item, ...prev]);
      setForm((f) => ({ ...f, content: "", tone: "", campaign: "", source_url: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this training data item?")) return;
    try {
      const res = await fetch(`/api/training-data/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300 mb-1">
        <Link href="/admin/brands" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
          Brands
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50 font-medium">{brand.name}</span>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Training Data</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-8">
        Examples agents use when generating content for <strong>{brand.name}</strong>.
      </p>

      {/* Add form */}
      <form onSubmit={handleAdd} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 mb-8 bg-white dark:bg-zinc-900 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add example</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1">Content type</label>
            <select
              value={form.content_type}
              onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value as ContentType }))}
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
            >
              <option value="">Any platform</option>
              {PLATFORMS.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1">Content</label>
          <textarea
            rows={3}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Paste or type the content example…"
            className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1">Tone</label>
            <input
              type="text"
              value={form.tone}
              onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
              placeholder="e.g. energetic, warm"
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1">Campaign</label>
            <input
              type="text"
              value={form.campaign}
              onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))}
              placeholder="e.g. Summer 2026"
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-300 mb-1">Source URL</label>
            <input
              type="url"
              value={form.source_url}
              onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
              placeholder="https://…"
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-300">Mark as:</span>
            {(["positive", "negative"] as Sentiment[]).map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sentiment"
                  value={s}
                  checked={form.sentiment === s}
                  onChange={() => setForm((f) => ({ ...f, sentiment: s }))}
                  className="accent-zinc-900 dark:accent-zinc-50"
                />
                <span className="text-xs text-zinc-700 dark:text-zinc-300">{SENTIMENT_LABELS[s]}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving || !form.content.trim()}
            className="text-sm rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Add example"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-zinc-500 dark:text-zinc-300">Filter:</span>
        <select
          value={filter.content_type}
          onChange={(e) => setFilter((f) => ({ ...f, content_type: e.target.value }))}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none"
        >
          <option value="">All types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={filter.sentiment}
          onChange={(e) => setFilter((f) => ({ ...f, sentiment: e.target.value }))}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none"
        >
          <option value="">All examples</option>
          <option value="positive">Good examples</option>
          <option value="negative">What to avoid</option>
        </select>
        <span className="text-xs text-zinc-600 dark:text-zinc-500 ml-auto">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-500">No items yet. Add one above.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className={`border rounded-lg p-4 bg-white dark:bg-zinc-900 ${
                item.sentiment === "negative"
                  ? "border-red-200 dark:border-red-900"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {CONTENT_TYPES.find((t) => t.value === item.content_type)?.label ?? item.content_type}
                    </span>
                    {item.platform && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {item.platform}
                      </span>
                    )}
                    {item.tone && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {item.tone}
                      </span>
                    )}
                    {item.campaign && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {item.campaign}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ml-auto ${
                        item.sentiment === "negative" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {SENTIMENT_LABELS[item.sentiment]}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                    {item.content}
                  </p>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 mt-1 inline-block truncate max-w-xs transition-colors"
                    >
                      {item.source_url}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
