import { redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { Credential } from '../../../../../db/schema';
import { upsertCredential, deleteCredential } from '../../../../../lib/credential-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'telegram'];
const CREDENTIAL_TYPES = ['oauth_token', 'api_key', 'page_token', 'app_secret'];

export default async function CredentialsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: credsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('credentials')
      .select('id, platform, credential_type, account_identifier, status, expires_at, last_verified_at, created_at, updated_at')
      .eq('brand_id', params.id)
      .order('platform')
      .order('credential_type'),
  ]);

  if (!brandData) redirect('/brands');

  // Omit secret_ref and metadata — no raw secrets in UI
  const credentials = (credsData ?? []) as Omit<Credential, 'secret_ref' | 'metadata' | 'brand_id'>[];

  const upsert = upsertCredential.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Credentials</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {brandData.name} · API credentials and access tokens
        </p>
        <p className="text-xs text-slate-600 mt-2">
          Credentials are entered manually — there are no OAuth connect flows. Obtain API keys and access tokens from each platform&apos;s developer portal and enter them below.
        </p>
      </div>

      {/* Credential list — read-only meta display, no raw values shown */}
      {credentials.length === 0 ? (
        <p className="text-sm text-slate-500 mb-6">No credentials configured.</p>
      ) : (
        <div className="space-y-2 mb-8">
          {credentials.map((cred) => {
            const del = deleteCredential.bind(null, params.id, cred.id);
            return (
              <div
                key={cred.id}
                className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-100 capitalize">{cred.platform}</span>
                      <span className="text-xs text-slate-500">{cred.credential_type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        cred.status === 'active' ? 'bg-green-900 text-green-300' :
                        cred.status === 'expired' ? 'bg-red-900 text-red-300' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {cred.status}
                      </span>
                    </div>
                    {cred.account_identifier && (
                      <p className="text-xs text-slate-500">{cred.account_identifier}</p>
                    )}
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-slate-600">
                        Updated {new Date(cred.updated_at).toLocaleDateString()}
                      </span>
                      {cred.last_verified_at && (
                        <span className="text-xs text-slate-600">
                          Verified {new Date(cred.last_verified_at).toLocaleDateString()}
                        </span>
                      )}
                      {cred.expires_at && (
                        <span className={`text-xs ${new Date(cred.expires_at) < new Date() ? 'text-red-400' : 'text-slate-600'}`}>
                          Expires {new Date(cred.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <form action={del}>
                    <button className="text-xs text-red-500 hover:text-red-400">Remove</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / update credential */}
      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-1">Add or update credential</h2>
        <p className="text-xs text-slate-500 mb-4">
          Raw secrets are not stored in the database. Provide a reference pointer (e.g. vault key, secret name) in the secret ref field.
        </p>
        <form action={upsert} className="space-y-3">
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
            <div>
              <label className="text-xs text-slate-400 block mb-1">Credential type</label>
              <select
                name="credential_type"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CREDENTIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Field label="Account identifier (optional)" name="account_identifier" placeholder="e.g. page ID or username" />
          <Field label="Secret ref" name="secret_ref" placeholder="e.g. vault://secrets/fb-page-token" />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Save credential
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
      />
    </div>
  );
}
