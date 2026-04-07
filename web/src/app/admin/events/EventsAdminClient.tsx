"use client";

import { useState } from "react";
import type { InputMode, ManualEvent } from "@/lib/manual-events-db";

const MODES: { value: InputMode; label: string; hint: string }[] = [
  { value: "json", label: "JSON", hint: "Paste raw JSON — fields auto-extracted" },
  { value: "table", label: "Table", hint: "Fill in structured fields directly" },
  { value: "freeform", label: "Free-form text", hint: "Describe the event in plain text; AI extracts fields" },
];

// Standard event fields for the table editor
const TABLE_FIELDS = [
  { key: "title", label: "Title" },
  { key: "home_team", label: "Home team" },
  { key: "away_team", label: "Away team" },
  { key: "date", label: "Date" },
  { key: "time", label: "Kick-off time" },
  { key: "venue", label: "Venue" },
  { key: "competition", label: "Competition" },
  { key: "score", label: "Score (if known)" },
  { key: "status", label: "Status" },
  { key: "matchday", label: "Matchday / Round" },
];

interface Props {
  events: ManualEvent[];
}

type Fields = Record<string, string>;

export default function EventsAdminClient({ events: initial }: Props) {
  const [events, setEvents] = useState<ManualEvent[]>(initial);
  const [mode, setMode] = useState<InputMode>("table");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [freeformText, setFreeformText] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [title, setTitle] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setMode("table");
    setJsonInput("");
    setFreeformText("");
    setFields({});
    setTitle("");
    setIsTemplate(false);
    setParseError(null);
    setError(null);
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(ev: ManualEvent) {
    resetForm();
    setEditingId(ev.id);
    setTitle(ev.title);
    setIsTemplate(Boolean(ev.is_template));
    const inputMode = ev.input_mode as InputMode;
    setMode(inputMode);
    const parsed = (() => { try { return JSON.parse(ev.event_data) as Fields; } catch { return {}; } })();
    setFields(parsed);
    if (inputMode === "json") setJsonInput(JSON.stringify(parsed, null, 2));
    else if (inputMode === "freeform") setFreeformText(ev.raw_input ?? "");
    setShowForm(true);
  }

  function parseJson() {
    try {
      const parsed = JSON.parse(jsonInput) as Fields;
      setFields(parsed);
      if (!title && typeof parsed.title === "string") setTitle(parsed.title);
      setParseError(null);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  async function extractFromText() {
    if (!freeformText.trim()) return;
    setExtracting(true);
    setParseError(null);
    try {
      const res = await fetch("/api/events/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: freeformText }),
      });
      const data = await res.json() as { fields: Fields; source: string };
      setFields(data.fields);
      if (!title && typeof data.fields.title === "string") setTitle(data.fields.title as string);
    } catch {
      setParseError("Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (Object.keys(fields).length === 0) { setError("No event fields to save. Fill in the form or parse your input."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        event_data: fields,
        raw_input: mode === "json" ? jsonInput : mode === "freeform" ? freeformText : null,
        input_mode: mode,
        is_template: isTemplate,
      };
      if (editingId) {
        const res = await fetch(`/api/events/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        const updated = await res.json() as ManualEvent;
        setEvents((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        const created = await res.json() as ManualEvent;
        setEvents((prev) => [created, ...prev]);
      }
      setShowForm(false);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Event Data</h1>
          <p className="text-sm text-zinc-500 mt-1">Input event data manually — JSON, table, or free-form text.</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 transition-opacity"
        >
          + New event
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 space-y-5">
          <h2 className="text-base font-semibold text-zinc-800">{editingId ? "Edit event" : "New event"}</h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Event title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Arsenal vs Chelsea — Premier League"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          {/* Mode picker */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Input mode</label>
            <div className="flex gap-2 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => { setMode(m.value); setParseError(null); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    mode === m.value
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{MODES.find((m) => m.value === mode)?.hint}</p>
          </div>

          {/* JSON mode */}
          {mode === "json" && (
            <div className="space-y-2">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={8}
                placeholder={'{\n  "home_team": "Arsenal",\n  "away_team": "Chelsea",\n  "date": "2026-04-05",\n  "competition": "Premier League"\n}'}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {parseError && <p className="text-xs text-red-600">{parseError}</p>}
              <button
                onClick={parseJson}
                className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900 transition-colors"
              >
                Parse JSON → preview fields
              </button>
            </div>
          )}

          {/* Table mode */}
          {mode === "table" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TABLE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{f.label}</label>
                  <input
                    value={(fields[f.key] as string) ?? ""}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Freeform mode */}
          {mode === "freeform" && (
            <div className="space-y-2">
              <textarea
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                rows={5}
                placeholder="Arsenal beat Chelsea 2-1 at the Emirates Stadium on April 5th in the Premier League. Goals from Saka (12') and Havertz (67'). Chelsea scored through Palmer (45+2')."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                onClick={extractFromText}
                disabled={extracting || !freeformText.trim()}
                className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-40 transition-colors"
              >
                {extracting ? "Extracting…" : "Extract fields from text"}
              </button>
            </div>
          )}

          {/* Parsed fields preview (JSON + freeform) */}
          {(mode === "json" || mode === "freeform") && Object.keys(fields).length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-500 mb-2">Parsed fields</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(fields).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-zinc-400 font-mono text-xs shrink-0 w-24 truncate">{k}</span>
                    <span className="text-zinc-800 truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template toggle */}
          <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="rounded"
            />
            Save as reusable template
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-zinc-900 text-white text-sm px-5 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving…" : "Save event"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-sm text-zinc-500 hover:text-zinc-900 px-2 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {events.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center text-zinc-500 text-sm">
          No events yet. Add one using JSON paste, table entry, or plain text.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const parsed = (() => { try { return JSON.parse(ev.event_data) as Fields; } catch { return {}; } })();
            const preview = [parsed.home_team, parsed.away_team].filter(Boolean).join(" vs ") ||
              parsed.date || Object.values(parsed).slice(0, 2).join(" · ");
            return (
              <div key={ev.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900 truncate">{ev.title}</p>
                    {ev.is_template && (
                      <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full shrink-0">template</span>
                    )}
                    <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full shrink-0">{ev.input_mode}</span>
                  </div>
                  {preview && <p className="text-xs text-zinc-500 truncate">{preview}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => openEdit(ev)} className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => remove(ev.id)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
