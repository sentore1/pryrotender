'use client';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the token in the URL hash; calling getSession picks it up automatically
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setError('Invalid or expired reset link. Please request a new one.');
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    alert('Password updated successfully!');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/"><Image src="/logo.png" alt="PryroTender" width={130} height={40} className="object-contain mx-auto" /></Link>
          <h1 className="text-xl font-bold text-gray-900 mt-4">Set new password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your new password below</p>
        </div>
        <form onSubmit={handleReset} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={!ready}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={!ready}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading || !ready}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
