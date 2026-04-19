"use client";

import { useState } from "react";
import type { BrandCredentialMeta } from "@/lib/brand-db";

const PLATFORMS = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "tiktok",
  "telegram",
];

type Props = {
  brandId: string;
  initialCredentials: BrandCredentialMeta[];
};

export default function CredentialsSection({ brandId, initialCredentials }: Props) {
  const [credentials, setCredentials] = useState<BrandCredentialMeta[]>(initialCredentials);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function getMeta(platform: string): BrandCredentialMeta | undefined {
    return credentials.find((c) => c.platform === platform);
  }

  async function handleSave(platform: string) {
    const value = values[platform]?.trim();
    if (!value) {
      setErrors((e) => ({ ...e, [platform]: "Value required" }));
      return;
    }
    setSaving(platform);
    setErrors((e) => ({ ...e, [platform]: "" }));
    try {
      const res = await fetch(`/api/brands/${brandId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, value }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      const updated = await res.json() as BrandCredentialMeta;
      setCredentials((prev) => {
        const existing = prev.find((c) => c.platform === platform);
        if (existing) return prev.map((c) => (c.platform === platform ? updated : c));
        return [...prev, updated];
      });
      setValues((v) => ({ ...v, [platform]: "" }));
    } catch (e: unknown) {
      setErrors((err) => ({ ...err, [platform]: (e as Error).message }));
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(platform: string) {
    if (!confirm(`Remove ${platform} credentials?`)) return;
    setDeleting(platform);
    try {
      const res = await fetch(`/api/brands/${brandId}/credentials/${platform}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      setCredentials((prev) => prev.filter((c) => c.platform !== platform));
    } catch (e: unknown) {
      setErrors((err) => ({ ...err, [platform]: (e as Error).message }));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-3">
      {PLATFORMS.map((platform) => {
        const meta = getMeta(platform);
        const isSaving = saving === platform;
        const isDeleting = deleting === platform;
        return (
          <div
            key={platform}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-100 capitalize w-24">{platform}</span>
                {meta ? (
                  <span className="text-xs text-green-400 font-semibold">Saved</span>
                ) : (
                  <span className="text-xs text-zinc-600">Not set</span>
                )}
              </div>
              {meta && (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">
                    Updated {new Date(meta.last_updated_at).toLocaleString()}
                    {meta.last_used_at
                      ? ` · Used ${new Date(meta.last_used_at).toLocaleString()}`
                      : ""}
                  </span>
                  <button
                    onClick={() => handleDelete(platform)}
                    disabled={isDeleting}
                    className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? "Removing…" : "Remove"}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={meta ? "••••••••  (enter new value to update)" : "Paste token or API key"}
                value={values[platform] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [platform]: e.target.value }))}
                autoComplete="off"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder:text-zinc-600"
              />
              <button
                onClick={() => handleSave(platform)}
                disabled={isSaving || !values[platform]}
                className="bg-zinc-900 dark:bg-zinc-50 hover:opacity-90 disabled:opacity-40 text-white dark:text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 dark:border-transparent transition-opacity whitespace-nowrap"
              >
                {isSaving ? "Saving…" : meta ? "Update" : "Save"}
              </button>
            </div>
            {errors[platform] && (
              <p className="text-xs text-red-400 mt-1">{errors[platform]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
