import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../../lib/supabase/server';
import { createBrandWithSetup } from '../../../lib/brand-actions';

export const dynamic = 'force-dynamic';

export default async function NewBrandPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link
            href="/brands"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to brands
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-4">Create a brand</h1>
          <p className="text-sm text-slate-400 mt-1">
            You can fill in the rest during setup.
          </p>
        </div>

        <form action={createBrandWithSetup} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Brand name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme FC"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-slate-300 mb-1">
              Industry
            </label>
            <input
              id="industry"
              name="industry"
              type="text"
              placeholder="e.g. Sports, Hospitality, Retail"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-slate-300 mb-1">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://example.com"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors mt-2"
          >
            Create brand →
          </button>
        </form>
      </div>
    </div>
  );
}
