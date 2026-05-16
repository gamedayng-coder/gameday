import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { BrandStaffContact } from '../../../../db/schema';
import {
  createContact,
  deleteContact,
} from '../../../../lib/brand-contact-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function BrandContactsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: contactsData }] = await Promise.all([
    db.from('brands').select('id').eq('id', params.id).maybeSingle(),
    db.from('brand_staff_contacts')
      .select('*')
      .eq('brand_id', params.id)
      .order('name'),
  ]);

  if (!brandData) notFound();

  const contacts = (contactsData ?? []) as BrandStaffContact[];
  const createAction = createContact.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Staff contacts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Internal team contacts linked to this brand.
        </p>
      </div>

      {/* Contact list */}
      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500 mb-8">No contacts yet. Add one below.</p>
      ) : (
        <div className="space-y-3 mb-8">
          {contacts.map((contact) => {
            const deleteAction = deleteContact.bind(null, params.id, contact.id);
            return (
              <div key={contact.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-100">{contact.name}</span>
                    {contact.role && (
                      <span className="text-xs text-slate-500">{contact.role}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.notes && <span className="text-slate-500 italic">{contact.notes}</span>}
                  </div>
                </div>
                <form action={deleteAction} className="shrink-0">
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {/* Add contact form */}
      <div className="border border-slate-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Add contact</h2>
        <form action={createAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Full name"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="role">Role</label>
              <input
                id="role"
                name="role"
                type="text"
                placeholder="e.g. Marketing Manager"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1" htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+44 7700 000000"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any relevant context about this contact…"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Add contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
