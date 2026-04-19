"use client";

import { useState } from "react";
import type {
  BrandPublishingConfig,
  PlatformPublishingConfig,
  PostType,
  PublishFrequency,
} from "@/lib/brand-db";

const PLATFORMS = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "telegram"] as const;

const FREQUENCIES: { value: PublishFrequency; label: string }[] = [
  { value: "per_event", label: "Per event" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "manual", label: "Manual only" },
];

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: "poster", label: "Poster" },
  { value: "caption", label: "Caption" },
  { value: "thread", label: "Thread" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

function defaultPlatformConfig(): PlatformPublishingConfig {
  return {
    enabled: true,
    frequency: "per_event",
    post_types: ["poster", "caption"],
    timing_rules: "",
    auto_publish: false,
  };
}

type Props = {
  brandId: string;
  initialConfig: BrandPublishingConfig["config"] | null;
};

type PlatformMap = Partial<Record<string, PlatformPublishingConfig>>;

export default function PublishingSection({ brandId, initialConfig }: Props) {
  const [platforms, setPlatforms] = useState<PlatformMap>(
    initialConfig?.platforms ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function getPlatform(p: string): PlatformPublishingConfig {
    return platforms[p] ?? { ...defaultPlatformConfig(), enabled: false };
  }

  function updatePlatform(p: string, patch: Partial<PlatformPublishingConfig>) {
    setPlatforms((prev) => ({
      ...prev,
      [p]: { ...(prev[p] ?? defaultPlatformConfig()), ...patch },
    }));
    setSaved(false);
  }

  function toggleEnabled(p: string) {
    const current = getPlatform(p);
    if (!current.enabled) {
      updatePlatform(p, { ...defaultPlatformConfig(), enabled: true });
    } else {
      updatePlatform(p, { enabled: false });
    }
  }

  function togglePostType(p: string, type: PostType) {
    const current = getPlatform(p);
    const types = current.post_types.includes(type)
      ? current.post_types.filter((t) => t !== type)
      : [...current.post_types, type];
    updatePlatform(p, { post_types: types });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/brands/${brandId}/publishing-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { platforms } }),
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
      {PLATFORMS.map((p) => {
        const cfg = getPlatform(p);
        return (
          <div
            key={p}
            className={`border rounded-xl transition-colors ${
              cfg.enabled
                ? "border-zinc-700 bg-zinc-900"
                : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-3">
              <span className="font-semibold text-sm text-zinc-100 capitalize w-28">{p}</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-zinc-500">{cfg.enabled ? "Active" : "Disabled"}</span>
                <div
                  onClick={() => toggleEnabled(p)}
                  className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
                    cfg.enabled ? "bg-zinc-600" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      cfg.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>
            {cfg.enabled && (
              <div className="px-5 pb-4 space-y-4 border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-4">
                  <label className="text-xs text-zinc-400 w-28 shrink-0">Frequency</label>
                  <select
                    value={cfg.frequency}
                    onChange={(e) => updatePlatform(p, { frequency: e.target.value as PublishFrequency })}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  >
                    {FREQUENCIES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-start gap-4">
                  <label className="text-xs text-zinc-400 w-28 shrink-0 pt-0.5">Post types</label>
                  <div className="flex flex-wrap gap-2">
                    {POST_TYPES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => togglePostType(p, value)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          cfg.post_types.includes(value)
                            ? "border-zinc-500 bg-zinc-800 text-zinc-200"
                            : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <label className="text-xs text-zinc-400 w-28 shrink-0 pt-1.5">Timing rules</label>
                  <input
                    type="text"
                    value={cfg.timing_rules}
                    onChange={(e) => updatePlatform(p, { timing_rules: e.target.value })}
                    placeholder="e.g. Game day posters 2h before kick-off"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder:text-zinc-600"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-xs text-zinc-400 w-28 shrink-0">Auto-publish</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => updatePlatform(p, { auto_publish: !cfg.auto_publish })}
                      className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
                        cfg.auto_publish ? "bg-zinc-600" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          cfg.auto_publish ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {cfg.auto_publish ? "Publish automatically" : "Manual approval required"}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-500">Saved</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium px-5 py-2 border border-zinc-700 dark:border-transparent hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving…" : "Save config"}
        </button>
      </div>
    </div>
  );
}
