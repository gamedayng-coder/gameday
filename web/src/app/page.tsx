import { redirect } from 'next/navigation';

// All navigation is brand-scoped. Redirect to brand selection.
export default function RootPage() {
  redirect('/brands');
}
