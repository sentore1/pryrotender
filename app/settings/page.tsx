'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const CATEGORIES = ['IT & Technology', 'Construction', 'Medical', 'Consultancy', 'Goods & Supply', 'Services'];

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'company' | 'notifications' | 'subscription'>('company');

  const [company, setCompany] = useState({ company_name: '', company_address: '', company_phone: '', company_website: '', company_ref_prefix: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [sigUrl, setSigUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);

  const [notif, setNotif] = useState({ enabled: false, frequency: 'daily', keywords: [] as string[], categories: [] as string[] });
  const [kwInput, setKwInput] = useState('');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (p) {
        setProfile(p);
        setCompany({ company_name: p.company_name || '', company_address: p.company_address || '', company_phone: p.company_phone || '', company_website: p.company_website || '', company_ref_prefix: p.company_ref_prefix || '' });
        setLogoUrl(p.logo_url || '');
        setSigUrl(p.signature_url || '');
      }
      const { data: n } = await supabase.from('notification_preferences').select('*').eq('user_id', data.user.id).single();
      if (n) setNotif({ enabled: n.enabled, frequency: n.frequency, keywords: n.keywords || [], categories: n.categories || [] });
    });
  }, []);

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: url } = supabase.storage.from('company-assets').getPublicUrl(path);
    return url.publicUrl;
  };

  const saveCompany = async () => {
    setSaving(true);
    try {
      let logo = logoUrl;
      let sig = sigUrl;
      if (logoFile) logo = await uploadFile(logoFile, `${userId}/logo`);
      if (sigFile) sig = await uploadFile(sigFile, `${userId}/signature`);
      await supabase.from('profiles').update({ ...company, logo_url: logo, signature_url: sig }).eq('id', userId);
      setLogoUrl(logo); setSigUrl(sig);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const saveNotifications = async () => {
    setSaving(true);
    await supabase.from('notification_preferences').upsert({ user_id: userId, ...notif, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (kw && !notif.keywords.includes(kw)) { setNotif(n => ({ ...n, keywords: [...n.keywords, kw] })); setKwInput(''); }
  };

  const toggleCategory = (cat: string) => {
    setNotif(n => ({ ...n, categories: n.categories.includes(cat) ? n.categories.filter(c => c !== cat) : [...n.categories, cat] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="PryroTender" width={110} height={36} className="object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back to Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="flex gap-2 mb-6">
          {(['company', 'notifications', 'subscription'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'company' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Company Details</h2>
            {[['company_name', 'Company Name'], ['company_address', 'Address'], ['company_phone', 'Phone'], ['company_website', 'Website'], ['company_ref_prefix', 'Reference Prefix (e.g. REF)']].map(([field, label]) => (
              <div key={field}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <input type="text" value={(company as any)[field]} onChange={e => setCompany(c => ({ ...c, [field]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Company Logo</label>
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoUrl(URL.createObjectURL(f)); } }}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                {logoUrl && <img src={logoUrl} className="mt-2 h-12 object-contain rounded border border-gray-100" alt="logo" />}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Signature / Stamp</label>
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setSigFile(f); setSigUrl(URL.createObjectURL(f)); } }}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                {sigUrl && <img src={sigUrl} className="mt-2 h-12 object-contain rounded border border-gray-100" alt="signature" />}
              </div>
            </div>
            <button onClick={saveCompany} disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Company Details'}
            </button>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="font-semibold text-gray-800">Email Notifications</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable notifications</p>
                <p className="text-xs text-gray-400">Get emailed when new matching tenders are posted</p>
              </div>
              <button onClick={() => setNotif(n => ({ ...n, enabled: !n.enabled }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${notif.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notif.enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {notif.enabled && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Frequency</label>
                  <div className="flex gap-2">
                    {['instant', 'daily'].map(f => (
                      <button key={f} onClick={() => setNotif(n => ({ ...n, frequency: f }))}
                        className={`px-4 py-2 text-sm rounded-lg capitalize font-medium transition ${notif.frequency === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Keywords</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()}
                      placeholder="e.g. software, hospital, road..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={addKeyword} className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notif.keywords.map(kw => (
                      <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                        {kw}
                        <button onClick={() => setNotif(n => ({ ...n, keywords: n.keywords.filter(k => k !== kw) }))} className="text-blue-400 hover:text-blue-700">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${notif.categories.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button onClick={saveNotifications} disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Notification Settings'}
            </button>
          </div>
        )}

        {tab === 'subscription' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Subscription</h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800">Current Plan</p>
                <p className="text-xs text-gray-500 mt-0.5">{profile?.subscription_plan ? `${profile.subscription_plan} plan` : 'No active plan'}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${profile?.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {profile?.subscription_status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            {profile?.subscription_end && (
              <p className="text-xs text-gray-500">Renews / Expires: <span className="font-medium text-gray-700">{profile.subscription_end}</span></p>
            )}
            <Link href="/register?plan=monthly" className="block text-center py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-sm">
              {profile?.subscription_status === 'active' ? 'Change Plan' : 'Subscribe Now'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
