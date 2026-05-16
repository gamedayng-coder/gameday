import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { PlatformAccount, Credential } from '../../../../../db/schema';
import { createPlatformAccount, deletePlatformAccount, updatePlatformAccount } from '../../../../../lib/platform-account-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'telegram'];

export default async function PlatformAccountsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: accountsData }, { data: credsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('platform_accounts')
      .select('*')
      .eq('brand_id', params.id)
      .order('platform')
      .order('account_name'),
    db.from('credentials')
      .select('id, platform, account_identifier, credential_type')
      .eq('brand_id', params.id)
      .eq('status', 'active'),
  ]);

  if (!brandData) redirect('/brands');

  const accounts = (accountsData ?? []) as PlatformAccount[];
  const credentials = (credsData ?? []) as Pick<Credential, 'id' | 'platform' | 'account_identifier' | 'credential_type'>[];

  const createAction = createPlatformAccount.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Platform Accounts</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {brandData.name} · social accounts and pages
        </p>
        <p className="text-xs text-slate-600 mt-2">
          Accounts are linked to manually-entered credentials. There are no OAuth connect flows — obtain API tokens from each platform&apos;s developer portal and add them under <a href="credentials" className="text-indigo-500 hover:text-indigo-400">Credentials</a>.
        </p>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <p className="text-sm text-slate-500 mb-6">No accounts connected.</p>
      ) : (
        <div className="space-y-2 mb-8">
          {accounts.map((account) => {
            const linkedCred = credentials.find((c) => c.id === account.credential_id);
            const del = deletePlatformAccount.bind(null, params.id, account.id);
            return (
              <div
                key={account.id}
                className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-100">{account.account_name}</span>
                      <span className="text-xs text-slate-500 capitalize">{account.platform}</span>
                      {account.is_primary && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300 font-medium">Primary</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${account.is_active ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-500'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {account.account_handle && (
                      <p className="text-xs text-slate-500">@{account.account_handle}</p>
                    )}
                    {linkedCred && (
                      <p className="text-xs text-slate-600 mt-1">
                        Credential: {linkedCred.credential_type}
                        {linkedCred.account_identifier ? ` · ${linkedCred.account_identifier}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <form action={async (fd: FormData) => {
                      'use server';
                      fd.set('is_active', account.is_active ? 'false' : 'true');
                      await updatePlatformAccount(params.id, account.id, fd);
                    }}>
                      <button className="text-xs text-slate-400 hover:text-slate-200">
                        {account.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={del}>
                      <button className="text-xs text-red-500 hover:text-red-400">Remove</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add account form */}
      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Add account</h2>
        <form action={createAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Platform</label>
              <select
                name="platform"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Field label="Account name" name="account_name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Handle (optional)" name="account_handle" />
            <Field label="External account ID" name="external_account_id" />
          </div>
          {credentials.length > 0 && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Link credential (optional)</label>
              <select
                name="credential_id"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.platform} · {c.credential_type}{c.account_identifier ? ` · ${c.account_identifier}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_primary" value="true" id="is_primary" className="rounded" />
            <label htmlFor="is_primary" className="text-xs text-slate-400">Mark as primary account for this platform</label>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Add account
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type="text"
        required={required}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
