'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const CATEGORIES = ['IT & Technology', 'Construction', 'Medical', 'Consultancy', 'Goods & Supply', 'Services'];

const ALL_NAV_CATS: { label: string; cat: string }[] = [
  { label: 'IT & Technology', cat: 'IT Technology Software' },
  { label: 'Construction', cat: 'Construction Infrastructure Building' },
  { label: 'Medical', cat: 'Medical Healthcare Hospital' },
  { label: 'Consultancy', cat: 'Consultancy Consulting Services' },
  { label: 'Goods & Supply', cat: 'Goods Supply Equipment' },
  { label: 'Services', cat: 'Services' },
  { label: 'Agriculture', cat: 'Agriculture Farming' },
  { label: 'Energy', cat: 'Energy Power' },
  { label: 'Transport', cat: 'Transport Logistics' },
  { label: 'Education', cat: 'Education Training' },
  { label: 'Water & Sanitation', cat: 'Water Sanitation' },
  { label: 'Finance', cat: 'Finance Banking' },
  { label: 'Security', cat: 'Security Defense' },
  { label: 'Environment', cat: 'Environment Climate' },
  { label: 'Tourism', cat: 'Tourism Hospitality' },
];

type SidebarItem = { label: string; cat: string };

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'company' | 'notifications' | 'sidebar' | 'proposal' | 'subscription'>('company');
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [company, setCompany] = useState({ company_name: '', company_address: '', company_phone: '', company_website: '', company_ref_prefix: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [sigUrl, setSigUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);

  const [notif, setNotif] = useState({ enabled: false, frequency: 'daily', keywords: [] as string[], categories: [] as string[], notification_email: '', extra_emails: [] as string[] });
  const [kwInput, setKwInput] = useState('');
  const [extraEmailInput, setExtraEmailInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(ALL_NAV_CATS.slice(0, 5));
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const [bio, setBio] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');
  const [formerClients, setFormerClients] = useState<{ name: string; project: string }[]>([]);
  const [clientInput, setClientInput] = useState({ name: '', project: '' });

  useEffect(() => {
    const loadData = async (uid: string) => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (p) {
        setProfile(p);
        setCompany({ company_name: p.company_name || '', company_address: p.company_address || '', company_phone: p.company_phone || '', company_website: p.company_website || '', company_ref_prefix: p.company_ref_prefix || '' });
        setLogoUrl(p.logo_url || '');
        setSigUrl(p.signature_url || '');
        setBio(p.company_bio || '');
        setRequiredDocs(p.required_documents || []);
        setFormerClients(p.former_clients || []);
        if (p.sidebar_categories?.length) {
          setSidebarItems(p.sidebar_categories.map((cat: string) => ALL_NAV_CATS.find(n => n.cat === cat) || { label: cat, cat }));
        }
      }
      const { data: n } = await supabase.from('notification_preferences').select('*').eq('user_id', uid).single();
      if (n) setNotif({ enabled: n.enabled, frequency: n.frequency, keywords: n.keywords || [], categories: n.categories || [], notification_email: n.notification_email || '', extra_emails: n.extra_emails || [] });
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!session) { router.push('/login'); return; }
        setUserId(session.user.id);
        loadData(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const uploadFile = async (file: File, path: string) => {
    const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: url } = supabase.storage.from('company-assets').getPublicUrl(path);
    return url.publicUrl;
  };

  const saveCompany = async () => {
    setSaving(true);
    try {
      let logo = logoUrl, sig = sigUrl;
      if (logoFile) logo = await uploadFile(logoFile, `${userId}/logo`);
      if (sigFile) sig = await uploadFile(sigFile, `${userId}/signature`);
      const { error } = await supabase.from('profiles').update({ ...company, logo_url: logo, signature_url: sig }).eq('id', userId);
      if (error) throw error;
      setLogoUrl(logo); setSigUrl(sig); setLogoFile(null); setSigFile(null);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      alert(e.message?.includes('Bucket') ? 'Storage bucket not found.' : e.message);
    }
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

  const addExtraEmail = () => {
    const e = extraEmailInput.trim();
    if (e && e.includes('@') && !notif.extra_emails.includes(e)) {
      setNotif(n => ({ ...n, extra_emails: [...n.extra_emails, e] }));
      setExtraEmailInput('');
    }
  };

  const sendTestNotification = async () => {
    setTesting(true); setTestResult('');
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.NEXT_PUBLIC_CRON_SECRET || '' },
        body: JSON.stringify({ test: true, userId }),
      });
      const data = await res.json();
      setTestResult(data.sent > 0 || data.success ? '✓ Test email sent!' : 'No matching tenders found.');
    } catch { setTestResult('Failed to send test.'); }
    setTesting(false);
    setTimeout(() => setTestResult(''), 4000);
  };

  const saveProposal = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ company_bio: bio, required_documents: requiredDocs, former_clients: formerClients }).eq('id', userId);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const saveSidebar = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ sidebar_categories: sidebarItems.map(i => i.cat) }).eq('id', userId);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const addToSidebar = (item: SidebarItem) => {
    if (!sidebarItems.find(i => i.cat === item.cat)) setSidebarItems(prev => [...prev, item]);
    setSidebarSearch('');
  };

  const removeFromSidebar = (cat: string) => setSidebarItems(prev => prev.filter(i => i.cat !== cat));

  const moveItem = (idx: number, dir: -1 | 1) => {
    setSidebarItems(prev => {
      const arr = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  };

  const updateLabel = (idx: number, label: string) => {
    setSidebarItems(prev => prev.map((item, i) => i === idx ? { ...item, label } : item));
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Image src="/logo.png" alt="PryroTender" width={110} height={36} className="object-contain" />
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back to Dashboard</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="flex gap-2 mb-6">
          {(['company', 'proposal', 'notifications', 'sidebar', 'subscription'] as const).map(t => (
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

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Notification Email</label>
                  <p className="text-xs text-gray-400 mb-2">Override the default account email for notifications.</p>
                  <input type="email" value={notif.notification_email} onChange={e => setNotif(n => ({ ...n, notification_email: e.target.value }))}
                    placeholder="e.g. alerts@yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Additional Emails</label>
                  <p className="text-xs text-gray-400 mb-2">Also send notifications to these emails.</p>
                  <div className="flex gap-2 mb-2">
                    <input type="email" value={extraEmailInput} onChange={e => setExtraEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExtraEmail()}
                      placeholder="e.g. manager@company.com"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={addExtraEmail} className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notif.extra_emails.map(email => (
                      <span key={email} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {email}
                        <button onClick={() => setNotif(n => ({ ...n, extra_emails: n.extra_emails.filter(e => e !== email) }))} className="text-gray-400 hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={saveNotifications} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
              </button>
              <button onClick={sendTestNotification} disabled={testing || !notif.enabled}
                title={!notif.enabled ? 'Enable notifications first' : ''}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition text-sm">
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
            {testResult && <p className={`text-xs text-center font-medium ${testResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{testResult}</p>}
          </div>
        )}

        {tab === 'proposal' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Company Bio</h2>
              <p className="text-xs text-gray-400 mb-3">Describe your company — background, expertise, mission. The AI will use this when writing proposals.</p>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5}
                placeholder="e.g. We are a Kigali-based IT firm founded in 2015, specializing in software development, system integration, and digital transformation for government and private sector clients across East Africa..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Required Documents</h2>
              <p className="text-xs text-gray-400 mb-3">List documents your company has ready for tender submissions. The AI will include these in the proposal checklist.</p>
              <div className="flex gap-2 mb-3">
                <input type="text" value={docInput} onChange={e => setDocInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && docInput.trim()) { setRequiredDocs(d => [...d, docInput.trim()]); setDocInput(''); } }}
                  placeholder="e.g. Tax Clearance Certificate, RDB Registration..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => { if (docInput.trim()) { setRequiredDocs(d => [...d, docInput.trim()]); setDocInput(''); } }}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Add</button>
              </div>
              <div className="space-y-1.5">
                {requiredDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm text-gray-700">{doc}</span>
                    <button onClick={() => setRequiredDocs(d => d.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
                {requiredDocs.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No documents added yet.</p>}
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Former Clients</h2>
              <p className="text-xs text-gray-400 mb-3">Add past clients and projects. The AI will reference these to strengthen your proposals.</p>
              <div className="flex gap-2 mb-3">
                <input type="text" value={clientInput.name} onChange={e => setClientInput(c => ({ ...c, name: e.target.value }))}
                  placeholder="Client name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" value={clientInput.project} onChange={e => setClientInput(c => ({ ...c, project: e.target.value }))}
                  placeholder="Project / work done" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => { if (clientInput.name.trim()) { setFormerClients(f => [...f, { name: clientInput.name.trim(), project: clientInput.project.trim() }]); setClientInput({ name: '', project: '' }); } }}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Add</button>
              </div>
              <div className="space-y-1.5">
                {formerClients.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      {c.project && <p className="text-xs text-gray-500 truncate">{c.project}</p>}
                    </div>
                    <button onClick={() => setFormerClients(f => f.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 text-xs shrink-0">✕</button>
                  </div>
                ))}
                {formerClients.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No clients added yet.</p>}
              </div>
            </div>

            <button onClick={saveProposal} disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Proposal Settings'}
            </button>
          </div>
        )}

        {tab === 'sidebar' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Sidebar Categories</h2>
            <p className="text-xs text-gray-400">Search to add categories, edit labels, reorder or remove them.</p>
            <div className="relative">
              <input type="text" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Search categories to add..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {sidebarSearch && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {ALL_NAV_CATS.filter(c =>
                    c.label.toLowerCase().includes(sidebarSearch.toLowerCase()) &&
                    !sidebarItems.find(i => i.cat === c.cat)
                  ).map(item => (
                    <button key={item.cat} onClick={() => addToSidebar(item)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                      + {item.label}
                    </button>
                  ))}
                  {!ALL_NAV_CATS.find(c => c.label.toLowerCase() === sidebarSearch.toLowerCase()) && (
                    <button onClick={() => addToSidebar({ label: sidebarSearch, cat: sidebarSearch })}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50">
                      + Add &quot;{sidebarSearch}&quot; as custom
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {sidebarItems.map((item, idx) => (
                <div key={item.cat} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none">▲</button>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === sidebarItems.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none">▼</button>
                  </div>
                  {editingIdx === idx ? (
                    <input autoFocus value={item.label}
                      onChange={e => updateLabel(idx, e.target.value)}
                      onBlur={() => setEditingIdx(null)}
                      onKeyDown={e => e.key === 'Enter' && setEditingIdx(null)}
                      className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none" />
                  ) : (
                    <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                  )}
                  <button onClick={() => setEditingIdx(editingIdx === idx ? null : idx)} className="text-xs text-gray-400 hover:text-blue-600 px-1">✎</button>
                  <button onClick={() => removeFromSidebar(item.cat)} className="text-xs text-gray-400 hover:text-red-600 px-1">✕</button>
                </div>
              ))}
              {sidebarItems.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No categories added yet.</p>}
            </div>
            <button onClick={saveSidebar} disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Sidebar'}
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
              {profile?.subscription_status === 'active' ? 'Renew / Change Plan' : 'Subscribe Now'}
            </Link>
            {profile?.subscription_status === 'active' && (
              <button disabled={cancelling} onClick={async () => {
                if (!confirm('Cancel your subscription? You will lose access at end of today.')) return;
                setCancelling(true);
                const res = await fetch('/api/subscription/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
                const data = await res.json();
                if (data.success) { setProfile((p: any) => ({ ...p, subscription_status: 'inactive' })); }
                setCancelling(false);
              }} className="w-full py-2.5 bg-orange-50 text-orange-600 font-semibold rounded-lg hover:bg-orange-100 disabled:opacity-50 transition text-sm border border-orange-200">
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            )}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-3">Danger Zone</p>
              <button disabled={deleting} onClick={async () => {
                if (!confirm('Permanently delete your account? This cannot be undone.')) return;
                if (!confirm('Are you sure? All your data will be deleted.')) return;
                setDeleting(true);
                const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
                const data = await res.json();
                if (data.success) {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }
                setDeleting(false);
              }} className="w-full py-2.5 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 transition text-sm border border-red-200">
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
