"use client";

import { useState } from "react";
import type { AuthType, DataSource } from "@/lib/data-sources-db";

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: "bearer", label: "Bearer token (Authorization: Bearer …)" },
  { value: "x-auth-token", label: "X-Auth-Token header" },
  { value: "api-key", label: "X-API-Key header" },
  { value: "basic", label: "HTTP Basic (base64)" },
];

interface Props {
  sources: DataSource[];
}

type FormState = {
  name: string;
  base_url: string;
  api_key: string;
  auth_type: AuthType;
};

const emptyForm: FormState = { name: "", base_url: "", api_key: "", auth_type: "bearer" };

export default function DataSourcesAdminClient({ sources: initial }: Props) {
  const [sources, setSources] = useState<DataSource[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; status?: number; preview?: string; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(ds: DataSource) {
    setEditingId(ds.id);
    setForm({ name: ds.name, base_url: ds.base_url, api_key: "", auth_type: ds.auth_type });
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function save() {
    if (!form.name || !form.base_url) { setError("Name and URL are required."); return; }
    if (!editingId && !form.api_key) { setError("API key is required."); return; }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const body: Partial<FormState> = { name: form.name, base_url: form.base_url, auth_type: form.auth_type };
        if (form.api_key) body.api_key = form.api_key;
        const res = await fetch(`/api/data-sources/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        const updated = await res.json() as DataSource;
        setSources((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      } else {
        const res = await fetch("/api/data-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        const created = await res.json() as DataSource;
        setSources((prev) => [...prev, created]);
      }
      setShowForm(false);
      setEditingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this data source?")) return;
    const res = await fetch(`/api/data-sources/${id}`, { method: "DELETE" });
    if (res.ok) setSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function testConnection(id: string) {
    setTestingId(id);
    setTestResult(null);
    const res = await fetch(`/api/data-sources/${id}/test`, { method: "POST" });
    const data = await res.json() as { ok: boolean; status?: number; preview?: string; error?: string };
    setTestResult({ id, ...data });
    setTestingId(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Data Sources</h1>
          <p className="text-sm text-zinc-500 mt-1">Connect external APIs for content ingestion. Each source is per-tenant.</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 transition-opacity"
        >
          + Add source
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-800">{editingId ? "Edit data source" : "New data source"}</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Fixtures Feed"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Auth type</label>
              <select
                value={form.auth_type}
                onChange={(e) => setForm((f) => ({ ...f, auth_type: e.target.value as AuthType }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-white"
              >
                {AUTH_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Base URL</label>
              <input
                value={form.base_url}
                onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                placeholder="https://api.example.com/v1/fixtures"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                API key / token {editingId && <span className="text-zinc-600">(leave blank to keep existing)</span>}
              </label>
              <input
                type="password"
                value={form.api_key}
                onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                placeholder={editingId ? "Enter new key to replace" : "Paste your API key or bearer token"}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 font-mono"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-zinc-900 text-white text-sm px-5 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelForm} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Data sources list */}
      {sources.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center text-zinc-500 text-sm">
          No data sources yet. Add one to start ingesting external API data.
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((ds) => (
            <div key={ds.id} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-900">{ds.name}</p>
                  <p className="text-xs font-mono text-zinc-500 break-all">{ds.base_url}</p>
                  <span className="inline-block text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full mt-1">
                    {AUTH_TYPES.find((a) => a.value === ds.auth_type)?.label ?? ds.auth_type}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => testConnection(ds.id)}
                    disabled={testingId === ds.id}
                    className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2 disabled:opacity-40 transition-colors"
                  >
                    {testingId === ds.id ? "Testing…" : "Test"}
                  </button>
                  <button
                    onClick={() => openEdit(ds)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(ds.id)}
                    className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {testResult?.id === ds.id && (
                <div className={`rounded-lg border px-4 py-3 text-xs ${testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  {testResult.ok ? (
                    <>
                      <p className="font-semibold mb-1">HTTP {testResult.status} — Connection successful</p>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] max-h-48 overflow-y-auto">{testResult.preview}</pre>
                    </>
                  ) : (
                    <p>{testResult.error ?? `HTTP ${testResult.status}`}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
