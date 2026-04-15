"use client";

import { useState } from "react";
import Link from "next/link";
import type { Brand } from "@/lib/training-data-db";

export default function BrandsClient({ brands: initial }: { brands: Brand[] }) {
  const [brands, setBrands] = useState<Brand[]>(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to create brand");
      }
      const brand = await res.json() as Brand;
      setBrands((prev) => [...prev, brand].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this brand and all its training data?")) return;
    try {
      const res = await fetch(`/api/brands?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Brands</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-8">
        Each brand has its own training data library used by agents when generating content.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Brand name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="text-sm rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {creating ? "Adding…" : "Add brand"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      {brands.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-500">No brands yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {brands.map((brand) => (
            <li key={brand.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900">
              <Link
                href={`/admin/brands/${brand.id}/training-data`}
                className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
              >
                {brand.name}
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/brands/${brand.id}/training-data`}
                  className="text-xs text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                >
                  Training data →
                </Link>
                <button
                  onClick={() => handleDelete(brand.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
