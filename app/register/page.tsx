'use client';
import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRICES } from '@/lib/pricing';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason');
  const [step, setStep] = useState<'details' | 'payment'>(reason === 'subscription' ? 'payment' : 'details');
  const [plan, setPlan] = useState<'monthly' | 'annual'>(params.get('plan') === 'annual' ? 'annual' : 'monthly');
  const currency = (params.get('currency') || 'RWF') as 'RWF' | 'USDT';
  const planPrices = PRICES;
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
        body: JSON.stringify({ plan, email: resolvedEmail, userId: resolvedUserId, currency }),
      });
      const data = await res.json();
      if (data.redirect_url) window.location.href = data.redirect_url;
      else setError(data.error || 'Payment initiation failed');
    } catch { setError('Failed to initiate payment'); }
    setLoading(false);
  };

  if (step === 'payment') return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-5">
          <div className="text-center mb-1">
            <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain mx-auto" /></Link>
            <h1 className="text-lg font-bold text-gray-900 mt-3">Choose your plan</h1>
          </div>
          {reason === 'subscription' && (
            <p className="text-sm text-red-500 font-medium text-center">
              You need an active subscription to access the platform.
            </p>
          )}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            {(['monthly', 'annual'] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  plan === p
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}>
                <div className={`text-xs font-semibold capitalize mb-1 ${plan === p ? 'text-blue-100' : 'text-gray-500'}`}>{p}</div>
                <div className={`text-lg font-bold ${plan === p ? 'text-white' : 'text-gray-900'}`}>
                  {p === 'monthly' ? planPrices[currency].monthly : planPrices[currency].annual}
                </div>
                <div className={`text-xs ${plan === p ? 'text-blue-200' : 'text-gray-400'}`}>
                  {p === 'monthly' ? planPrices[currency].monthlySub : planPrices[currency].annualSub}
                </div>
              </button>
            ))}
          </div>
          <button onClick={handlePayment} disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 transition text-sm tracking-wide">
            {loading ? 'Redirecting...' : 'Pay with Pesapal'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="text-center mb-2">
            <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain mx-auto" /></Link>
            <h1 className="text-lg font-bold text-gray-900 mt-3">Create your account</h1>
            <p className="text-xs text-gray-500 mt-0.5">Start finding and winning tenders today</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Company Name</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              placeholder="Your Company Ltd" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              placeholder="you@company.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
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
