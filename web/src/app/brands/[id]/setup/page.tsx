import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { computeBrandReadiness } from '../../../../lib/readiness';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function SetupPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const [{ data: brand }, readiness] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    computeBrandReadiness(params.id),
  ]);
  if (!brand) notFound();

  const { checks, isReady } = readiness;
  const base = `/brands/${brand.id}`;

  const stages = [
    {
      step: 1,
      label: 'Create',
      href: null,
      done: true,
      required: true,
    },
    {
      step: 2,
      label: 'Profile',
      href: `${base}/profile`,
      done: checks.profileComplete.pass,
      required: true,
      detail: `${checks.profileComplete.value}/5 fields`,
    },
    {
      step: 3,
      label: 'Voice',
      href: `${base}/voice`,
      done: checks.voiceConfigured.pass,
      required: true,
    },
    {
      step: 4,
      label: 'Templates',
      href: `${base}/knowledge/templates`,
      done: checks.templatePresent.pass,
      required: true,
      detail: checks.templatePresent.value > 0 ? `${checks.templatePresent.value} active` : undefined,
    },
    {
      step: 5,
      label: 'Integrations',
      href: `${base}/setup/integrations`,
      done: checks.credentialConnected.pass &&
        (checks.platformAccountActive === null || checks.platformAccountActive.pass),
      required: true,
    },
    {
      step: 6,
      label: 'Automation',
      href: `${base}/automation/rules`,
      done: checks.automationRulesActive.pass,
      required: false,
      optional: true,
    },
    {
      step: 7,
      label: 'Launch',
      href: isReady ? `${base}/setup/launch` : `${base}/setup/readiness`,
      done: isReady,
      required: true,
    },
  ];

  const requiredStages = stages.filter((s) => s.required);
  const completedRequired = requiredStages.filter((s) => s.done).length;
  const firstIncomplete = stages.find((s) => s.required && !s.done);
  const ctaHref = firstIncomplete?.href ?? `${base}/setup/launch`;

  return (
    <div className="p-8 max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-slate-100">Set up {brand.name}</h1>
          {isReady ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-900 text-emerald-300">
              Ready
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-900 text-amber-300">
              {completedRequired}/{requiredStages.length} required
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          {isReady
            ? 'This brand is go-live ready.'
            : 'Complete each required step to make this brand go-live ready.'}
        </p>
      </div>

      {/* Stage list */}
      <ol className="space-y-2 mb-8">
        {stages.map((stage) => (
          <li key={stage.step} className="flex items-center gap-4">
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                stage.done
                  ? 'bg-emerald-700 text-emerald-100'
                  : stage.required
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {stage.done ? '✓' : stage.step}
            </span>

            <div className="flex-1 flex items-center justify-between">
              <div>
                {stage.href ? (
                  <Link
                    href={stage.href}
                    className="text-sm font-medium text-slate-200 hover:text-indigo-400 transition-colors"
                  >
                    {stage.label}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-slate-200">{stage.label}</span>
                )}
                {stage.optional && (
                  <span className="ml-2 text-xs text-slate-500">optional</span>
                )}
              </div>
              {stage.detail && (
                <span className="text-xs text-slate-500">{stage.detail}</span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* CTA */}
      <div className="flex items-center gap-4">
        <Link
          href={ctaHref}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {isReady ? 'Go to launch checklist →' : 'Continue setup →'}
        </Link>
        {!isReady && (
          <Link
            href={`${base}/setup/readiness`}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            View checklist
          </Link>
        )}
        {isReady && (
          <Link
            href={`${base}/setup/readiness`}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Readiness detail
          </Link>
        )}
      </div>
    </div>
  );
}
