'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRICES } from '@/lib/pricing';

// ─── MoMo config (defaults — overridden by DB settings) ─────────────────────
const MOMO_NUMBER_DEFAULT = '0789XXXXXX';
const MOMO_NAME_DEFAULT   = 'PryroTender';

type PaymentMethod = 'pesapal' | 'momo';

// ─── Inline upload step (shared by Pesapal + MoMo after payment) ─────────────
function ReferenceUpload({
  subscriptionId,
  userId,
  onDone,
}: {
  subscriptionId: string;
  userId: string;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError('');
    if (f && f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('Please choose a file first'); return; }
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('subscriptionId', subscriptionId);
      form.append('userId', userId);

      const res = await fetch('/api/payment-reference/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(onDone, 1800);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed — please try again');
    }
    setUploading(false);
  };

  if (done) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-800">Reference uploaded!</p>
        <p className="text-xs text-gray-500">Our team will verify your payment and activate your account shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <p className="font-semibold mb-1">Upload payment proof</p>
        <p>Take a screenshot of your payment confirmation and upload it here so we can verify and activate your account.</p>
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
      >
        {preview ? (
          <img src={preview} alt="preview" className="max-h-32 rounded-lg object-contain" />
        ) : (
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        )}
        <p className="text-xs text-gray-500">{file ? file.name : 'Click to choose screenshot or PDF'}</p>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 transition text-sm"
      >
        {uploading ? 'Uploading…' : 'Submit Payment Proof'}
      </button>

      <button onClick={onDone} className="w-full text-xs text-gray-400 hover:text-gray-600 transition py-1">
        Skip for now — I&apos;ll upload later
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason');

  const [step, setStep] = useState<'details' | 'verify-email' | 'payment' | 'momo-instructions' | 'upload-reference'>(() => {
    // After email verification, Supabase redirects back with step=payment in URL
    if (params.get('step') === 'payment') return 'payment';
    if (reason === 'subscription') return 'payment';
    return 'details';
  });
  const [plan, setPlan] = useState<'monthly' | 'annual'>(
    params.get('plan') === 'annual' ? 'annual' : 'monthly'
  );
  const [currency, setCurrency] = useState<'RWF' | 'USDT'>(
    (params.get('currency') || 'RWF') as 'RWF' | 'USDT'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pesapal');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');

  // MoMo settings loaded from DB
  const [momoEnabled, setMomoEnabled] = useState(true);
  const [momoNumber, setMomoNumber] = useState(MOMO_NUMBER_DEFAULT);
  const [momoName, setMomoName]     = useState(MOMO_NAME_DEFAULT);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setMomoEnabled(d.settings.momo_enabled !== 'false');
          setMomoNumber(d.settings.momo_number || MOMO_NUMBER_DEFAULT);
          setMomoName(d.settings.momo_name   || MOMO_NAME_DEFAULT);
        }
      })
      .catch(() => {}); // silent — defaults remain
  }, []);

  // When user returns from email confirmation link (step=payment in URL),
  // their session is set by Supabase automatically — pick up userId from it.
  useEffect(() => {
    if (params.get('step') === 'payment') {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUserId(data.user.id);
          setEmail(data.user.email || '');
        }
      });
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600`;
        }
      });
    }
  }, []);

  const planPrices = PRICES;
  const priceLabel = plan === 'monthly' ? planPrices[currency].monthly : planPrices[currency].annual;
  const periodLabel = plan === 'monthly' ? planPrices[currency].monthlySub : planPrices[currency].annualSub;

  // Resolve user id + email — always check the live session, never fail on missing state
  const resolveUser = async () => {
    // State is populated (normal registration flow or returning from email confirm)
    if (userId && email) return { id: userId, email };
    // Fallback: read from live Supabase session (covers race conditions + renewals)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Sync state so subsequent calls are instant
      setUserId(user.id);
      setEmail(user.email || '');
      return { id: user.id, email: user.email || '' };
    }
    return null;
  };

  // ── Step 1: Register ───────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    // Build the URL Supabase will redirect to after email confirmation.
    // Carries plan + currency so the payment step is pre-filled when the user returns.
    const confirmRedirect = `${window.location.origin}/register?step=payment&plan=${plan}&currency=${currency}`;

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmRedirect },
    });

    if (err) { setError(err.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, company_name: company });
      setUserId(data.user.id);
      if (data.session?.access_token) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600`;
      }

      // If Supabase returns a session immediately (email confirmation disabled),
      // go straight to payment. Otherwise show the verify-email holding screen.
      if (data.session) {
        setStep('payment');
      } else {
        setStep('verify-email');
      }
    }
    setLoading(false);
  };

  // ── Pesapal payment ────────────────────────────────────────────────────────
  const handlePesapal = async () => {
    setLoading(true); setError('');
    try {
      const user = await resolveUser();
      if (!user) {
        setError('Session expired — please sign in again.');
        setLoading(false);
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      const res = await fetch('/api/pesapal/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: user.email, userId: user.id, currency }),
      });
      const data = await res.json();
      if (data.redirect_url) {
        // Store subscriptionId so user can upload reference after returning
        if (data.subscriptionId) setSubscriptionId(data.subscriptionId);
        window.location.href = data.redirect_url;
      } else {
        setError(data.error || 'Payment initiation failed');
      }
    } catch { setError('Failed to initiate payment'); }
    setLoading(false);
  };

  // ── MoMo payment ───────────────────────────────────────────────────────────
  const handleMomo = async () => {
    setLoading(true); setError('');
    try {
      const user = await resolveUser();
      if (!user) {
        setError('Session expired — please sign in again.');
        setLoading(false);
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      const res = await fetch('/api/momo/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId: user.id, currency }),
      });
      const data = await res.json();
      if (data.subscriptionId) {
        setSubscriptionId(data.subscriptionId);
        setStep('momo-instructions');
      } else {
        setError(data.error || 'Failed to initiate MoMo payment');
      }
    } catch { setError('Failed to initiate MoMo payment'); }
    setLoading(false);
  };

  const handleProceedPay = () => {
    if (paymentMethod === 'momo') handleMomo();
    else handlePesapal();
  };

  // ── Redirect to dashboard after upload ────────────────────────────────────
  const handleDone = () => router.push('/dashboard?payment=pending');

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Verify email (waiting for confirmation click)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'verify-email') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 space-y-5">
            {/* Logo + icon on same row */}
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
                </svg>
              </div>
              <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain" /></Link>
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-500 mt-2">
                We sent a confirmation link to <strong className="text-gray-800">{email}</strong>.
                Click it to verify your account — you&apos;ll be brought straight to the payment step.
              </p>
            </div>

            {/* Selected plan reminder */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Your selected plan</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 capitalize">{plan} plan</p>
                  <p className="text-xs text-gray-500">{planPrices[currency][plan === 'monthly' ? 'monthly' : 'annual']} {planPrices[currency][plan === 'monthly' ? 'monthlySub' : 'annualSub']}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${plan === 'annual' ? 'bg-gray-900 text-white' : 'bg-gray-900 text-white'}`}>
                  {plan}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Didn&apos;t get the email? Check your spam folder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: MoMo instructions
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'momo-instructions') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-5">
            <div className="text-center">
              <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain mx-auto" /></Link>
              <h1 className="text-lg font-bold text-gray-900 mt-3">Send Money via MoMo</h1>
            </div>

            {/* MoMo send instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Payment Instructions</p>
              <ol className="text-sm text-yellow-900 space-y-2 list-decimal list-inside">
                <li>Open your Mobile Money app</li>
                <li>Select <strong>Send Money</strong></li>
                <li>
                  Enter number: <span className="font-mono font-bold text-yellow-900 bg-yellow-100 px-1.5 py-0.5 rounded">{momoNumber}</span>
                </li>
                <li>
                  Name: <strong>{momoName}</strong>
                </li>
                <li>
                  Amount: <strong>{priceLabel}</strong> <span className="text-yellow-700">({plan})</span>
                </li>
                <li>Use your email as the reference/note</li>
                <li>Confirm and complete the payment</li>
              </ol>
            </div>

            {/* Amount summary */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 capitalize">{plan} plan</p>
                <p className="text-xl font-bold text-gray-900">{priceLabel}</p>
                <p className="text-xs text-gray-400">{periodLabel}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-xl">📱</span>
              </div>
            </div>

            <button
              onClick={() => setStep('upload-reference')}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition text-sm"
            >
              I&apos;ve sent the money → Upload Proof
            </button>

            <button
              onClick={() => setStep('payment')}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition py-1 text-center"
            >
              ← Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Upload reference (for MoMo and Pesapal manual)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'upload-reference') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-4">
            <div className="text-center">
              <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain mx-auto" /></Link>
              <h1 className="text-lg font-bold text-gray-900 mt-3">Upload Payment Proof</h1>
            </div>
            <ReferenceUpload
              subscriptionId={subscriptionId}
              userId={userId}
              onDone={handleDone}
            />
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Payment method selection
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'payment') return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-5">
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

          {/* Currency toggle */}
          <div className="flex bg-gray-100 p-0.5 gap-0.5 w-fit mx-auto rounded">
            {(['RWF', 'USDT'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 text-xs font-semibold rounded transition-all ${
                  currency === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-3">
            {(['monthly', 'annual'] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)}
                className={`p-4 rounded border-2 text-left transition-all ${
                  plan === p ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white hover:border-gray-400'
                }`}>
                <div className={`text-xs font-semibold capitalize mb-1 ${plan === p ? 'text-blue-100' : 'text-gray-500'}`}>{p}</div>
                <div className={`text-lg font-bold ${plan === p ? 'text-white' : 'text-gray-900'}`}>
                  {planPrices[currency][p === 'monthly' ? 'monthly' : 'annual']}
                </div>
                <div className={`text-xs ${plan === p ? 'text-blue-200' : 'text-gray-400'}`}>
                  {planPrices[currency][p === 'monthly' ? 'monthlySub' : 'annualSub']}
                </div>
              </button>
            ))}
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Payment method</p>
            <div className={`grid gap-2 ${momoEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button
                onClick={() => setPaymentMethod('pesapal')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded border transition-all ${
                  paymentMethod === 'pesapal'
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                <svg className={`w-4 h-4 shrink-0 ${paymentMethod === 'pesapal' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                </svg>
                <div className="text-left">
                  <p className={`text-xs font-bold leading-none ${paymentMethod === 'pesapal' ? 'text-white' : 'text-gray-800'}`}>Pesapal</p>
                  <p className={`text-[10px] mt-0.5 ${paymentMethod === 'pesapal' ? 'text-blue-200' : 'text-gray-400'}`}>Card / mobile</p>
                </div>
              </button>
              {momoEnabled && (
                <button
                  onClick={() => setPaymentMethod('momo')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded border transition-all ${
                    paymentMethod === 'momo'
                      ? 'border-gray-900 bg-gray-900'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <svg className={`w-4 h-4 shrink-0 ${paymentMethod === 'momo' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
                  </svg>
                  <div className="text-left">
                    <p className={`text-xs font-bold leading-none ${paymentMethod === 'momo' ? 'text-white' : 'text-gray-800'}`}>MoMo</p>
                    <p className={`text-[10px] mt-0.5 ${paymentMethod === 'momo' ? 'text-gray-400' : 'text-gray-400'}`}>Send money</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleProceedPay}
            disabled={loading}
            className={`w-full py-3 font-bold rounded transition text-sm tracking-wide disabled:opacity-50 ${
              paymentMethod === 'momo' && momoEnabled
                ? 'bg-gray-900 hover:bg-gray-800 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {loading
              ? (paymentMethod === 'momo' && momoEnabled) ? 'Setting up…' : 'Redirecting…'
              : (paymentMethod === 'momo' && momoEnabled) ? `Pay ${priceLabel} with MoMo →` : `Pay ${priceLabel} with Pesapal →`
            }
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: Account details
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleRegister} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="mb-2">
            <Link href="/"><Image src="/logo.png" alt="PryroTender" width={70} height={22} className="object-contain" /></Link>
            <h1 className="text-lg font-bold text-gray-900 mt-3">Create your account</h1>
            <p className="text-xs text-gray-500 mt-0.5">Start finding and winning tenders today</p>
          </div>

          {/* Selected plan reminder */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Selected plan</p>
              <p className="text-xl font-bold text-gray-900 capitalize">
                {plan} · {planPrices[currency][plan === 'monthly' ? 'monthly' : 'annual']}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('payment')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Change
            </button>
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
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
