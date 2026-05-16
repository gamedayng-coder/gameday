import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { Credential, CredentialStatus, PlatformAccount, DataSource, DataSourceStatus } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

// ── Small shared primitives ────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  healthy,
  manageHref,
  addHref,
  addLabel,
}: {
  title: string;
  count: number;
  healthy: boolean;
  manageHref: string;
  addHref: string;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            count === 0
              ? 'bg-red-950 text-red-400'
              : healthy
              ? 'bg-emerald-900 text-emerald-300'
              : 'bg-amber-900 text-amber-300'
          }`}
        >
          {count === 0 ? 'None' : count}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={addHref}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {addLabel}
        </Link>
        <Link
          href={manageHref}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Manage →
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ message, actionHref, actionLabel }: { message: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl px-5 py-6 text-center border border-dashed border-slate-700">
      <p className="text-sm text-slate-400 mb-3">{message}</p>
      <Link
        href={actionHref}
        className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

// ── Credential status helpers ──────────────────────────────────────────

const CRED_STATUS_STYLE: Record<CredentialStatus, string> = {
  active:  'bg-emerald-900 text-emerald-300',
  expired: 'bg-red-900 text-red-400',
  revoked: 'bg-slate-700 text-slate-400',
};

function credIsHealthy(cred: Pick<Credential, 'status' | 'expires_at'>): boolean {
  if (cred.status !== 'active') return false;
  if (cred.expires_at && new Date(cred.expires_at) <= new Date()) return false;
  return true;
}

// ── Data-source status helpers ─────────────────────────────────────────

const DS_STATUS_STYLE: Record<DataSourceStatus, string> = {
  active:   'bg-emerald-900/50 text-emerald-300',
  draft:    'bg-slate-700 text-slate-400',
  paused:   'bg-amber-900/50 text-amber-300',
  error:    'bg-red-900/50 text-red-400',
  archived: 'bg-slate-800 text-slate-600',
};

// ── Page ──────────────────────────────────────────────────────────────

export default async function IntegrationsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const brandId = params.id;

  const [
    { data: brandData },
    { data: credsData },
    { data: accountsData },
    { data: sourcesData },
  ] = await Promise.all([
    db.from('brands').select('id, name').eq('id', brandId).maybeSingle(),
    db
      .from('credentials')
      .select('id, platform, credential_type, account_identifier, status, expires_at, last_verified_at, updated_at')
      .eq('brand_id', brandId)
      .order('platform')
      .order('status'),
    db
      .from('platform_accounts')
      .select('id, platform, account_name, account_handle, is_active, is_primary, credential_id')
      .eq('brand_id', brandId)
      .order('platform')
      .order('account_name'),
    db
      .from('data_sources')
      .select('id, name, provider, source_type, source_purpose, status, last_synced_at, is_primary')
      .eq('brand_id', brandId)
      .neq('status', 'archived')
      .order('status')
      .order('name'),
  ]);

  if (!brandData) notFound();

  const credentials = (credsData ?? []) as Pick<
    Credential,
    'id' | 'platform' | 'credential_type' | 'account_identifier' | 'status' | 'expires_at' | 'last_verified_at' | 'updated_at'
  >[];

  const accounts = (accountsData ?? []) as Pick<
    PlatformAccount,
    'id' | 'platform' | 'account_name' | 'account_handle' | 'is_active' | 'is_primary' | 'credential_id'
  >[];

  const sources = (sourcesData ?? []) as Pick<
    DataSource,
    'id' | 'name' | 'provider' | 'source_type' | 'source_purpose' | 'status' | 'last_synced_at' | 'is_primary'
  >[];

  const base = `/brands/${brandId}`;
  const activeCredCount = credentials.filter(credIsHealthy).length;
  const activeAccountCount = accounts.filter((a) => a.is_active).length;
  const activeSourceCount = sources.filter((s) => s.status === 'active').length;

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`${base}/setup`}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Setup
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-100">Integrations</h1>
        <p className="text-sm text-slate-400 mt-0.5">{brandData.name}</p>
      </div>

      {/* ── Panel 1: Credentials ─────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader
          title="Credentials"
          count={activeCredCount}
          healthy={activeCredCount > 0}
          manageHref={`${base}/settings/credentials`}
          addHref={`${base}/settings/credentials`}
          addLabel="+ Add credential"
        />

        {credentials.length === 0 ? (
          <EmptyState
            message="No credentials configured. Add at least one active credential before this brand can publish. Credentials are entered manually — obtain API keys from each platform's developer portal."
            actionHref={`${base}/settings/credentials`}
            actionLabel="Add credential →"
          />
        ) : (
          <ul className="space-y-2">
            {credentials.map((cred) => {
              const healthy = credIsHealthy(cred);
              const expired = cred.expires_at && new Date(cred.expires_at) <= new Date();
              return (
                <li
                  key={cred.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-200 capitalize">{cred.platform}</span>
                      <span className="text-xs text-slate-500">{cred.credential_type}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${CRED_STATUS_STYLE[cred.status]}`}>
                        {cred.status}
                      </span>
                    </div>
                    {cred.account_identifier && (
                      <p className="text-xs text-slate-500 truncate">{cred.account_identifier}</p>
                    )}
                    {expired && (
                      <p className="text-xs text-red-400 mt-0.5">
                        Expired {new Date(cred.expires_at!).toLocaleDateString()} — renew to re-activate
                      </p>
                    )}
                  </div>
                  {!healthy && (
                    <Link
                      href={`${base}/settings/credentials`}
                      className="flex-shrink-0 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Fix →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {credentials.length > 0 && activeCredCount === 0 && (
          <p className="text-xs text-red-400 mt-3">
            No active credentials — renew or replace an expired/revoked credential before publishing.
          </p>
        )}
      </section>

      {/* ── Panel 2: Platform Accounts ────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader
          title="Platform accounts"
          count={activeAccountCount}
          healthy={activeAccountCount > 0}
          manageHref={`${base}/settings/accounts`}
          addHref={`${base}/settings/accounts`}
          addLabel="+ Add account"
        />

        {accounts.length === 0 ? (
          <EmptyState
            message="No platform accounts configured. Add at least one active account to enable publishing."
            actionHref={`${base}/settings/accounts`}
            actionLabel="Add account →"
          />
        ) : (
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-slate-200">{account.account_name}</span>
                    <span className="text-xs text-slate-500 capitalize">{account.platform}</span>
                    {account.is_primary && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300">Primary</span>
                    )}
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        account.is_active ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {account.account_handle && (
                    <p className="text-xs text-slate-500">@{account.account_handle}</p>
                  )}
                  {!account.credential_id && account.is_active && (
                    <p className="text-xs text-amber-400 mt-0.5">No credential linked</p>
                  )}
                </div>
                {!account.is_active && (
                  <Link
                    href={`${base}/settings/accounts`}
                    className="flex-shrink-0 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Activate →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        {accounts.length > 0 && activeAccountCount === 0 && (
          <p className="text-xs text-amber-400 mt-3">
            All accounts are inactive — activate at least one to enable publishing.
          </p>
        )}
      </section>

      {/* ── Panel 3: Data Sources ─────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Data sources"
          count={sources.length}
          healthy={activeSourceCount > 0}
          manageHref={`${base}/data-sources`}
          addHref={`${base}/data-sources/new`}
          addLabel="+ Add source"
        />

        {sources.length === 0 ? (
          <EmptyState
            message="No data sources configured. Data sources are recommended if this brand uses automated or data-driven content (e.g. sports fixtures)."
            actionHref={`${base}/data-sources/new`}
            actionLabel="Add data source →"
          />
        ) : (
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.id}>
                <Link
                  href={`${base}/data-sources/${source.id}`}
                  className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${DS_STATUS_STYLE[source.status as DataSourceStatus]}`}
                        >
                          {source.status}
                        </span>
                        <span className="text-xs text-slate-500">{source.provider}</span>
                        {source.is_primary && (
                          <span className="text-xs text-indigo-400">primary</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-200 truncate">{source.name}</p>
                      {source.source_purpose && (
                        <p className="text-xs text-slate-500 mt-0.5">{source.source_purpose}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {source.last_synced_at ? (
                        <p className="text-xs text-slate-600">
                          synced {new Date(source.last_synced_at).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-700">never synced</p>
                      )}
                    </div>
                  </div>
                  {source.status === 'error' && (
                    <p className="text-xs text-red-400 mt-1.5">Sync error — check source configuration</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
