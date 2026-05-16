import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '../../lib/supabase/server';
import { signOut } from '../../lib/actions';

type Props = { children: React.ReactNode };

function isAdminUser(email: string): boolean {
  const allowlist = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}

export default async function AdminLayout({ children }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (!isAdminUser(user.email ?? '')) redirect('/brands');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="shrink-0 border-b border-slate-700 bg-slate-900 px-4 py-3 flex items-center gap-4">
        <Link
          href="/brands"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap"
        >
          ← Brands
        </Link>
        <span className="text-sm font-semibold text-slate-100">System Admin</span>
        <div className="ml-auto">
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 border-r border-slate-700 flex flex-col py-4 px-3 gap-0.5">
          <p className="px-3 pt-1 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Tenants
          </p>
          <Link
            href="/admin/brands"
            className="flex items-center px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            Brands
          </Link>
          <Link
            href="/admin/auth"
            className="flex items-center px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            Auth
          </Link>
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Observability
          </p>
          <Link
            href="/admin/observability/errors"
            className="flex items-center px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            Error Logs
          </Link>
          <Link
            href="/admin/observability/health"
            className="flex items-center px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            Health Checks
          </Link>
        </nav>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
