'use client';

import { BrandKnowledgeItem } from '../../../../db/schema';

interface Props {
  item?: BrandKnowledgeItem | null;
  submitAction: (formData: FormData) => Promise<void>;
  submitLabel: string;
}

export default function KnowledgeItemForm({ item, submitAction, submitLabel }: Props) {
  const inputClass =
    'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500';

  return (
    <form action={submitAction} className="space-y-5">
      <div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={item?.title ?? ''}
          placeholder="e.g. Brand origin story"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="body">Content</label>
        <textarea
          id="body"
          name="body"
          rows={10}
          required
          defaultValue={item?.body ?? ''}
          placeholder="Enter the knowledge content…"
          className={`${inputClass} resize-y`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="category">Category</label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={item?.category ?? 'general'}
            placeholder="general"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1" htmlFor="tags">
            Tags <span className="text-slate-600">comma-separated</span>
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={item?.tags.join(', ') ?? ''}
            placeholder="history, values, origin"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1" htmlFor="source">Source</label>
        <input
          id="source"
          name="source"
          type="text"
          defaultValue={item?.source ?? ''}
          placeholder="URL or document reference (optional)"
          className={inputClass}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
