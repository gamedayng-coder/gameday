"use client";

import { useState, useTransition } from "react";
import type { TwitterCredential, TwitterPost } from "@/lib/twitter-db";
import type { Poster } from "@/lib/poster-db";

interface Props {
  credential: TwitterCredential | null;
  posts: TwitterPost[];
  approvedPosters: Poster[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  published: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};

export default function TwitterAdminClient({ credential: initial, posts: initialPosts, approvedPosters }: Props) {
  const [credential, setCredential] = useState(initial);
  const [posts, setPosts] = useState<TwitterPost[]>(initialPosts);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Compose form state
  const [content, setContent] = useState("");
  const [posterId, setPosterId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refreshPosts() {
    startTransition(async () => {
      const res = await fetch("/api/twitter/posts");
      if (res.ok) setPosts(await res.json());
    });
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect your Twitter/X account?")) return;
    const res = await fetch("/api/twitter/auth", { method: "DELETE" });
    if (res.ok) {
      setCredential(null);
      setMessage("Twitter account disconnected.");
    }
  }

  async function handleCompose(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const body: Record<string, string> = { content: content.trim() };
    if (posterId) body.posterId = posterId;
    if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

    const res = await fetch("/api/twitter/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (res.ok) {
      setContent("");
      setPosterId("");
      setScheduledAt("");
      setMessage(scheduledAt ? "Post scheduled." : "Post queued for immediate delivery.");
      refreshPosts();
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setMessage(`Error: ${err.error ?? res.statusText}`);
    }
  }

  async function handleCancel(id: number) {
    const res = await fetch(`/api/twitter/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Post cancelled.");
      refreshPosts();
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setMessage(`Error: ${err.error ?? res.statusText}`);
    }
  }

  async function handleProcessQueue() {
    setMessage(null);
    const res = await fetch("/api/twitter/process-queue", { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { processed: number; results: Array<{ id: number; success: boolean; error?: string }> };
      const failed = data.results.filter((r) => !r.success);
      setMessage(
        data.processed === 0
          ? "No posts due."
          : failed.length
          ? `Processed ${data.processed}: ${failed.length} failed.`
          : `Published ${data.processed} post(s).`
      );
      refreshPosts();
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setMessage(`Error: ${err.error ?? res.statusText}`);
    }
  }

  const remaining = 280 - content.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Twitter / X</h1>
        {credential && (
          <button
            onClick={handleProcessQueue}
            disabled={isPending}
            className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Publish queue now
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {message}
        </div>
      )}

      {/* Connection status */}
      <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Account</h2>
        {credential ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900">@{credential.twitter_username}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {credential.expires_at
                  ? `Token expires ${new Date(credential.expires_at).toLocaleDateString()}`
                  : "Token does not expire"}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">No account connected.</p>
            <a
              href="/api/twitter/auth"
              className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 transition-opacity"
            >
              Connect Twitter / X
            </a>
          </div>
        )}
      </div>

      {/* Compose */}
      {credential && (
        <div className="rounded-xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Compose</h2>
          <form onSubmit={handleCompose} className="space-y-3">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="What's happening?"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none"
              />
              <p className={`text-xs mt-1 text-right ${remaining < 20 ? "text-red-500" : "text-zinc-600"}`}>
                {remaining} characters remaining
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Attach poster (optional)</label>
                <select
                  value={posterId}
                  onChange={(e) => setPosterId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                >
                  <option value="">None</option>
                  {approvedPosters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} — {p.fixture_home_team && p.fixture_away_team
                        ? `${p.fixture_home_team} vs ${p.fixture_away_team}`
                        : p.week_start ?? p.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Schedule for (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim() || content.length > 280}
                className="rounded-full bg-sky-500 text-white text-sm px-5 py-2 font-medium hover:bg-sky-600 disabled:opacity-40 transition-colors"
              >
                {submitting ? "Adding…" : scheduledAt ? "Schedule" : "Post now"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post queue */}
      {posts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-800 mb-3">Post Queue</h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Content</th>
                  <th className="px-4 py-3 text-left">Scheduled</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Tweet</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {posts.map((post) => (
                  <tr key={post.id} className="bg-white hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-900 max-w-xs truncate">
                      {post.content}
                      {post.error && (
                        <p className="text-xs text-red-500 truncate">{post.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {post.scheduled_at
                        ? new Date(post.scheduled_at).toLocaleString()
                        : post.published_at
                        ? new Date(post.published_at).toLocaleString()
                        : "Immediate"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[post.status] ?? ""}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
                      {post.tweet_id ? (
                        <a
                          href={`https://x.com/i/web/status/${post.tweet_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-500 hover:underline"
                        >
                          View
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {post.status === "pending" && (
                        <button
                          onClick={() => handleCancel(post.id)}
                          className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Call{" "}
            <code className="bg-zinc-100 px-1 rounded">POST /api/twitter/process-queue</code>{" "}
            (with <code className="bg-zinc-100 px-1 rounded">x-cron-secret</code>) on a schedule to publish queued posts automatically.
          </p>
        </div>
      )}

      {!credential && posts.length === 0 && (
        <div className="text-center py-12 text-zinc-600 text-sm">
          Connect a Twitter / X account to start posting.
        </div>
      )}
    </div>
  );
}
