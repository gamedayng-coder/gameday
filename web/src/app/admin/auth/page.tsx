import { redirect } from 'next/navigation';
import { getUser } from '../../../lib/supabase/server';
import { getDemoUserState, ensureDemoUser } from './actions';

export const dynamic = 'force-dynamic';

const DEMO_EMAIL = 'demo@gamedayng.com';

export default async function AdminAuthPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const state = await getDemoUserState();

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Auth accounts</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage shared Supabase auth accounts used for demos and testing.
        </p>
      </div>

      {/* Demo user card */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* State indicator */}
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {state.exists ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
                    ✓
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">Demo account</span>
                  <span className="text-xs font-mono text-slate-500">{DEMO_EMAIL}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {state.exists
                    ? `Supabase user id: ${state.userId}${state.emailConfirmed ? '' : ' · email not confirmed'}`
                    : 'User does not exist in Supabase auth'}
                </p>
              </div>
            </div>

            <form
              action={async () => {
                'use server';
                await ensureDemoUser();
              }}
              className="shrink-0"
            >
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white bg-slate-700 hover:bg-slate-600"
              >
                {state.exists ? 'Reset password' : 'Create user'}
              </button>
            </form>
          </div>

          {state.exists && (
            <div className="mt-3 ml-8 rounded-lg bg-slate-800 px-4 py-3 text-xs text-slate-400 space-y-1">
              <p>
                <span className="text-slate-500">Password:</span>{' '}
                <span className="font-mono text-slate-300">GameDay2026!</span>
              </p>
              <p>
                <span className="text-slate-500">Login URL:</span>{' '}
                <a
                  href="https://gameday-wheat.vercel.app/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  https://gameday-wheat.vercel.app/login
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-600">
        &ldquo;Reset password&rdquo; sets the password to <span className="font-mono">GameDay2026!</span> without deleting the account or its data.
      </p>
    </div>
  );
}
