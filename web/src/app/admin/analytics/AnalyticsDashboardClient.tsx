"use client";

import { useState, useTransition } from "react";
import type {
  PlatformAggregate,
  PublishedTwitterPost,
  PublishedLinkedInPost,
  PublishedTikTokPost,
  PublishedTelegramPost,
} from "@/lib/analytics-db";

interface Posts {
  twitter: PublishedTwitterPost[];
  linkedin: PublishedLinkedInPost[];
  tiktok: PublishedTikTokPost[];
  telegram: PublishedTelegramPost[];
}

interface Props {
  aggregates: PlatformAggregate[];
  posts: Posts;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-50 border-sky-200",
  linkedin: "bg-blue-50 border-blue-200",
  tiktok: "bg-pink-50 border-pink-200",
  telegram: "bg-cyan-50 border-cyan-200",
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  telegram: "Telegram",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-zinc-900">{fmt(value)}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function AnalyticsDashboardClient({ aggregates: initialAggregates, posts: initialPosts }: Props) {
  const [aggregates, setAggregates] = useState(initialAggregates);
  const [posts, setPosts] = useState(initialPosts);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [activeTab, setActiveTab] = useState<"twitter" | "linkedin" | "tiktok" | "telegram">("twitter");

  async function handleRefresh() {
    setMessage(null);
    startRefresh(async () => {
      const res = await fetch("/api/analytics/refresh", { method: "POST" });
      const data = await res.json() as {
        ok: boolean;
        results: Record<string, { updated: number; error?: string }>;
      };

      if (res.ok) {
        // Reload aggregates and posts
        const statsRes = await fetch("/api/analytics");
        if (statsRes.ok) {
          const fresh = await statsRes.json() as { aggregates: PlatformAggregate[]; posts: Posts };
          setAggregates(fresh.aggregates);
          setPosts(fresh.posts);
        }

        const summary = Object.entries(data.results)
          .map(([p, r]) => (r.error ? `${p}: ${r.error}` : `${p}: ${r.updated} updated`))
          .join(" · ");
        setMessage(summary);
      } else {
        setMessage("Refresh failed.");
      }
    });
  }

  const totalPublished = aggregates.reduce((s, a) => s + (a.published ?? 0), 0);
  const totalLikes = aggregates.reduce((s, a) => s + (a.total_likes ?? 0), 0);
  const totalImpressions = aggregates.reduce((s, a) => s + (a.total_impressions ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-full bg-zinc-900 text-white text-sm px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {refreshing ? "Refreshing…" : "Refresh metrics"}
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {message}
        </div>
      )}

      {/* Top-level summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 p-5 text-center">
          <p className="text-3xl font-bold text-zinc-900">{totalPublished}</p>
          <p className="text-xs text-zinc-500 mt-1">Total published posts</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-5 text-center">
          <p className="text-3xl font-bold text-zinc-900">{fmt(totalLikes)}</p>
          <p className="text-xs text-zinc-500 mt-1">Total likes</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-5 text-center">
          <p className="text-3xl font-bold text-zinc-900">{fmt(totalImpressions)}</p>
          <p className="text-xs text-zinc-500 mt-1">Total impressions / views</p>
        </div>
      </div>

      {/* Per-platform cards */}
      {aggregates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {aggregates.map((agg) => (
            <div
              key={agg.platform}
              className={`rounded-xl border p-5 space-y-4 ${PLATFORM_COLORS[agg.platform] ?? "bg-zinc-50 border-zinc-200"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-zinc-800 text-sm">
                  {PLATFORM_LABELS[agg.platform] ?? agg.platform}
                </h2>
                <span className="text-xs text-zinc-400">{agg.total_posts} posts total</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="likes" value={agg.total_likes ?? 0} />
                <Stat label="impressions" value={agg.total_impressions ?? 0} />
                <Stat label="comments" value={agg.total_comments ?? 0} />
                <Stat label="shares" value={agg.total_shares ?? 0} />
              </div>
              <div className="flex gap-3 text-xs text-zinc-500">
                <span className="text-emerald-600 font-medium">{agg.published ?? 0} published</span>
                <span>{agg.pending ?? 0} pending</span>
                {(agg.failed ?? 0) > 0 && (
                  <span className="text-red-500">{agg.failed} failed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
          No published posts yet. Post to a platform to see metrics here.
        </div>
      )}

      {/* Per-post metrics table */}
      <div>
        <div className="flex gap-2 mb-4">
          {(["twitter", "linkedin", "tiktok", "telegram"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === p
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>

        {activeTab === "twitter" && (
          <PostTable
            posts={posts.twitter}
            columns={["Likes", "Retweets", "Replies", "Impressions"]}
            renderRow={(p: PublishedTwitterPost) => [p.likes, p.retweets, p.replies, p.impressions]}
            getLink={(p: PublishedTwitterPost) =>
              `https://x.com/i/web/status/${p.tweet_id}`
            }
            getUpdatedAt={(p: PublishedTwitterPost) => p.metrics_updated_at}
          />
        )}
        {activeTab === "linkedin" && (
          <PostTable
            posts={posts.linkedin}
            columns={["Likes", "Comments", "Impressions", ""]}
            renderRow={(p: PublishedLinkedInPost) => [p.likes, p.comments, p.impressions, null]}
            getLink={() => null}
            getUpdatedAt={(p: PublishedLinkedInPost) => p.metrics_updated_at}
          />
        )}
        {activeTab === "tiktok" && (
          <PostTable
            posts={posts.tiktok}
            columns={["Views", "Likes", "Comments", "Shares"]}
            renderRow={(p: PublishedTikTokPost) => [p.views, p.likes, p.comments, p.shares]}
            getLink={() => null}
            getUpdatedAt={(p: PublishedTikTokPost) => p.metrics_updated_at}
          />
        )}
        {activeTab === "telegram" && (
          <PostTable
            posts={posts.telegram}
            columns={["Views", "", "", ""]}
            renderRow={(p: PublishedTelegramPost) => [p.views, null, null, null]}
            getLink={() => null}
            getUpdatedAt={(p: PublishedTelegramPost) => p.metrics_updated_at}
          />
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Call <code className="bg-zinc-100 px-1 rounded">POST /api/analytics/refresh</code>{" "}
        (with <code className="bg-zinc-100 px-1 rounded">x-cron-secret</code>) daily to keep metrics current.
        Twitter metrics are fetched live; LinkedIn and TikTok require additional OAuth scopes.
      </p>
    </div>
  );
}

interface PostTableProps<T extends { id: number; content: string; published_at: string | null }> {
  posts: T[];
  columns: string[];
  renderRow: (post: T) => (number | null)[];
  getLink: (post: T) => string | null;
  getUpdatedAt: (post: T) => string | null;
}

function PostTable<T extends { id: number; content: string; published_at: string | null }>({
  posts,
  columns,
  renderRow,
  getLink,
  getUpdatedAt,
}: PostTableProps<T>) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 p-6 text-center text-sm text-zinc-400">
        No published posts.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Content</th>
            <th className="px-4 py-3 text-left">Published</th>
            {columns.filter(Boolean).map((c) => (
              <th key={c} className="px-4 py-3 text-right">
                {c}
              </th>
            ))}
            <th className="px-4 py-3 text-left">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {posts.map((post) => {
            const values = renderRow(post);
            const link = getLink(post);
            const updatedAt = getUpdatedAt(post);
            return (
              <tr key={post.id} className="bg-white hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 text-zinc-900 max-w-xs truncate">{post.content}</td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString()
                    : "—"}
                </td>
                {values.map((v, i) =>
                  columns[i] ? (
                    <td key={i} className="px-4 py-3 text-right text-zinc-700 font-mono text-xs">
                      {v !== null ? fmt(v) : "—"}
                    </td>
                  ) : null
                )}
                <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                  {updatedAt ? new Date(updatedAt).toLocaleDateString() : "never"}
                </td>
                <td className="px-4 py-3 text-right">
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-500 hover:underline"
                    >
                      View
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
