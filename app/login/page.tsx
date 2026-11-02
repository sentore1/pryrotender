'use client';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get('plan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Clear any stale token so middleware doesn't redirect away before we log in
  useEffect(() => { document.cookie = 'sb-access-token=; path=/; max-age=0'; }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    document.cookie = `sb-access-token=${data.session?.access_token}; path=/; max-age=604800`;
    if (plan) {
      router.push(`/register?reason=subscription&plan=${plan}`);
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role, subscription_status').eq('id', data.user!.id).single();
    if (profile?.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="bg-white rounded shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="mb-2">
            <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain" /></Link>
            <h1 className="text-lg font-bold text-gray-900 mt-3">Welcome back</h1>
            <p className="text-xs text-gray-500 mt-0.5">Sign in to your account</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {resetSent && <p className="text-sm text-green-600">Reset link sent! Check your email inbox.</p>}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              placeholder="you@company.com" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Password</label>
              <button type="button" onClick={async () => {
                if (!email) { setError('Enter your email first'); return; }
                const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                if (resetErr) { setError(resetErr.message); return; }
                setError('');
                setResetSent(true);
              }} className="text-xs text-blue-600 hover:underline">Forgot password?</button>
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account? <Link href={`/register${plan ? `?plan=${plan}` : ''}`} className="text-blue-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
