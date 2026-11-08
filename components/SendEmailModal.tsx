'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Proposal = { id: string; tender_name: string; content: string; created_at: string };

interface Props {
  proposal: Proposal | null;
  onClose: () => void;
}

type SmtpStatus = 'checking' | 'configured' | 'not_configured';

// ── Extract contact emails from proposal/tender content ───────────────────────
function extractEmails(text: string): string[] {
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(EMAIL_RE) || [];
  // Deduplicate and filter out common false-positives
  return [...new Set(matches)].filter(e =>
    !e.includes('example.com') &&
    !e.includes('test.com') &&
    !e.includes('email.com') &&
    !e.endsWith('.png') &&
    !e.endsWith('.jpg')
  );
}

// ── Build a professional covering email (not the raw proposal dump) ───────────
function buildEmailBody(tenderName: string, companyName: string): string {
  const company = companyName || 'our company';
  return `Dear Sir/Madam,

RE: ${tenderName}

We write with reference to the above tender and are pleased to submit our proposal in response to your requirements.

Please find attached our detailed proposal for your consideration. We believe ${company} is well-positioned to deliver the services/goods outlined in the tender notice, and we are committed to meeting your specifications with the highest standards of quality and professionalism.

We would welcome the opportunity to discuss our proposal further at your convenience.

Kindly acknowledge receipt of this submission.

Best regards,
${company}`;
}

export default function SendEmailModal({ proposal, onClose }: Props) {
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus>('checking');
  const [to, setTo]           = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  // ── SMTP quick-setup form ─────────────────────────────────────────────────
  const [setupProvider, setSetupProvider] = useState<'gmail' | 'smtp'>('gmail');
  const [setupHost, setSetupHost]         = useState('');
  const [setupPort, setSetupPort]         = useState('465');
  const [setupUser, setSetupUser]         = useState('');
  const [setupPass, setSetupPass]         = useState('');
  const [setupName, setSetupName]         = useState('');
  const [setupSecure, setSetupSecure]     = useState(true);
  const [savingSetup, setSavingSetup]     = useState(false);
  const [setupError, setSetupError]       = useState('');

  // ── Pre-fill fields when proposal changes ─────────────────────────────────
  useEffect(() => {
    if (!proposal) return;
    setResult(null);

    // Extract contact emails from proposal content
    const found = extractEmails(proposal.content);
    setDetectedEmails(found);
    setTo(found[0] || '');
    setSubject(`Proposal Submission: ${proposal.tender_name}`);

    // Load company name to personalise the body
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setBody(buildEmailBody(proposal.tender_name, '')); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .maybeSingle();
      setBody(buildEmailBody(proposal.tender_name, profile?.company_name || ''));
    };
    load();
  }, [proposal]);

  // ── Check SMTP config ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!proposal) return;
    const check = async () => {
      setSmtpStatus('checking');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSmtpStatus('not_configured'); return; }
      const { data } = await supabase
        .from('email_settings')
        .select('smtp_user,smtp_password')
        .eq('user_id', user.id)
        .maybeSingle();
      setSmtpStatus(data?.smtp_user && data?.smtp_password ? 'configured' : 'not_configured');
    };
    check();
  }, [proposal]);

  if (!proposal) return null;

  // ── Save SMTP from quick-setup ────────────────────────────────────────────
  const saveSetup = async () => {
    setSetupError('');
    if (!setupUser.trim() || !setupPass.trim()) { setSetupError('Email and password are required.'); return; }
    if (setupProvider === 'smtp' && !setupHost.trim()) { setSetupError('SMTP host is required.'); return; }
    setSavingSetup(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSetupError('Not authenticated.'); setSavingSetup(false); return; }
    const { error } = await supabase.from('email_settings').upsert({
      user_id:       user.id,
      provider:      setupProvider,
      smtp_host:     setupProvider === 'smtp' ? setupHost.trim() : 'smtp.gmail.com',
      smtp_port:     setupProvider === 'smtp' ? Number(setupPort) : 465,
      smtp_user:     setupUser.trim(),
      smtp_password: setupPass.trim(),
      smtp_secure:   setupProvider === 'smtp' ? setupSecure : true,
      sender_name:   setupName.trim() || setupUser.trim(),
    }, { onConflict: 'user_id' });
    setSavingSetup(false);
    if (error) { setSetupError(error.message); return; }
    setSmtpStatus('configured');
  };

  // ── Send the email ─────────────────────────────────────────────────────────
  const send = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setResult({ ok: false, msg: 'Please fill in all fields.' });
      return;
    }
    setSending(true);
    setResult(null);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      });
      const json = await res.json();
      setResult(json.success
        ? { ok: true, msg: `Email sent to ${json.to}` }
        : { ok: false, msg: json.error || 'Failed to send email.' }
      );
    } catch {
      setResult({ ok: false, msg: 'Network error. Please try again.' });
    }
    setSending(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
            </svg>
            <h2 className="text-sm font-bold text-gray-800">Send Proposal by Email</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Checking ── */}
          {smtpStatus === 'checking' && (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-gray-400">Checking email settings…</p>
            </div>
          )}

          {/* ── Not configured ── */}
          {smtpStatus === 'not_configured' && (
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Email not configured</p>
                  <p className="text-xs text-amber-700 mt-0.5">Add your SMTP or Gmail details below, or go to <Link href="/settings" className="underline font-medium">Settings → Email</Link>.</p>
                </div>
              </div>

              {/* Provider toggle */}
              <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                {(['gmail', 'smtp'] as const).map(p => (
                  <button key={p} onClick={() => setSetupProvider(p)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${setupProvider === p ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    {p === 'gmail' ? 'Gmail' : 'Custom SMTP'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {setupProvider === 'smtp' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">SMTP Host</label>
                      <input value={setupHost} onChange={e => setSetupHost(e.target.value)} placeholder="smtp.example.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="w-24">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Port</label>
                      <input value={setupPort} onChange={e => setSetupPort(e.target.value)} placeholder="465"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{setupProvider === 'gmail' ? 'Gmail Address' : 'SMTP Username / Email'}</label>
                  <input value={setupUser} onChange={e => setSetupUser(e.target.value)} placeholder="you@gmail.com" type="email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{setupProvider === 'gmail' ? 'App Password' : 'SMTP Password'}</label>
                  <input value={setupPass} onChange={e => setSetupPass(e.target.value)} placeholder="••••••••••••" type="password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {setupProvider === 'gmail' && (
                    <p className="text-[11px] text-gray-400 mt-1">Use a Gmail App Password, not your account password.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Display Name (optional)</label>
                  <input value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="Your Company Name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {setupError && <p className="text-xs text-red-500">{setupError}</p>}
              </div>
            </div>
          )}

          {/* ── Configured: compose form ── */}
          {smtpStatus === 'configured' && (
            <div className="px-5 py-5 space-y-4">

              {/* Tender pill */}
              <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Proposal for</p>
                <p className="text-sm font-semibold text-gray-800 line-clamp-2">{proposal.tender_name}</p>
              </div>

              {/* To */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">To</label>
                <input
                  value={to} onChange={e => setTo(e.target.value)}
                  placeholder="procurement@organization.com" type="email"
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {/* Detected email chips */}
                {detectedEmails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] text-blue-600 font-medium mb-1.5">
                      📧 Detected in tender notice — click to use:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedEmails.map(em => (
                        <button key={em} type="button" onClick={() => setTo(em)}
                          className={`px-2.5 py-0.5 text-xs rounded-full border font-medium transition ${
                            to === em
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                          }`}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Subject</label>
                <input
                  value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Message</label>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)} rows={10}
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* Result */}
              {result && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                  result.ok
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {result.ok ? '✓ ' : '✕ '}{result.msg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {result?.ok ? 'Close' : 'Cancel'}
          </button>

          {smtpStatus === 'not_configured' && (
            <button onClick={saveSetup} disabled={savingSetup}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">
              {savingSetup ? 'Saving…' : 'Save & Continue →'}
            </button>
          )}

          {smtpStatus === 'configured' && !result?.ok && (
            <button onClick={send} disabled={sending || !to.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">
              {sending ? (
                <>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  Sending…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send Email
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
