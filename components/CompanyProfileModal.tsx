'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type ProfileData = {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  company_ref_prefix?: string;
  logo_url?: string;
  signature_url?: string;
  company_bio?: string;
  required_documents?: string[];
  former_clients?: { name: string; project: string }[];
};

type Props = {
  open: boolean;
  userId: string;
  initialProfile: ProfileData;
  /** Fields that are empty/missing — shown with a highlight */
  missingFields: string[];
  onClose: () => void;
  /** Called after a successful save; receives the updated profile */
  onSaved: (updated: ProfileData) => void;
};

export default function CompanyProfileModal({ open, userId, initialProfile, missingFields, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'company' | 'proposal'>('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Company tab state ──────────────────────────────────────────────────────
  const [company, setCompany] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    company_ref_prefix: '',
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [sigUrl, setSigUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);

  // ── Proposal tab state ─────────────────────────────────────────────────────
  const [bio, setBio] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');
  const [formerClients, setFormerClients] = useState<{ name: string; project: string }[]>([]);
  const [clientInput, setClientInput] = useState({ name: '', project: '' });

  const isMissing = (field: string) => missingFields.includes(field);

  // Sync state when the modal opens with fresh profile data
  useEffect(() => {
    if (!open) return;
    setCompany({
      company_name: initialProfile.company_name || '',
      company_address: initialProfile.company_address || '',
      company_phone: initialProfile.company_phone || '',
      company_email: initialProfile.company_email || '',
      company_website: initialProfile.company_website || '',
      company_ref_prefix: initialProfile.company_ref_prefix || '',
    });
    setLogoUrl(initialProfile.logo_url || '');
    setSigUrl(initialProfile.signature_url || '');
    setLogoFile(null);
    setSigFile(null);
    setBio(initialProfile.company_bio || '');
    setRequiredDocs(initialProfile.required_documents || []);
    setFormerClients(initialProfile.former_clients || []);
    setDocInput('');
    setClientInput({ name: '', project: '' });
    setSaved(false);
    // Auto-open the tab that has the most missing fields
    const proposalMissing = ['company_bio', 'required_documents', 'former_clients'].some(f => missingFields.includes(f));
    const companyMissing = ['company_name', 'company_address', 'company_phone', 'company_email', 'company_website', 'company_ref_prefix'].some(f => missingFields.includes(f));
    setTab(companyMissing || !proposalMissing ? 'company' : 'proposal');
  }, [open, initialProfile]);

  const uploadFile = async (file: File, path: string) => {
    const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: url } = supabase.storage.from('company-assets').getPublicUrl(path);
    return url.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logo = logoUrl;
      let sig = sigUrl;
      if (logoFile) logo = await uploadFile(logoFile, `${userId}/logo`);
      if (sigFile) sig = await uploadFile(sigFile, `${userId}/signature`);

      const updates: ProfileData = {
        ...company,
        logo_url: logo,
        signature_url: sig,
        company_bio: bio,
        required_documents: requiredDocs,
        former_clients: formerClients,
      };

      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved(updates);
    } catch (e: any) {
      alert(e.message?.includes('Bucket') ? 'Storage bucket not found — images not saved, but text data was.' : (e.message || 'Save failed.'));
    }
    setSaving(false);
  };

  if (!open) return null;

  const companyFields: [keyof typeof company, string][] = [
    ['company_name', 'Company Name'],
    ['company_address', 'Address'],
    ['company_phone', 'Phone'],
    ['company_email', 'Email'],
    ['company_website', 'Website'],
    ['company_ref_prefix', 'Reference Prefix (e.g. REF)'],
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Complete your company profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              This information is used to personalise your proposal.{' '}
              <span className="text-amber-600 font-medium">{missingFields.length} field{missingFields.length !== 1 ? 's' : ''} missing.</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-4 mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 shrink-0">
          {(['company', 'proposal'] as const).map(t => {
            const hasMissing = t === 'company'
              ? companyFields.some(([f]) => isMissing(f))
              : ['company_bio', 'required_documents', 'former_clients'].some(f => isMissing(f));
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-4 py-2 text-sm font-semibold rounded-lg capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              >
                {t}
                {hasMissing && tab !== t && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Company Tab ─────────────────────────────────────────────── */}
          {tab === 'company' && (
            <>
              {companyFields.map(([field, label]) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    {label}
                    {isMissing(field) && <span className="ml-1.5 text-amber-500 font-semibold">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={company[field]}
                      onChange={e => setCompany(c => ({ ...c, [field]: e.target.value }))}
                      onBlur={() => {
                        if (field === 'company_name') {
                          const name = company.company_name.trim();
                          if (name && !company.company_ref_prefix.trim()) {
                            const words = name.split(/\s+/);
                            const prefix = words.length >= 2
                              ? words.map(w => w[0].toUpperCase()).join('')
                              : name.slice(0, 4).toUpperCase();
                            setCompany(c => ({ ...c, company_ref_prefix: prefix }));
                          }
                        }
                      }}
                      placeholder={field === 'company_name' ? 'e.g. Acme Technologies Ltd' : field === 'company_address' ? 'e.g. KG 123 St, Kigali, Rwanda' : field === 'company_phone' ? '+250 780 000 000' : field === 'company_email' ? 'info@yourcompany.rw' : field === 'company_website' ? 'www.yourcompany.rw' : 'e.g. ACT'}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24 transition ${isMissing(field) ? 'border-amber-300 bg-amber-50 focus:border-amber-400' : 'border-gray-200'}`}
                    />
                    {field === 'company_ref_prefix' && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = company.company_name.trim();
                          if (!name) return;
                          const words = name.split(/\s+/);
                          const prefix = words.length >= 2
                            ? words.map(w => w[0].toUpperCase()).join('')
                            : name.slice(0, 4).toUpperCase();
                          setCompany(c => ({ ...c, company_ref_prefix: prefix }));
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded transition-colors"
                      >
                        Auto-generate
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Company Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoUrl(URL.createObjectURL(f)); } }}
                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  {logoUrl && <img src={logoUrl} className="mt-2 h-10 object-contain rounded border border-gray-100" alt="logo" />}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Signature / Stamp</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setSigFile(f); setSigUrl(URL.createObjectURL(f)); } }}
                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  {sigUrl && <img src={sigUrl} className="mt-2 h-10 object-contain rounded border border-gray-100" alt="signature" />}
                </div>
              </div>
            </>
          )}

          {/* ── Proposal Tab ────────────────────────────────────────────── */}
          {tab === 'proposal' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Company Background
                  {isMissing('company_bio') && <span className="ml-1.5 text-amber-500 font-semibold">*</span>}
                </label>
                <p className="text-xs text-gray-400 mb-1.5">Brief overview used in the AI proposal (capabilities, experience, mission).</p>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  placeholder="e.g. Founded in 2010, Acme Technologies Ltd is a leading ICT solutions provider in East Africa, specialising in software development, system integration, and digital transformation..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition ${isMissing('company_bio') ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Documents Available for Submission
                  {isMissing('required_documents') && <span className="ml-1.5 text-amber-500 font-semibold">*</span>}
                </label>
                <p className="text-xs text-gray-400 mb-1.5">List certificates, registrations, or docs your company can include.</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={docInput}
                    onChange={e => setDocInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const d = docInput.trim();
                        if (d && !requiredDocs.includes(d)) { setRequiredDocs(prev => [...prev, d]); setDocInput(''); }
                      }
                    }}
                    placeholder="e.g. Business Registration Certificate"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => { const d = docInput.trim(); if (d && !requiredDocs.includes(d)) { setRequiredDocs(prev => [...prev, d]); setDocInput(''); } }}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {requiredDocs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requiredDocs.map(d => (
                      <span key={d} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                        {d}
                        <button onClick={() => setRequiredDocs(prev => prev.filter(x => x !== d))} className="text-blue-400 hover:text-blue-700 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Former Clients / Projects
                  {isMissing('former_clients') && <span className="ml-1.5 text-amber-500 font-semibold">*</span>}
                </label>
                <p className="text-xs text-gray-400 mb-1.5">Used in the AI proposal&apos;s experience section.</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={clientInput.name}
                    onChange={e => setClientInput(c => ({ ...c, name: e.target.value }))}
                    placeholder="Client / Org name"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={clientInput.project}
                    onChange={e => setClientInput(c => ({ ...c, project: e.target.value }))}
                    placeholder="Project description (optional)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const n = clientInput.name.trim();
                      if (!n) return;
                      setFormerClients(prev => [...prev, { name: n, project: clientInput.project.trim() }]);
                      setClientInput({ name: '', project: '' });
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
                {formerClients.length > 0 && (
                  <ul className="space-y-1.5">
                    {formerClients.map((c, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-semibold text-gray-800">{c.name}</span>
                          {c.project && <span className="text-gray-500"> — {c.project}</span>}
                        </div>
                        <button
                          onClick={() => setFormerClients(prev => prev.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 shrink-0 flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved! Generating proposal…' : 'Save & Generate Proposal'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition"
          >
            Skip — generate with current data
          </button>
        </div>
      </div>
    </div>
  );
}
