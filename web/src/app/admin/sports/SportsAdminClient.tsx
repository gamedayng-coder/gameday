"use client";

import { useState, useTransition } from "react";
import type { Competition, SyncLog } from "@/lib/sports-db";

interface Props {
  competitions: Competition[];
  syncLogs: SyncLog[];
}

export default function SportsAdminClient({ competitions: initial, syncLogs: initialLogs }: Props) {
  const [competitions, setCompetitions] = useState<Competition[]>(initial);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(initialLogs);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function toggleActive(comp: Competition) {
    const newActive = comp.active === 0;
    const res = await fetch("/api/sports/competitions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ external_id: comp.external_id, active: newActive }),
    });
    if (res.ok) {
      const updated = await res.json() as Competition;
      setCompetitions((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  }

  async function triggerSync(code?: string) {
    const target = code ?? "all active";
    setSyncing(target);
    setMessage(null);
    const res = await fetch("/api/sports/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(code ? { competition_code: code } : {}),
    });
    setSyncing(null);
    if (res.ok) {
      const data = await res.json() as { results?: Array<{ code: string; success: boolean; error?: string }> };
      const parts = (data.results ?? []).map((r) =>
        r.success ? `${r.code}: ok` : `${r.code}: ${r.error}`
      );
      setMessage(parts.length ? parts.join(" | ") : "Synced.");

      // Refresh sync logs
      startTransition(async () => {
        const logsRes = await fetch("/api/sports/sync-logs");
        if (logsRes.ok) setSyncLogs(await logsRes.json() as SyncLog[]);
      });
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setMessage(`Error: ${err.error ?? res.statusText}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Sports Data Admin</h1>
        <button
          onClick={() => triggerSync()}
          disabled={syncing !== null || isPending}
          className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {syncing === "all active" ? "Syncing…" : "Sync all active"}
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {message}
        </div>
      )}

      {/* Competitions table */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-800 mb-3">Competitions</h2>
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Competition</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-center">Follow</th>
                <th className="px-4 py-3 text-center">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {competitions.map((comp) => (
                <tr key={comp.id} className="bg-white hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-mono">
                        {comp.external_id}
                      </span>
                      {comp.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{comp.country ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{comp.current_season ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(comp)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        comp.active ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                      title={comp.active ? "Unfollow" : "Follow"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          comp.active ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => triggerSync(comp.external_id)}
                      disabled={syncing !== null || !comp.active}
                      className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition-colors underline underline-offset-2"
                      title={comp.active ? "Sync now" : "Enable to sync"}
                    >
                      {syncing === comp.external_id ? "…" : "Sync"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Free tier competitions from football-data.org. Add your{" "}
          <code className="bg-zinc-100 px-1 rounded">FOOTBALL_DATA_API_KEY</code> to{" "}
          <code className="bg-zinc-100 px-1 rounded">.env.local</code> to enable sync, or configure a custom data source via{" "}
          <a href="/admin/data-sources" className="underline hover:text-zinc-600">Data Sources</a>.
        </p>
      </div>

      {/* Recent sync log */}
      {syncLogs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-800 mb-3">Recent Sync Log</h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="bg-white">
                    <td className="px-4 py-2 text-zinc-500">
                      {new Date(log.synced_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{log.sync_type}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          log.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500 truncate max-w-xs">
                      {log.message ?? "—"}
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
