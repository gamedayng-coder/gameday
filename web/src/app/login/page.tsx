import { redirect } from 'next/navigation';
import { getUser } from '../../lib/supabase/server';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect('/');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">BrandPost</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
