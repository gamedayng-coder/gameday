"use client";

import { useState } from "react";
import type { BrandVoice } from "@/lib/brand-db";

type Props = {
  brandId: string;
  initialVoice: BrandVoice | null;
};

const VOICE_FIELDS: { key: keyof BrandVoice; label: string; placeholder: string }[] = [
  { key: "tone", label: "Tone", placeholder: "e.g. Energetic and direct, confident but approachable" },
  { key: "style", label: "Style", placeholder: "Sentence length, vocabulary, emoji use, punctuation" },
  { key: "platform_guidelines", label: "Platform guidelines", placeholder: "How voice adapts per channel" },
  { key: "dos_and_donts", label: "Dos & don'ts", placeholder: "Specific phrases or patterns to use or avoid" },
  { key: "sample_copy", label: "Sample copy", placeholder: "2-3 example captions that embody the voice" },
  { key: "competitor_differentiation", label: "Competitor differentiation", placeholder: "How to sound distinct from key competitors" },
];

export default function VoiceFormClient({ brandId, initialVoice }: Props) {
  const [form, setForm] = useState<Partial<BrandVoice>>({
    tone: initialVoice?.tone ?? "",
    style: initialVoice?.style ?? "",
    platform_guidelines: initialVoice?.platform_guidelines ?? "",
    dos_and_donts: initialVoice?.dos_and_donts ?? "",
    sample_copy: initialVoice?.sample_copy ?? "",
    competitor_differentiation: initialVoice?.competitor_differentiation ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/brands/${brandId}/voice`, {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {VOICE_FIELDS.map(({ key, label, placeholder }) => (
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
          {saving ? "Saving…" : "Save voice"}
        </button>
      </div>
    </div>
  );
}
