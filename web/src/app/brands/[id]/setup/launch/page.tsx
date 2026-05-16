import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { computeBrandReadiness } from '../../../../../lib/readiness';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

// ── Helpers ───────────────────────────────────────────────────────────

function CheckItem({
  pass,
  label,
  description,
  actionHref,
  actionLabel,
}: {
  pass: boolean;
  label: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
            pass
              ? 'bg-emerald-500 text-white'
              : 'border-2 border-slate-600'
          }`}
        >
          {pass ? '✓' : ''}
        </span>
        <div>
          <p className={`text-sm font-medium ${pass ? 'text-slate-300' : 'text-slate-200'}`}>
            {label}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      {!pass && actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {actionLabel ?? 'Fix →'}
        </Link>
      )}
    </li>
  );
}

function SignOffItem({ label, description }: { label: string; description: string }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0">
      <input
        type="checkbox"
        className="mt-0.5 shrink-0 w-4 h-4 rounded border-slate-600 bg-slate-800 accent-indigo-500 cursor-pointer"
      />
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function LaunchPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const ninetyDaysOut = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: brand }, readiness, { count: postCount }, { count: nonExpiringCredCount }] =
    await Promise.all([
      db.from('brands').select('id, name, is_demo').eq('id', params.id).maybeSingle(),
      computeBrandReadiness(params.id),
      db
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', params.id)
        .in('status', ['queued', 'scheduled', 'published']),
      db
        .from('credentials')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', params.id)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${ninetyDaysOut}`),
    ]);

  if (!brand) notFound();

  const { isReady, checks } = readiness;
  const base = `/brands/${brand.id}`;

  const hasPost = (postCount ?? 0) > 0;
  const hasNonExpiringCred = (nonExpiringCredCount ?? 0) > 0;
  const hasBudget = checks.usageBudgetSet.pass;

  const computedChecks = [
    {
      pass: isReady,
      label: 'All required readiness checks pass',
      description: 'Profile, voice, template, credential, and platform account checks all green.',
      actionHref: `${base}/setup/readiness`,
      actionLabel: 'View checklist →',
    },
    {
      pass: hasPost,
      label: 'At least one post queued, scheduled, or published',
      description:
        'Confirms the publishing flow has been exercised. A dry run or scheduled post satisfies this.',
      actionHref: `${base}/publishing/queue`,
      actionLabel: 'Go to queue →',
    },
    {
      pass: hasNonExpiringCred,
      label: 'Credentials verified and non-expiring',
      description:
        'At least one active credential that does not expire within 90 days.',
      actionHref: `${base}/settings/credentials`,
      actionLabel: 'Review credentials →',
    },
    {
      pass: hasBudget,
      label: 'Usage budget set',
      description: 'At least one active usage budget prevents runaway cost after launch.',
      actionHref: undefined,
      actionLabel: undefined,
    },
  ];

  const computedPassCount = computedChecks.filter((c) => c.pass).length;
  const allComputedPass = computedPassCount === computedChecks.length;

  return (
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
        <Link href={`${base}/setup`} className="hover:text-slate-300 transition-colors">
          ← Setup
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Launch checklist</h1>
          <p className="text-sm text-slate-400 mt-0.5">{brand.name}</p>
        </div>
        {allComputedPass ? (
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-emerald-900 text-emerald-300">
            Ready to launch
          </span>
        ) : (
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-slate-700 text-slate-400">
            {computedPassCount}/{computedChecks.length} checks pass
          </span>
        )}
      </div>

      {/* Demo notice */}
      {brand.is_demo && (
        <div className="mb-6 rounded-lg border border-amber-800 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          This is a demo brand. Credential and readiness checks are intentionally incomplete —
          this checklist is advisory only for demo tenants.
        </div>
      )}

      {/* Computed checks */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          System checks
        </h2>
        <ul className="bg-slate-800/50 rounded-xl px-4 divide-y divide-slate-800">
          {computedChecks.map((c) => (
            <CheckItem key={c.label} {...c} />
          ))}
        </ul>
      </section>

      {/* Manual sign-off */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Operator sign-off
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          Advisory only — these are not persisted. Check each item when confirmed.
        </p>
        <ul className="bg-slate-800/50 rounded-xl px-4 divide-y divide-slate-800">
          <SignOffItem
            label="Client has reviewed and approved voice and templates"
            description="The brand voice document and at least one template have been reviewed and signed off by the client."
          />
          <SignOffItem
            label="Operator confirmed — ready to go live"
            description="All system checks reviewed. Content pipeline tested. Client is briefed and ready."
          />
        </ul>
      </section>

      {/* Footer */}
      <div className="flex items-center gap-4">
        <Link
          href={`${base}/setup`}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Back to setup
        </Link>
        {!isReady && (
          <Link
            href={`${base}/setup/readiness`}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Fix readiness issues →
          </Link>
        )}
      </div>
    </div>
  );
}
