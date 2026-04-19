"use client";

import { useState } from "react";
import type { Brand } from "@/lib/brand-db";

type Props = { brand: Brand };

const BRIEF_FIELDS: { key: keyof Brand; label: string; placeholder: string }[] = [
  { key: "core_values", label: "Core values", placeholder: "What the brand stands for" },
  { key: "content_themes", label: "Content themes", placeholder: "Recurring topics and categories" },
  { key: "objectives", label: "Objectives", placeholder: "What the brand wants to achieve with content" },
  { key: "dislikes", label: "Dislikes", placeholder: "Topics, tones, or formats to avoid" },
  { key: "tone_of_voice", label: "Tone of voice", placeholder: "e.g. Energetic and direct, with wit" },
  { key: "competitors", label: "Competitors", placeholder: "Brands to monitor or differentiate from" },
  { key: "products_services", label: "Products & services", placeholder: "What to promote or reference" },
  { key: "target_audience", label: "Target audience", placeholder: "Who the content is for" },
];

export default function BrandDetailClient({ brand }: Props) {
  const [form, setForm] = useState<Partial<Brand>>({
    name: brand.name,
    core_values: brand.core_values ?? "",
    content_themes: brand.content_themes ?? "",
    objectives: brand.objectives ?? "",
    dislikes: brand.dislikes ?? "",
    tone_of_voice: brand.tone_of_voice ?? "",
    competitors: brand.competitors ?? "",
    products_services: brand.products_services ?? "",
    target_audience: brand.target_audience ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      setSaved(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-zinc-400 block mb-1">Brand name</label>
        <input
          type="text"
          value={form.name ?? ""}
          onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setSaved(false); }}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BRIEF_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-zinc-400 block mb-1">{label}</label>
            <textarea
              value={(form[key] as string) ?? ""}
              onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setSaved(false); }}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder:text-zinc-600 resize-none"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-500">Saved</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium px-5 py-2 border border-zinc-700 dark:border-transparent hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving…" : "Save brief"}
        </button>
      </div>
    </div>
  );
}
