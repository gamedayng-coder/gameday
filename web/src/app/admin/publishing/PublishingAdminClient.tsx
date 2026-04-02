"use client";

import { useState } from "react";
import type { PublishChannel, PublishingRoutine, PublishingSchedule } from "@/lib/publishing-db";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland",
];

const ALL_CHANNELS: PublishChannel[] = ["twitter", "instagram", "facebook", "tiktok", "telegram", "linkedin"];
const CONTENT_TYPES = [
  { value: "any", label: "Any content" },
  { value: "game_day", label: "Game day previews" },
  { value: "result", label: "Match results" },
  { value: "weekly_schedule", label: "Weekly schedule" },
];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ScheduleRule = { type: "immediate" | "scheduled"; time?: string; days?: number[] };

interface RoutineForm {
  name: string;
  content_type: string;
  channels: PublishChannel[];
  time: string;
  days: number[];
  max_per_day: number;
  timezone: string;
}

const emptyForm: RoutineForm = {
  name: "",
  content_type: "any",
  channels: [],
  time: "09:00",
  days: [],
  max_per_day: 5,
  timezone: "UTC",
};

interface DryRunEntry {
  id: string;
  routine_name: string;
  channel: string;
  content_preview: string;
  scheduled_at: string;
  timezone: string;
}

interface Props {
  routines: PublishingRoutine[];
  schedules: PublishingSchedule[];
}

export default function PublishingAdminClient({ routines: initialRoutines, schedules: initialSchedules }: Props) {
  const [routines, setRoutines] = useState<PublishingRoutine[]>(initialRoutines);
  const [schedules, setSchedules] = useState<PublishingSchedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoutineForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<{ entries: DryRunEntry[]; total: number } | null>(null);
  const [runningDryRun, setRunningDryRun] = useState(false);
  // Manual schedule override
  const [manualChannel, setManualChannel] = useState<PublishChannel>("twitter");
  const [manualScheduledAt, setManualScheduledAt] = useState("");
  const [schedulingManual, setSchedulingManual] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(r: PublishingRoutine) {
    setEditingId(r.id);
    const channels = (() => { try { return JSON.parse(r.channels) as PublishChannel[]; } catch { return []; } })();
    const rule = (() => { try { return JSON.parse(r.schedule_rule) as ScheduleRule; } catch { return { type: "scheduled" as const, time: "09:00", days: [] }; } })();
    setForm({
      name: r.name,
      content_type: r.content_type,
      channels,
      time: rule.time ?? "09:00",
      days: rule.days ?? [],
      max_per_day: r.max_per_day,
      timezone: r.timezone,
    });
    setShowForm(true);
    setError(null);
  }

  function toggleChannel(ch: PublishChannel) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  async function save() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.channels.length === 0) { setError("Select at least one channel."); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      content_type: form.content_type,
      channels: form.channels,
      schedule_rule: { type: "scheduled", time: form.time, days: form.days },
      max_per_day: form.max_per_day,
      timezone: form.timezone,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/publishing/routines/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        const updated = await res.json() as PublishingRoutine;
        setRoutines((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const res = await fetch("/api/publishing/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        const created = await res.json() as PublishingRoutine;
        setRoutines((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(r: PublishingRoutine) {
    const res = await fetch(`/api/publishing/routines/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: r.enabled === 1 ? 0 : 1 }),
    });
    if (res.ok) {
      const updated = await res.json() as PublishingRoutine;
      setRoutines((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this routine?")) return;
    const res = await fetch(`/api/publishing/routines/${id}`, { method: "DELETE" });
    if (res.ok) setRoutines((prev) => prev.filter((r) => r.id !== id));
  }

  async function runDryRun() {
    setRunningDryRun(true);
    setDryRunResult(null);
    const res = await fetch("/api/publishing/dry-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 7 }),
    });
    if (res.ok) setDryRunResult(await res.json() as { entries: DryRunEntry[]; total: number });
    setRunningDryRun(false);
  }

  async function scheduleManual() {
    if (!manualScheduledAt) return;
    setSchedulingManual(true);
    const res = await fetch("/api/publishing/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: manualChannel, scheduled_at: manualScheduledAt }),
    });
    if (res.ok) {
      const s = await res.json() as PublishingSchedule;
      setSchedules((prev) => [s, ...prev]);
      setManualScheduledAt("");
    }
    setSchedulingManual(false);
  }

  async function removeSchedule(id: string) {
    const res = await fetch(`/api/publishing/schedules/${id}`, { method: "DELETE" });
    if (res.ok) setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Publishing Setup</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure posting routines, channel selection, schedules, and dry-run simulation.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runDryRun}
            disabled={runningDryRun}
            className="rounded-full border border-zinc-300 text-zinc-700 text-sm px-4 py-2 font-medium hover:border-zinc-500 disabled:opacity-40 transition-colors"
          >
            {runningDryRun ? "Running…" : "Dry run (7 days)"}
          </button>
          <button
            onClick={openAdd}
            className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 transition-opacity"
          >
            + New routine
          </button>
        </div>
      </div>

      {/* Routine form */}
      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 space-y-5">
          <h2 className="text-base font-semibold text-zinc-800">{editingId ? "Edit routine" : "New routine"}</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Routine name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Game day preview posts"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Content type</label>
              <select
                value={form.content_type}
                onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Channels</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                    form.channels.includes(ch)
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "text-zinc-600 border-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Post time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Max posts / day</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.max_per_day}
                onChange={(e) => setForm((f) => ({ ...f, max_per_day: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Days of week (leave empty = every day)</label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                    form.days.includes(i)
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "text-zinc-600 border-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-zinc-900 text-white text-sm px-5 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving…" : "Save routine"}
            </button>
            <button onClick={() => { setShowForm(false); setError(null); }} className="text-sm text-zinc-500 hover:text-zinc-900 px-2 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Routines list */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-800 mb-3">Posting Routines</h2>
        {routines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-zinc-400 text-sm">
            No routines yet. Create one to automate content posting.
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((r) => {
              const channels = (() => { try { return JSON.parse(r.channels) as string[]; } catch { return []; } })();
              const rule = (() => { try { return JSON.parse(r.schedule_rule) as ScheduleRule; } catch { return { type: "scheduled" as const }; } })();
              return (
                <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-900">{r.name}</p>
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{r.content_type}</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {channels.join(", ")} · {rule.time ?? "any time"} · max {r.max_per_day}/day · {r.timezone}
                        {rule.days?.length ? ` · ${rule.days.map((d) => DAYS_OF_WEEK[d]).join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => toggleEnabled(r)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.enabled ? "bg-emerald-500" : "bg-zinc-300"}`}
                        title={r.enabled ? "Disable" : "Enable"}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${r.enabled ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                      <button onClick={() => openEdit(r)} className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2 transition-colors">Edit</button>
                      <button onClick={() => remove(r.id)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual schedule override */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-800 mb-3">Manual Schedule Override</h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500 mb-4">Schedule a specific post for a specific time, outside of routines.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Channel</label>
              <select
                value={manualChannel}
                onChange={(e) => setManualChannel(e.target.value as PublishChannel)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {ALL_CHANNELS.map((ch) => <option key={ch} value={ch} className="capitalize">{ch}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Date & time</label>
              <input
                type="datetime-local"
                value={manualScheduledAt}
                onChange={(e) => setManualScheduledAt(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <button
              onClick={scheduleManual}
              disabled={schedulingManual || !manualScheduledAt}
              className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {schedulingManual ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      </div>

      {/* Dry-run results */}
      {dryRunResult && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-800 mb-3">
            Dry Run — {dryRunResult.total} posts projected over 7 days
          </h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Routine</th>
                  <th className="px-4 py-3 text-left">Content preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dryRunResult.entries.map((e) => (
                  <tr key={e.id} className="bg-white hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                      {new Date(e.scheduled_at).toLocaleString()} <span className="text-zinc-400 text-xs">{e.timezone}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 capitalize">{e.channel}</td>
                    <td className="px-4 py-3 text-zinc-500">{e.routine_name}</td>
                    <td className="px-4 py-3 text-zinc-500 truncate max-w-xs">{e.content_preview || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming schedules */}
      {schedules.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-800 mb-3">Upcoming Schedules</h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Content</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="bg-white hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{new Date(s.scheduled_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-700 capitalize">{s.channel}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === "sent" ? "bg-emerald-50 text-emerald-700"
                          : s.status === "failed" ? "bg-red-50 text-red-700"
                          : s.status === "dry_run" ? "bg-amber-50 text-amber-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 truncate max-w-xs">{s.content_caption ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeSchedule(s.id)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
