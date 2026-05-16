'use client';

import { useState } from 'react';
import { Brand, BrandProfile } from '../../../../db/schema';

type ProfileField = {
  key: keyof BrandProfile | 'name';
  label: string;
  placeholder: string;
  rows: number;
};

const PROFILE_FIELDS: ProfileField[] = [
  { key: 'name',                label: 'Brand name',              placeholder: "The brand's display name",                               rows: 1 },
  { key: 'industry',            label: 'Industry',                placeholder: 'e.g. Sports, Retail, Hospitality…',                      rows: 1 },
  { key: 'website',             label: 'Website',                 placeholder: 'https://…',                                              rows: 1 },
  { key: 'brand_story',         label: 'Brand story / background', placeholder: 'Origin, history, mission — the "why" behind the brand…', rows: 4 },
  { key: 'core_values',         label: 'Core values',             placeholder: 'What the brand stands for…',                             rows: 3 },
  { key: 'key_differentiators', label: 'Key differentiators',     placeholder: 'What sets this brand apart from competitors (USPs)…',    rows: 3 },
  { key: 'target_audience',     label: 'Target audience',         placeholder: 'Who the content is for — demographics, interests…',      rows: 3 },
  { key: 'content_themes',      label: 'Content themes',          placeholder: 'Recurring topics and categories to cover…',              rows: 3 },
  { key: 'objectives',          label: 'Objectives / goals',      placeholder: 'What to achieve with content…',                          rows: 3 },
  { key: 'tone_of_voice',       label: 'Tone of voice summary',   placeholder: 'Formal/casual, energetic/calm — one-line summary…',      rows: 2 },
  { key: 'competitors',         label: 'Competitors',             placeholder: 'Brands to monitor or differentiate from…',               rows: 2 },
  { key: 'products_services',   label: 'Products & services',     placeholder: 'What to promote or reference…',                          rows: 3 },
  { key: 'dislikes',            label: "Do / Don't guidelines",   placeholder: 'Topics, tones, formats, or words to avoid…',             rows: 3 },
];

type FieldKey = ProfileField['key'];
type Values = Partial<Record<FieldKey, string>>;

interface Props {
  brandName: string;
  // COMPAT: profile may be null when brand_profiles row does not yet exist.
  // Remove compat seed after data migration from brands → brand_profiles is confirmed complete.
  profile: BrandProfile | null;
  brandFallback: Pick<Brand,
    'core_values' | 'content_themes' | 'objectives' | 'dislikes' | 'tone_of_voice' |
    'competitors' | 'products_services' | 'target_audience' | 'key_differentiators' | 'brand_story'
  > | null;
  updateAction: (formData: FormData) => Promise<void>;
}

function seed(profile: BrandProfile | null, brand: Props['brandFallback'], key: FieldKey): string {
  if (profile) {
    const v = profile[key as keyof BrandProfile];
    return typeof v === 'string' ? v : '';
  }
  // COMPAT: fall back to brands inline field when no brand_profiles row exists.
  if (brand && key in brand) {
    const v = brand[key as keyof typeof brand];
    return typeof v === 'string' ? v : '';
  }
  return '';
}

export default function ProfileForm({ brandName, profile, brandFallback, updateAction }: Props) {
  const [values, setValues] = useState<Values>(() => {
    const init: Values = { name: brandName };
    for (const { key } of PROFILE_FIELDS) {
      if (key !== 'name') {
        init[key] = seed(profile, brandFallback, key);
      }
    }
    // Social handles as pretty JSON string
    if (profile?.social_handles && Object.keys(profile.social_handles).length > 0) {
      init['social_handles' as FieldKey] = JSON.stringify(profile.social_handles, null, 2);
    }
    return init;
  });

  const inputClass =
    'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500';

  function set(key: FieldKey, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <form action={updateAction} className="space-y-5">
      {PROFILE_FIELDS.map(({ key, label, placeholder, rows }) => (
        <div key={key}>
          <label className="block text-xs text-slate-400 mb-1" htmlFor={key}>{label}</label>
          {rows === 1 ? (
            <input
              id={key}
              name={key}
              type={key === 'website' ? 'url' : 'text'}
              value={values[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              required={key === 'name'}
              placeholder={placeholder}
              className={inputClass}
            />
          ) : (
            <textarea
              id={key}
              name={key}
              rows={rows}
              value={values[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className={`${inputClass} resize-y`}
            />
          )}
        </div>
      ))}

      <div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="social_handles">
          Social handles
          <span className="ml-2 text-slate-600">JSON — e.g. {'{"instagram":"@brand","twitter":"@brand"}'}</span>
        </label>
        <textarea
          id="social_handles"
          name="social_handles"
          rows={3}
          value={values['social_handles' as FieldKey] ?? ''}
          onChange={(e) => set('social_handles' as FieldKey, e.target.value)}
          placeholder={'{"instagram": "@handle", "twitter": "@handle"}'}
          className={`${inputClass} resize-y font-mono text-xs`}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          Save profile
        </button>
      </div>
    </form>
  );
}
