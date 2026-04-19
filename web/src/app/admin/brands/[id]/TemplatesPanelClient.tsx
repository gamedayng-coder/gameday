"use client";

import { useState } from "react";
import type { BrandTemplate, TemplateKind } from "@/lib/brand-db";

type Props = {
  brandId: string;
  initialTemplates: BrandTemplate[];
};

export default function TemplatesPanelClient({ brandId, initialTemplates }: Props) {
  const [templates, setTemplates] = useState<BrandTemplate[]>(initialTemplates);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{
    kind: TemplateKind;
    name: string;
    content: string;
    poster_type: string;
    platform: string;
  }>({ kind: "caption", name: "", content: "", poster_type: "", platform: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!form.name.trim() || !form.content.trim()) {
      setError("Name and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/brands/${brandId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          name: form.name,
          content: form.content,
          poster_type: form.poster_type || null,
          platform: form.platform || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Create failed");
      }
      const created = await res.json() as BrandTemplate;
      setTemplates((t) => [...t, created]);
      setForm({ kind: "caption", name: "", content: "", poster_type: "", platform: "" });
      setCreating(false);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((t) => t.filter((tmpl) => tmpl.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(tmpl: BrandTemplate) {
    const res = await fetch(`/api/templates/${tmpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !tmpl.is_active }),
    });
    if (res.ok) {
      const updated = await res.json() as BrandTemplate;
      setTemplates((t) => t.map((x) => (x.id === updated.id ? updated : x)));
    }
  }

  const posters = templates.filter((t) => t.kind === "poster");
  const captions = templates.filter((t) => t.kind === "caption");

  return (
    <div className="space-y-6">
      {/* Poster templates */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Poster templates</h3>
        {posters.length === 0 ? (
          <p className="text-xs text-zinc-600">No poster templates yet.</p>
        ) : (
          <div className="space-y-2">
            {posters.map((t) => (
              <TemplateRow key={t.id} template={t} onDelete={handleDelete} onToggle={toggleActive} deletingId={deletingId} />
            ))}
          </div>
        )}
      </div>

      {/* Caption templates */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Caption templates</h3>
        {captions.length === 0 ? (
          <p className="text-xs text-zinc-600">No caption templates yet.</p>
        ) : (
          <div className="space-y-2">
            {captions.map((t) => (
              <TemplateRow key={t.id} template={t} onDelete={handleDelete} onToggle={toggleActive} deletingId={deletingId} />
            ))}
          </div>
        )}
      </div>

      {/* Create form */}
      {creating ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">New template</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Kind</label>
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as TemplateKind }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              >
                <option value="caption">Caption</option>
                <option value="poster">Poster</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Template name"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              />
            </div>
            {form.kind === "poster" && (
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Poster type</label>
                <input
                  type="text"
                  value={form.poster_type}
                  onChange={(e) => setForm((f) => ({ ...f, poster_type: e.target.value }))}
                  placeholder="match-day, result, custom…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
            )}
            {form.kind === "caption" && (
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Platform</label>
                <input
                  type="text"
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                  placeholder="twitter, instagram…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder={form.kind === "poster" ? "HTML/CSS template…" : "Caption template with {placeholders}…"}
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setCreating(false); setError(""); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-xs font-semibold px-4 py-1.5 rounded-lg border border-zinc-700 dark:border-transparent hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Creating…" : "Create template"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          + Add template
        </button>
      )}
    </div>
  );
}

function TemplateRow({
  template,
  onDelete,
  onToggle,
  deletingId,
}: {
  template: BrandTemplate;
  onDelete: (id: string) => void;
  onToggle: (t: BrandTemplate) => void;
  deletingId: string | null;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">{template.name}</span>
          {template.is_active && (
            <span className="text-xs text-green-400 font-semibold">Active</span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {template.kind}
          {template.poster_type ? ` · ${template.poster_type}` : ""}
          {template.platform ? ` · ${template.platform}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onToggle(template)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {template.is_active ? "Deactivate" : "Set active"}
        </button>
        <button
          onClick={() => onDelete(template.id)}
          disabled={deletingId === template.id}
          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
        >
          {deletingId === template.id ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
