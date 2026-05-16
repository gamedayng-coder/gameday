import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { BrandVoice } from '../../../../db/schema';
import { upsertBrandVoice } from '../../../../lib/brand-voice-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const VOICE_FIELDS: { key: keyof BrandVoice; label: string; placeholder: string; rows: number }[] = [
  { key: 'tone',                       label: 'Tone',                         placeholder: 'Formal/casual, energetic/calm, professional/playful…',             rows: 2 },
  { key: 'style',                      label: 'Style',                        placeholder: 'Sentence length, vocabulary level, emoji use, punctuation prefs…', rows: 3 },
  { key: 'platform_guidelines',        label: 'Platform-specific guidelines', placeholder: 'How the voice adapts per channel (Instagram vs LinkedIn, etc.)…',  rows: 4 },
  { key: 'dos_and_donts',              label: "Dos & don'ts",                 placeholder: 'Specific phrases, words, or patterns to use or avoid…',            rows: 4 },
  { key: 'sample_copy',                label: 'Sample copy',                  placeholder: '2-3 example captions that embody the brand voice…',                rows: 5 },
  { key: 'competitor_differentiation', label: 'Competitor differentiation',   placeholder: 'How to sound distinct from key competitors…',                      rows: 3 },
];

export default async function BrandVoicePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: voiceData }] = await Promise.all([
    db.from('brands').select('id').eq('id', params.id).maybeSingle(),
    db.from('brand_voice').select('*').eq('brand_id', params.id).maybeSingle(),
  ]);

  if (!brandData) notFound();

  const voice = voiceData as BrandVoice | null;
  const upsertAction = upsertBrandVoice.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Brand voice</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tone, style, and writing guidelines used by agents during content generation.
        </p>
      </div>

      <form action={upsertAction} className="space-y-5">
        {VOICE_FIELDS.map(({ key, label, placeholder, rows }) => (
          <div key={key}>
            <label className="block text-xs text-slate-400 mb-1" htmlFor={key}>{label}</label>
            <textarea
              id={key}
              name={key}
              rows={rows}
              defaultValue={voice?.[key] ?? ''}
              placeholder={placeholder}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-500"
            />
          </div>
        ))}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Save voice
          </button>
        </div>
      </form>
    </div>
  );
}
