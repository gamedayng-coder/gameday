'use client';

import { useState } from 'react';
import { BrandTemplate, TemplateKind } from '../../../db/schema';

const POSTER_TYPES = ['match-day', 'result', 'weekly-schedule', 'custom'] as const;
const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'telegram'] as const;

// Sample values substituted into caption previews
const CAPTION_SAMPLE: Record<string, string> = {
  team: 'The Eagles',
  score: '3–1',
  date: 'April 15, 2026',
  venue: 'Home Arena',
  opponent: 'The Wolves',
  result: 'Win',
  competition: 'League Cup',
};

function fillCaption(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => CAPTION_SAMPLE[key] ?? `{${key}}`);
}

type Tab = 'poster' | 'caption';

type Props = {
  brandId: string;
  initialTemplates: BrandTemplate[];
};

type FormState = {
  id: string | null;  // null = new
  kind: TemplateKind;
  name: string;
  content: string;
  poster_type: string;
  platform: string;
};

const DEFAULT_FORM: FormState = {
  id: null,
  kind: 'poster',
  name: '',
  content: '',
  poster_type: '',
  platform: 'instagram',
};

export default function TemplatesSection({ brandId, initialTemplates }: Props) {
  const [templates, setTemplates] = useState<BrandTemplate[]>(initialTemplates);
  const [tab, setTab] = useState<Tab>('poster');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState('');

  const visible = templates.filter((t) => t.kind === tab);

  function openNew() {
    setForm({ ...DEFAULT_FORM, kind: tab });
    setError('');
  }

  function openEdit(t: BrandTemplate) {
    setForm({
      id: t.id,
      kind: t.kind,
      name: t.name,
      content: t.content,
      poster_type: t.poster_type ?? '',
      platform: t.platform ?? 'instagram',
    });
    setError('');
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      let res: Response;
      if (!form.id) {
        // Create
        res = await fetch(`/api/brands/${brandId}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: form.kind,
            name: form.name.trim(),
            content: form.content,
            poster_type: form.kind === 'poster' ? form.poster_type : undefined,
            platform: form.kind === 'caption' ? form.platform : undefined,
          }),
        });
      } else {
        // Update
        res = await fetch(`/api/templates/${form.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            content: form.content,
            poster_type: form.kind === 'poster' ? form.poster_type : null,
            platform: form.kind === 'caption' ? form.platform : null,
          }),
        });
      }
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Save failed');
      }
      const saved = await res.json() as BrandTemplate;
      setTemplates((prev) =>
        form.id
          ? prev.map((t) => (t.id === form.id ? saved : t))
          : [...prev, saved]
      );
      setForm(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (form?.id === id) setForm(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleSetActive(t: BrandTemplate) {
    setActivating(t.id);
    try {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) throw new Error('Failed to set active');
      const updated = await res.json() as BrandTemplate;
      // Deactivate others in same scope client-side to match server
      setTemplates((prev) =>
        prev.map((existing) => {
          if (existing.id === t.id) return updated;
          if (existing.kind !== t.kind) return existing;
          const sameScope =
            t.kind === 'poster'
              ? existing.poster_type === t.poster_type
              : existing.platform === t.platform;
          return sameScope ? { ...existing, is_active: false } : existing;
        })
      );
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setActivating(null);
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-700">
        {(['poster', 'caption'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setForm(null); setError(''); }}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Template list */}
      {visible.length === 0 && !form && (
        <p className="text-sm text-slate-600 mb-4">No {tab} templates yet.</p>
      )}
      {visible.length > 0 && (
        <ul className="space-y-2 mb-5">
          {visible.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => openEdit(t)}
                  className="font-medium text-sm text-slate-100 hover:text-indigo-400 transition-colors truncate text-left"
                >
                  {t.name}
                </button>
                {t.poster_type && (
                  <span className="text-xs text-slate-500 shrink-0">{t.poster_type}</span>
                )}
                {t.platform && (
                  <span className="text-xs text-slate-500 shrink-0 capitalize">{t.platform}</span>
                )}
                {t.is_active && (
                  <span className="text-xs text-green-400 font-semibold shrink-0">Active</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {!t.is_active && (
                  <button
                    onClick={() => handleSetActive(t)}
                    disabled={activating === t.id}
                    className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
                  >
                    {activating === t.id ? 'Setting…' : 'Set active'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                  className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                >
                  {deleting === t.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* New template button */}
      {!form && (
        <button
          onClick={openNew}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + New {tab} template
        </button>
      )}

      {/* Editor */}
      {form && (
        <div className="border border-slate-600 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              {form.id ? 'Edit template' : `New ${form.kind} template`}
            </h3>
            <button
              onClick={() => { setForm(null); setError(''); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
              placeholder="Template name…"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Scope selector */}
          {form.kind === 'poster' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Poster type</label>
              <select
                value={form.poster_type}
                onChange={(e) => setForm((f) => f && { ...f, poster_type: e.target.value })}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {POSTER_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>
          )}
          {form.kind === 'caption' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => f && { ...f, platform: e.target.value })}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Content editor + preview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {form.kind === 'poster' ? 'HTML / CSS' : 'Caption template'}
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => f && { ...f, content: e.target.value })}
                rows={14}
                spellCheck={false}
                placeholder={
                  form.kind === 'poster'
                    ? '<html>\n  <style>…</style>\n  <body>…</body>\n</html>'
                    : 'Match day alert! {team} vs {opponent} — {date} at {venue}. Get your tickets! 🎟️'
                }
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-600"
              />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Preview</p>
              {form.kind === 'poster' ? (
                <iframe
                  srcDoc={form.content || '<p style="color:#666;font-family:sans-serif;padding:1rem">Enter HTML above…</p>'}
                  sandbox="allow-same-origin"
                  className="w-full h-56 rounded-lg border border-slate-600 bg-white"
                  title="Poster preview"
                />
              ) : (
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 min-h-14 whitespace-pre-wrap">
                  {form.content
                    ? fillCaption(form.content)
                    : <span className="text-slate-600">Enter caption template above…</span>}
                </div>
              )}
              {form.kind === 'caption' && (
                <p className="text-xs text-slate-600 mt-1">
                  Available variables: {Object.keys(CAPTION_SAMPLE).map((k) => `{${k}}`).join(', ')}
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : form.id ? 'Update template' : 'Create template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
