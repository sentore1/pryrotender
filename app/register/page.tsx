'use client';
import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason');
  const [step, setStep] = useState<'details' | 'payment'>(reason === 'subscription' ? 'payment' : 'details');
  const [plan, setPlan] = useState<'monthly' | 'annual'>(params.get('plan') === 'annual' ? 'annual' : 'monthly');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, company_name: company });
      setUserId(data.user.id);
      document.cookie = `sb-access-token=${data.session?.access_token}; path=/; max-age=3600`;
      setStep('payment');
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    setLoading(true); setError('');
    try {
      // For existing logged-in users renewing, get their session
      let resolvedUserId = userId;
      let resolvedEmail = email;
      if (!resolvedUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) { resolvedUserId = user.id; resolvedEmail = user.email || ''; }
      }
      const res = await fetch('/api/pesapal/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: resolvedEmail, userId: resolvedUserId }),
      });
      const data = await res.json();
      if (data.redirect_url) window.location.href = data.redirect_url;
      else setError(data.error || 'Payment initiation failed');
    } catch { setError('Failed to initiate payment'); }
    setLoading(false);
  };

  if (step === 'payment') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/"><Image src="/logo.png" alt="PryroTender" width={130} height={40} className="object-contain mx-auto" /></Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4">Choose your plan</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {reason === 'subscription' && <div className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm">You need an active subscription to access the platform.</div>}
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {(['monthly', 'annual'] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)}
                className={`p-4 rounded-xl border-2 text-left transition ${plan === p ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="text-xs font-semibold text-gray-500 capitalize mb-1">{p}</div>
                <div className="text-lg font-bold text-gray-900">{p === 'monthly' ? '$29' : '$249'}</div>
                <div className="text-xs text-gray-400">{p === 'monthly' ? '/month' : '/year · save $99'}</div>
              </button>
            ))}
          </div>
          <button onClick={handlePayment} disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
            {loading ? 'Redirecting...' : `Pay with Pesapal`}
          </button>

        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/"><Image src="/logo.png" alt="PryroTender" width={130} height={40} className="object-contain mx-auto" /></Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start finding and winning tenders today</p>
        </div>
        <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Company Name</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Company Ltd" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min. 6 characters" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
