'use client';

import { useState, useRef } from 'react';
import { Brand } from '../../../../db/schema';

// ── Field definitions ─────────────────────────────────────────────────────────

type BriefField = {
  key: keyof Brand;
  label: string;
  placeholder: string;
  rows: number;
};

const BRIEF_FIELDS: BriefField[] = [
  { key: 'name',                label: 'Brand name',              placeholder: "The brand's display name",                               rows: 1 },
  { key: 'brand_story',         label: 'Brand story / background', placeholder: 'Origin, history, mission — the "why" behind the brand…', rows: 4 },
  { key: 'core_values',         label: 'Core values',             placeholder: 'What the brand stands for…',                             rows: 3 },
  { key: 'key_differentiators', label: 'Key differentiators',     placeholder: 'What sets this brand apart from competitors (USPs)…',    rows: 3 },
  { key: 'target_audience',     label: 'Target audience / personas', placeholder: 'Who the content is for — demographics, interests, pain points…', rows: 3 },
  { key: 'content_themes',      label: 'Content themes',          placeholder: 'Recurring topics and categories to cover…',              rows: 3 },
  { key: 'objectives',          label: 'Objectives / goals',      placeholder: 'What to achieve with content…',                         rows: 3 },
  { key: 'tone_of_voice',       label: 'Tone of voice summary',   placeholder: 'Formal/casual, energetic/calm — one-line summary…',      rows: 2 },
  { key: 'competitors',         label: 'Competitors',             placeholder: 'Brands to monitor or differentiate from…',              rows: 2 },
  { key: 'products_services',   label: 'Products & services',     placeholder: 'What to promote or reference…',                         rows: 3 },
  { key: 'dislikes',            label: 'Do / Don\'t guidelines',  placeholder: 'Topics, tones, formats, or words to avoid…',            rows: 3 },
];

// ── JSON import key mapping ───────────────────────────────────────────────────

const JSON_KEY_MAP: Record<string, keyof Brand> = {
  name: 'name', brand_name: 'name', company: 'name', company_name: 'name',
  brand_story: 'brand_story', story: 'brand_story', about: 'brand_story',
  background: 'brand_story', history: 'brand_story', about_us: 'brand_story',
  core_values: 'core_values', values: 'core_values', brand_values: 'core_values',
  key_differentiators: 'key_differentiators', differentiators: 'key_differentiators',
  usp: 'key_differentiators', unique_selling: 'key_differentiators', usps: 'key_differentiators',
  target_audience: 'target_audience', audience: 'target_audience', personas: 'target_audience',
  target_market: 'target_audience',
  content_themes: 'content_themes', themes: 'content_themes', topics: 'content_themes',
  objectives: 'objectives', goals: 'objectives', mission: 'objectives',
  tone_of_voice: 'tone_of_voice', tone: 'tone_of_voice', voice: 'tone_of_voice',
  brand_voice: 'tone_of_voice',
  competitors: 'competitors', competition: 'competitors',
  products_services: 'products_services', products: 'products_services',
  services: 'products_services', offerings: 'products_services',
  dislikes: 'dislikes', avoid: 'dislikes', donts: 'dislikes',
  do_dont: 'dislikes', dos_and_donts: 'dislikes', guidelines: 'dislikes',
};

// ── Text import heuristics ────────────────────────────────────────────────────

type TextPattern = { patterns: string[]; field: keyof Brand };
const TEXT_PATTERNS: TextPattern[] = [
  { patterns: ['brand name', 'company name', 'name'],                      field: 'name' },
  { patterns: ['brand story', 'about us', 'background', 'history', 'origin', 'story'], field: 'brand_story' },
  { patterns: ['core values', 'values', 'brand values'],                   field: 'core_values' },
  { patterns: ['key differentiators', 'differentiators', 'usp', 'unique'], field: 'key_differentiators' },
  { patterns: ['target audience', 'audience', 'personas', 'target market'], field: 'target_audience' },
  { patterns: ['content themes', 'themes', 'topics', 'content pillars'],   field: 'content_themes' },
  { patterns: ['objectives', 'goals', 'mission'],                          field: 'objectives' },
  { patterns: ['tone of voice', 'tone', 'voice', 'brand voice'],           field: 'tone_of_voice' },
  { patterns: ['competitors', 'competition'],                               field: 'competitors' },
  { patterns: ['products', 'services', 'offerings'],                       field: 'products_services' },
  { patterns: ["don't", "dont", 'avoid', 'guidelines', 'do / dont', 'dos and donts', 'dislikes'], field: 'dislikes' },
];

function parseJsonImport(text: string): Partial<Record<keyof Brand, string>> {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON — could not parse file.');
  }

  const result: Partial<Record<keyof Brand, string>> = {};
  for (const [rawKey, val] of Object.entries(obj)) {
    const normalized = rawKey.toLowerCase().replace(/[\s-]/g, '_');
    const mappedField = JSON_KEY_MAP[normalized];
    if (mappedField && (typeof val === 'string' || typeof val === 'number')) {
      result[mappedField] = String(val).trim();
    }
  }
  return result;
}

function parseTextImport(text: string): Partial<Record<keyof Brand, string>> {
  const result: Partial<Record<keyof Brand, string>> = {};
  // Split on lines that look like section headers (e.g. "## Core values" or "Core values:")
  const sections = text.split(/\n(?=(?:#{1,3}\s+|\*{1,2})?[A-Z][^:\n]{0,50}(?::\s*|\n))/);

  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].replace(/^#{1,3}\s*/, '').replace(/\*+/g, '').toLowerCase().trim();
    const body = lines.slice(1).join('\n').trim() || lines[0].split(':').slice(1).join(':').trim();

    if (!body) continue;

    for (const { patterns, field } of TEXT_PATTERNS) {
      if (patterns.some((p) => header.includes(p))) {
        if (!result[field]) result[field] = body;
        break;
      }
    }
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

type BriefValues = Partial<Record<keyof Brand, string>>;

interface Props {
  initialBrief: Pick<Brand, 'id' | 'name' | 'core_values' | 'content_themes' | 'objectives' |
    'dislikes' | 'tone_of_voice' | 'competitors' | 'products_services' | 'target_audience' |
    'key_differentiators' | 'brand_story'>;
  updateAction: (formData: FormData) => Promise<void>;
}

export default function BriefForm({ initialBrief, updateAction }: Props) {
  const [values, setValues] = useState<BriefValues>(() => {
    const init: BriefValues = {};
    for (const { key } of BRIEF_FIELDS) {
      init[key] = (initialBrief[key as keyof typeof initialBrief] as string | null) ?? '';
    }
    return init;
  });

  const [importMode, setImportMode] = useState<'none' | 'json' | 'text'>('none');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importPreview, setImportPreview] = useState<BriefValues | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setValue(key: keyof Brand, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  // ── Import handlers ───────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseJsonImport(text);
        setImportPreview(parsed);
        setImportError('');
      } catch (err: unknown) {
        setImportError((err as Error).message);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  }

  function handleTextParse() {
    if (!importText.trim()) return;
    try {
      const parsed = parseTextImport(importText);
      setImportPreview(parsed);
      setImportError('');
    } catch (err: unknown) {
      setImportError((err as Error).message);
      setImportPreview(null);
    }
  }

  function applyImport() {
    if (!importPreview) return;
    setValues((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(importPreview)) {
        if (v) next[k as keyof Brand] = v;
      }
      return next;
    });
    setImportPreview(null);
    setImportText('');
    setImportMode('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cancelImport() {
    setImportMode('none');
    setImportText('');
    setImportPreview(null);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const previewCount = importPreview ? Object.keys(importPreview).filter((k) => importPreview[k as keyof Brand]).length : 0;

  return (
    <div>
      {/* Import section */}
      <div className="mb-6">
        {importMode === 'none' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Import from:</span>
            <button
              type="button"
              onClick={() => setImportMode('json')}
              className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded border border-slate-700 hover:border-indigo-500 transition-colors"
            >
              JSON file
            </button>
            <button
              type="button"
              onClick={() => setImportMode('text')}
              className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded border border-slate-700 hover:border-indigo-500 transition-colors"
            >
              Paste text
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                {importMode === 'json' ? 'Import from JSON' : 'Import from text'}
              </span>
              <button type="button" onClick={cancelImport} className="text-xs text-slate-500 hover:text-slate-300">
                Cancel
              </button>
            </div>

            {importMode === 'json' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Upload a JSON file with brand brief fields. Known keys will be mapped automatically.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="text-xs text-slate-400 file:mr-3 file:text-xs file:bg-slate-700 file:text-slate-200 file:border-0 file:px-3 file:py-1.5 file:rounded-lg file:cursor-pointer"
                />
              </div>
            )}

            {importMode === 'text' && (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Paste a brand document or brief. Fields will be extracted based on section headings.
                </p>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={'## Core Values\nInnovation, integrity…\n\n## Target Audience\nSmall business owners…'}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleTextParse}
                  className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Extract fields
                </button>
              </div>
            )}

            {importError && <p className="text-xs text-red-400">{importError}</p>}

            {importPreview && previewCount > 0 && (
              <div className="border border-slate-600 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  {previewCount} field{previewCount !== 1 ? 's' : ''} detected — review before applying:
                </p>
                {BRIEF_FIELDS.map(({ key, label }) => {
                  const v = importPreview[key];
                  if (!v) return null;
                  return (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="text-slate-400 w-40 shrink-0">{label}:</span>
                      <span className="text-slate-200 line-clamp-2">{v}</span>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={applyImport}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Apply to form
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {importPreview && previewCount === 0 && (
              <p className="text-xs text-slate-500">No recognisable fields found. Try adjusting section headings.</p>
            )}
          </div>
        )}
      </div>

      {/* Brief form */}
      <form action={updateAction} className="space-y-5">
        {BRIEF_FIELDS.map(({ key, label, placeholder, rows }) => (
          <div key={key}>
            <label className="block text-xs text-slate-400 mb-1" htmlFor={key}>{label}</label>
            {rows === 1 ? (
              <input
                id={key}
                name={key}
                type="text"
                value={values[key] ?? ''}
                onChange={(e) => setValue(key, e.target.value)}
                required={key === 'name'}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            ) : (
              <textarea
                id={key}
                name={key}
                rows={rows}
                value={values[key] ?? ''}
                onChange={(e) => setValue(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-500"
              />
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Save brief
          </button>
        </div>
      </form>
    </div>
  );
}
