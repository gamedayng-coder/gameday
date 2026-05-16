import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../lib/supabase/service';
import { Brand } from '../../db/schema';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brands')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  const brands: Brand[] = (data ?? []) as Brand[];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Select a brand</h1>
            <p className="text-sm text-slate-400 mt-1">
              {brands.length > 0
                ? `${brands.length} brand${brands.length !== 1 ? 's' : ''} · choose one to get started`
                : 'Create your first brand below'}
            </p>
          </div>
          <Link
            href="/brands/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            + New brand
          </Link>
        </div>

        {brands.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">No brands yet.</p>
            <p className="mt-1 text-sm">Create your first brand above.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/brands/${brand.id}/setup`}
                  className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 hover:border-slate-600 transition-colors"
                >
                  <span className="font-semibold text-slate-100">{brand.name}</span>
                  <span className="text-xs text-slate-500">
                    Created {new Date(brand.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
