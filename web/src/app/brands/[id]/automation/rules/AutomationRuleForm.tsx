'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TRIGGER_TYPES,
  TRIGGER_DESCRIPTIONS,
  type TriggerType,
} from '../../../../../lib/automation-rule-constants';

interface Template {
  id: string;
  name: string;
  template_type: string;
}

interface Competition {
  id: string;
  name: string;
  season_label: string | null;
}

interface ExistingConfig {
  hours_before_kickoff?: number;
  lookback_hours?: number;
  competition_id?: string;
  output_content_type?: string;
}

interface Props {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  templates: Template[];
  competitions?: Competition[];
  defaultValues?: {
    name?: string;
    triggerType?: TriggerType;
    templateId?: string | null;
    config?: ExistingConfig;
  };
  cancelHref: string;
}

const OUTPUT_DEFAULTS: Record<TriggerType, string> = {
  fixture_scheduled: 'match_preview',
  fixture_completed: 'match_result',
  standings_updated: 'standings_update',
};

export default function AutomationRuleForm({
  action,
  submitLabel,
  templates,
  competitions = [],
  defaultValues = {},
  cancelHref,
}: Props) {
  const [triggerType, setTriggerType] = useState<TriggerType | ''>(
    defaultValues.triggerType ?? '',
  );

  const cfg = defaultValues.config ?? {};

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="text-xs text-slate-400 block mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name ?? ''}
          placeholder="e.g. Full-time result post"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">
          Trigger type <span className="text-red-400">*</span>
        </label>
        <select
          name="trigger_type"
          required
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as TriggerType | '')}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— select trigger —</option>
          {TRIGGER_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {triggerType && (
          <p className="text-xs text-slate-600 mt-1">{TRIGGER_DESCRIPTIONS[triggerType]}</p>
        )}
      </div>

      {triggerType && (
        <div className="border border-slate-700 rounded-lg px-4 py-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Trigger config
          </p>

          {triggerType === 'fixture_scheduled' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Hours before kickoff</label>
              <input
                name="config_hours_before_kickoff"
                type="number"
                min="0"
                placeholder="24"
                defaultValue={cfg.hours_before_kickoff ?? ''}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {triggerType === 'standings_updated' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Lookback hours</label>
              <input
                name="config_lookback_hours"
                type="number"
                min="1"
                placeholder="24"
                defaultValue={cfg.lookback_hours ?? ''}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Competition <span className="text-slate-600">(optional — leave blank for all)</span>
            </label>
            {competitions.length > 0 ? (
              <select
                name="config_competition_id"
                defaultValue={cfg.competition_id ?? ''}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— all competitions —</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.season_label ? ` (${c.season_label})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="config_competition_id"
                type="text"
                placeholder="Competition UUID (no competitions synced yet)"
                defaultValue={cfg.competition_id ?? ''}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Output content type</label>
            <input
              name="config_output_content_type"
              type="text"
              placeholder={OUTPUT_DEFAULTS[triggerType]}
              defaultValue={cfg.output_content_type ?? ''}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 block mb-1">Template</label>
          <select
            name="template_id"
            defaultValue={defaultValues.templateId ?? ''}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— none —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.template_type})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="text-sm text-slate-500 hover:text-slate-300 px-5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
