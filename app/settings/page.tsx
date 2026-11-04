'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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
  const userIdRef = useRef('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'company' | 'proposal' | 'notifications' | 'email' | 'sidebar' | 'subscription' | 'employees' | 'pricing' | 'suppliers'>('company');
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [company, setCompany] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '', company_website: '', company_ref_prefix: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [sigUrl, setSigUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);

  const [notif, setNotif] = useState({ enabled: false, frequency: 'daily', keywords: [] as string[], categories: [] as string[], notification_email: '', extra_emails: [] as string[] });
  const [kwInput, setKwInput] = useState('');
  const [extraEmailInput, setExtraEmailInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  // Email / sender settings (per-user SMTP or Gmail)
  const [emailSettings, setEmailSettings] = useState({ provider: 'gmail' as 'gmail' | 'smtp', smtp_host: '', smtp_port: 465, smtp_user: '', smtp_password: '', smtp_secure: true, sender_name: '' });
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState('');

  const [profile, setProfile] = useState<any>(null);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(ALL_NAV_CATS.slice(0, 5));
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [umucyoCats, setUmucyoCats] = useState<SidebarItem[]>([]);

  const [bio, setBio] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');
  const [formerClients, setFormerClients] = useState<{ name: string; project: string }[]>([]);
  const [clientInput, setClientInput] = useState({ name: '', project: '' });

  // Employees / CVs
  type Employee = { id: string; name: string; role: string; bio: string; skills: string[]; experience_years: string; cv_url: string };
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [cvFile, setCvFile]               = useState<File | null>(null);
  const [cvUploading, setCvUploading]     = useState(false);
  const [cvError, setCvError]             = useState('');
  const [cvParsed, setCvParsed]           = useState<Omit<Employee,'id'|'cv_url'> | null>(null);
  const [editingEmp, setEditingEmp]       = useState<Omit<Employee,'id'|'cv_url'> | null>(null);
  const [pendingCvUrl, setPendingCvUrl]   = useState('');
  const [pendingEmpId, setPendingEmpId]   = useState('');

  // ── Pricing Items ──────────────────────────────────────────
  type PricingItem = { id?: string; name: string; description: string; unit: string; unit_price: string; currency: string; category: 'goods' | 'service'; margin_pct: string; _exists?: boolean };
  const blankItem = (): PricingItem => ({ name: '', description: '', unit: '', unit_price: '', currency: 'RWF', category: 'goods', margin_pct: '0' });
  const [pricingItems, setPricingItems]           = useState<PricingItem[]>([]);
  const [pricingLoaded, setPricingLoaded]         = useState(false);
  const [pricingTab, setPricingTab]               = useState<'goods' | 'service'>('goods');
  const [newItem, setNewItem]                     = useState<PricingItem>(blankItem());
  const [editingItem, setEditingItem]             = useState<PricingItem | null>(null);
  const [savingItem, setSavingItem]               = useState(false);
  const [xlsxParsing, setXlsxParsing]            = useState(false);
  const [xlsxPreview, setXlsxPreview]            = useState<PricingItem[] | null>(null);
  const [xlsxGlobalMargin, setXlsxGlobalMargin]  = useState('0');
  const [xlsxSaving, setXlsxSaving]              = useState(false);
  const [pricingMsg, setPricingMsg]               = useState('');

  // ── Suppliers ──────────────────────────────────────────────
  type Supplier = { id?: string; name: string; label: string; contact_email: string; whatsapp: string; notes: string };
  const blankSupplier = (): Supplier => ({ name: '', label: '', contact_email: '', whatsapp: '', notes: '' });
  const [suppliersData, setSuppliersData]         = useState<Supplier[]>([]);
  const [suppliersLoaded, setSuppliersLoaded]     = useState(false);
  const [newSupplier, setNewSupplier]             = useState<Supplier>(blankSupplier());
  const [editingSupplier, setEditingSupplier]     = useState<Supplier | null>(null);
  const [savingSupplier, setSavingSupplier]       = useState(false);
  const [supplierMsg, setSupplierMsg]             = useState('');
  // Quote request builder
  type QuoteRequestItem = { name: string; description: string; unit: string; qty: number };
  const [quoteItems, setQuoteItems]               = useState<QuoteRequestItem[]>([{ name: '', description: '', unit: '', qty: 1 }]);
  const [quoteTitle, setQuoteTitle]               = useState('');
  const [quoteSupplier, setQuoteSupplier]         = useState('');
  const [creatingQuote, setCreatingQuote]         = useState(false);
  const [quoteLink, setQuoteLink]                 = useState('');
  const [showQuoteBuilder, setShowQuoteBuilder]   = useState(false);
  // Submitted quotes inbox
  type QuoteRequest = { id: string; token: string; title: string; items: any[]; status: string; response: any[] | null; response_notes: string | null; created_at: string; suppliers: any };
  const [quoteRequests, setQuoteRequests]         = useState<QuoteRequest[]>([]);
  const [quotesLoaded, setQuotesLoaded]           = useState(false);
  const [expandedQuote, setExpandedQuote]         = useState<string | null>(null);
  const [acceptingQuote, setAcceptingQuote]       = useState<string | null>(null);
  const [acceptMargin, setAcceptMargin]           = useState('0');
  const [quoteActionMsg, setQuoteActionMsg]       = useState('');

  useEffect(() => {
    const loadData = async (uid: string) => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (p) {
        setProfile(p);
        setCompany({ company_name: p.company_name || '', company_address: p.company_address || '', company_phone: p.company_phone || '', company_email: p.company_email || '', company_website: p.company_website || '', company_ref_prefix: p.company_ref_prefix || '' });
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

      // Email / sender settings
      const { data: es } = await supabase.from('email_settings').select('*').eq('user_id', uid).maybeSingle();
      if (es) setEmailSettings({
        provider: es.provider === 'smtp' ? 'smtp' : 'gmail',
        smtp_host: es.smtp_host || '',
        smtp_port: es.smtp_port ?? 465,
        smtp_user: es.smtp_user || '',
        smtp_password: es.smtp_password || '',
        smtp_secure: es.smtp_secure ?? true,
        sender_name: es.sender_name || '',
      });

      // Load employees
      const { data: emps } = await supabase.from('employees').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (emps) setEmployees(emps);

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!session) { router.push('/login'); return; }
        setUserId(session.user.id);
        userIdRef.current = session.user.id;
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
      if (logoFile) logo = await uploadFile(logoFile, `${userIdRef.current}/logo`);
      if (sigFile) sig = await uploadFile(sigFile, `${userIdRef.current}/signature`);
      const { error } = await supabase.from('profiles').update({ ...company, logo_url: logo, signature_url: sig }).eq('id', userIdRef.current);
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
    await supabase.from('notification_preferences').upsert({ user_id: userIdRef.current, ...notif, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
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
        body: JSON.stringify({ test: true, userId: userIdRef.current }),
      });
      const data = await res.json();
      setTestResult(data.sent > 0 || data.success ? '✓ Test email sent!' : 'No matching tenders found.');
    } catch { setTestResult('Failed to send test.'); }
    setTesting(false);
    setTimeout(() => setTestResult(''), 4000);
  };

  // ── Email / sender settings ──────────────────────────────────────────────
  const persistEmail = async () => {
    // Gmail uses a fixed transport; normalise so the API can rely on it.
    const provider = emailSettings.provider;
    const isGmail = provider === 'gmail';
    return supabase.from('email_settings').upsert({
      user_id: userIdRef.current,
      provider,
      smtp_host: isGmail ? 'smtp.gmail.com' : emailSettings.smtp_host.trim(),
      smtp_port: Number(emailSettings.smtp_port) || (isGmail ? 465 : 587),
      smtp_user: emailSettings.smtp_user.trim(),
      smtp_password: emailSettings.smtp_password,
      smtp_secure: isGmail ? true : !!emailSettings.smtp_secure,
      sender_name: emailSettings.sender_name.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    const { error } = await persistEmail();
    if (error) {
      alert(/relation .* does not exist|schema/i.test(error.message)
        ? 'The email_settings table is not set up yet. Run the latest SQL in supabase-schema.sql.'
        : error.message);
    } else {
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const sendTestEmail = async () => {
    setEmailTesting(true); setEmailTestResult('');
    // Save first so the test uses the on-screen config.
    const { error: saveErr } = await persistEmail();
    if (saveErr) {
      setEmailTestResult(/relation .* does not exist|schema/i.test(saveErr.message)
        ? 'Email settings table not set up on the server.'
        : 'Could not save settings: ' + saveErr.message);
      setEmailTesting(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json();
      setEmailTestResult(data.success ? '✓ Test email sent! Check your inbox.' : (data.error || 'Failed to send.'));
    } catch { setEmailTestResult('Network error.'); }
    setEmailTesting(false);
    setTimeout(() => setEmailTestResult(''), 6000);
  };

  const saveProposal = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ company_bio: bio, required_documents: requiredDocs, former_clients: formerClients }).eq('id', userIdRef.current);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const saveSidebar = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ sidebar_categories: sidebarItems.map(i => i.cat) }).eq('id', userIdRef.current);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  // ── Employee CV functions ──────────────────────────────────────────────
  const handleCvUpload = async (file: File) => {
    setCvFile(file); setCvError(''); setCvParsed(null); setEditingEmp(null); setPendingCvUrl(''); setPendingEmpId('');
    setCvUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', userId);
      const res  = await fetch('/api/employees/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setEmployees(prev => [data.employee, ...prev]);
        setCvFile(null);
        setCvParsed(null);
      } else {
        setCvError(data.error || 'Upload failed.');
      }
    } catch { setCvError('Network error.'); }
    setCvUploading(false);
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Remove this employee and their CV?')) return;
    const res  = await fetch('/api/employees/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: id, userId }) });
    const data = await res.json();
    if (data.success) setEmployees(prev => prev.filter(e => e.id !== id));
    else alert(data.error || 'Delete failed.');
  };

  const updateEmployee = async (emp: Employee) => {
    await supabase.from('employees').update({ name: emp.name, role: emp.role, bio: emp.bio }).eq('id', emp.id);
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    setEditingEmp(null);
  };

  useEffect(() => {
    if (tab !== 'sidebar' || umucyoCats.length) return;
    fetch('/api/categories').then(r => r.json()).then(d => {
      const extra: SidebarItem[] = (d.categories as string[]).map((c: string) => ({ label: c, cat: c }));
      setUmucyoCats(extra);
    }).catch(() => {});
  }, [tab]);

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

  // ── Pricing Items helpers ────────────────────────────────────────────────
  const loadPricingItems = async () => {
    if (pricingLoaded) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/pricing-items', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (data.success) {
      setPricingItems(data.items.map((i: any) => ({
        ...i,
        unit_price: String(i.unit_price),
        margin_pct: String(i.margin_pct ?? 0),
      })));
    }
    setPricingLoaded(true);
  };

  const saveItem = async (item: PricingItem) => {
    setSavingItem(true); setPricingMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingItem(false); return; }
    const res = await fetch('/api/pricing-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...item, unit_price: Number(item.unit_price) || 0, margin_pct: Number(item.margin_pct) || 0 }),
    });
    const data = await res.json();
    if (data.success) {
      const saved = { ...data.items[0], unit_price: String(data.items[0].unit_price), margin_pct: String(data.items[0].margin_pct ?? 0) };
      if (item.id) {
        setPricingItems(prev => prev.map(p => p.id === item.id ? saved : p));
      } else {
        setPricingItems(prev => [...prev, saved]);
        setNewItem(blankItem());
      }
      setEditingItem(null);
      setPricingMsg('✓ Saved!');
    } else {
      setPricingMsg(data.error || 'Save failed.');
    }
    setSavingItem(false);
    setTimeout(() => setPricingMsg(''), 3000);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Remove this item from your pricing catalogue?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/pricing-items?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (data.success) setPricingItems(prev => prev.filter(p => p.id !== id));
  };

  const handleXlsxFile = async (file: File) => {
    setXlsxParsing(true); setPricingMsg('');
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length < 2) { setPricingMsg('No data rows found in the sheet.'); setXlsxParsing(false); return; }

      // Find relevant column indices — case-insensitive header scan
      const headers: string[] = (rows[0] as any[]).map((h: any) => String(h ?? '').toLowerCase().trim());
      const colIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

      const nameCol   = colIdx(['item', 'product', 'goods', 'description', 'name', 'service']);
      const priceCol  = colIdx(['price', 'unit price', 'unit_price', 'cost', 'amount', 'rate']);
      const unitCol   = colIdx(['unit', 'uom', 'measure']);
      const descCol   = colIdx(['detail', 'spec', 'description', 'note', 'remark']);

      if (nameCol === -1) {
        setPricingMsg('Could not find an item/product/name column. Make sure the first row has headers.');
        setXlsxParsing(false);
        return;
      }

      const parsed: PricingItem[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r] as any[];
        const rawName = row[nameCol];
        if (!rawName) continue;
        const name = String(rawName).trim();
        if (!name) continue;

        const rawPrice = priceCol >= 0 ? row[priceCol] : '';
        const price = rawPrice !== '' && rawPrice !== undefined ? String(rawPrice).replace(/[^0-9.]/g, '') : '';

        parsed.push({
          name,
          description: descCol >= 0 && row[descCol] ? String(row[descCol]).trim() : '',
          unit: unitCol >= 0 && row[unitCol] ? String(row[unitCol]).trim() : '',
          unit_price: price,
          currency: 'RWF',
          category: pricingTab,
          margin_pct: '0',
        });
      }

      if (parsed.length === 0) { setPricingMsg('No valid rows found.'); setXlsxParsing(false); return; }

      // Mark items that already exist in the catalogue (case-insensitive name match)
      const existingNames = new Set(pricingItems.map(i => i.name.toLowerCase().trim()));
      const markedParsed = parsed.map(item => ({
        ...item,
        _exists: existingNames.has(item.name.toLowerCase().trim()),
      }));

      setXlsxPreview(markedParsed);
      setXlsxGlobalMargin('0');
    } catch (err) {
      console.error('xlsx parse error:', err);
      setPricingMsg('Failed to read the file. Make sure it is a valid .xlsx or .csv file.');
    }
    setXlsxParsing(false);
  };

  const confirmXlsxImport = async () => {
    if (!xlsxPreview) return;
    setXlsxSaving(true);
    const margin = Number(xlsxGlobalMargin) || 0;
    const items = xlsxPreview.map(i => ({ ...i, margin_pct: String(margin) }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setXlsxSaving(false); return; }
    const res = await fetch('/api/pricing-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(items.map(i => ({ ...i, unit_price: Number(i.unit_price) || 0, margin_pct: margin }))),
    });
    const data = await res.json();
    if (data.success) {
      const saved = data.items.map((i: any) => ({ ...i, unit_price: String(i.unit_price), margin_pct: String(i.margin_pct ?? 0) }));
      setPricingItems(prev => {
        const existing = prev.filter(p => !saved.find((s: any) => s.id === p.id));
        return [...existing, ...saved];
      });
      setXlsxPreview(null);
      setPricingMsg(`✓ ${saved.length} items imported!`);
    } else {
      setPricingMsg(data.error || 'Import failed.');
    }
    setXlsxSaving(false);
    setTimeout(() => setPricingMsg(''), 4000);
  };

  // ── Suppliers helpers ────────────────────────────────────────────────────
  const loadSuppliers = async () => {
    if (suppliersLoaded) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/suppliers', { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    if (data.success) setSuppliersData(data.suppliers.map((s: any) => ({ ...s, label: s.label || '', contact_email: s.contact_email || '', whatsapp: s.whatsapp || '', notes: s.notes || '' })));
    setSuppliersLoaded(true);
  };

  const loadQuoteRequests = async () => {
    if (quotesLoaded) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/supplier-quote/list', { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    if (data.success) setQuoteRequests(data.requests);
    setQuotesLoaded(true);
  };

  const saveSupplier = async (supplier: Supplier) => {
    setSavingSupplier(true); setSupplierMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingSupplier(false); return; }
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(supplier),
    });
    const data = await res.json();
    if (data.success) {
      const saved = { ...data.supplier, label: data.supplier.label || '', contact_email: data.supplier.contact_email || '', whatsapp: data.supplier.whatsapp || '', notes: data.supplier.notes || '' };
      if (supplier.id) {
        setSuppliersData(prev => prev.map(s => s.id === supplier.id ? saved : s));
      } else {
        setSuppliersData(prev => [...prev, saved]);
        setNewSupplier(blankSupplier());
      }
      setEditingSupplier(null);
      setSupplierMsg('✓ Saved!');
    } else {
      setSupplierMsg(data.error || 'Save failed.');
    }
    setSavingSupplier(false);
    setTimeout(() => setSupplierMsg(''), 3000);
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Remove this supplier?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    if (data.success) setSuppliersData(prev => prev.filter(s => s.id !== id));
  };

  const createQuoteLink = async () => {
    const validItems = quoteItems.filter(i => i.name.trim());
    if (!validItems.length) { setSupplierMsg('Add at least one item.'); return; }
    setCreatingQuote(true); setQuoteLink(''); setSupplierMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCreatingQuote(false); return; }
    const suppId = suppliersData.find(s => s.name === quoteSupplier)?.id;
    const res = await fetch('/api/supplier-quote/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ supplierId: suppId || null, title: quoteTitle || 'Price Quote Request', items: validItems }),
    });
    const data = await res.json();
    if (data.success) {
      setQuoteLink(data.url);
      setQuotesLoaded(false); // refresh inbox
    } else {
      setSupplierMsg(data.error || 'Failed to create link.');
    }
    setCreatingQuote(false);
  };

  const acceptQuote = async (id: string) => {
    setAcceptingQuote(id); setQuoteActionMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAcceptingQuote(null); return; }
    const res = await fetch('/api/supplier-quote/list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, action: 'accept', margin_pct: Number(acceptMargin) || 0 }),
    });
    const data = await res.json();
    if (data.success) {
      setQuoteRequests(prev => prev.map(q => q.id === id ? { ...q, status: 'accepted' } : q));
      setQuoteActionMsg('✓ Accepted — items saved to your pricing catalogue!');
      setPricingLoaded(false); // force reload next time pricing tab opens
    } else {
      setQuoteActionMsg(data.error || 'Failed to accept quote.');
    }
    setAcceptingQuote(null);
    setTimeout(() => setQuoteActionMsg(''), 5000);
  };

  // Lazy-load pricing items when the tab opens
  useEffect(() => { if (tab === 'pricing') loadPricingItems(); }, [tab]);
  // Lazy-load suppliers + quote inbox when the tab opens
  useEffect(() => { if (tab === 'suppliers') { loadSuppliers(); loadQuoteRequests(); } }, [tab]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Image src="/logo.png" alt="PryroTender" width={110} height={36} className="object-contain" />
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Back to Dashboard</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['company', 'proposal', 'notifications', 'email', 'sidebar', 'subscription', 'employees', 'pricing', 'suppliers'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'company' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Company Details</h2>
            {[['company_name', 'Company Name'], ['company_address', 'Address'], ['company_phone', 'Phone'], ['company_email', 'Email'], ['company_website', 'Website'], ['company_ref_prefix', 'Reference Prefix (e.g. REF)']].map(([field, label]) => (
              <div key={field}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={(company as any)[field]}
                    onChange={e => setCompany(c => ({ ...c, [field]: e.target.value }))}
                    onBlur={() => {
                      // Auto-fill ref prefix when company name is set and prefix is still empty
                      if (field === 'company_name') {
                        const name = (company as any)['company_name'].trim();
                        if (name && !company.company_ref_prefix.trim()) {
                          const words = name.split(/\s+/);
                          const prefix = words.length >= 2
                            ? words.map((w: string) => w[0].toUpperCase()).join('')
                            : name.slice(0, 4).toUpperCase();
                          setCompany(c => ({ ...c, company_ref_prefix: prefix }));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24"
                  />
                  {field === 'company_ref_prefix' && (
                    <button type="button"
                      onClick={() => {
                        const name = company.company_name.trim();
                        if (!name) return;
                        const words = name.split(/\s+/);
                        const prefix = words.length >= 2
                          ? words.map((w: string) => w[0].toUpperCase()).join('')
                          : name.slice(0, 4).toUpperCase();
                        setCompany(c => ({ ...c, company_ref_prefix: prefix }));
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded transition-colors">
                      Auto-generate
                    </button>
                  )}
                </div>
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

        {tab === 'email' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800">Email / Sender Account</h2>
              <p className="text-xs text-gray-400 mt-0.5">Configure the account PryroTender uses to send emails on your behalf (e.g. to a tender&apos;s contact). Saved with your account.</p>
            </div>

            {/* Provider selector */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Provider</label>
              <div className="flex gap-2">
                <button onClick={() => setEmailSettings(s => ({ ...s, provider: 'gmail', smtp_host: 'smtp.gmail.com', smtp_port: 465, smtp_secure: true }))}
                  className={`flex-1 px-4 py-2 text-sm rounded-lg font-medium transition ${emailSettings.provider === 'gmail' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Gmail
                </button>
                <button onClick={() => setEmailSettings(s => ({ ...s, provider: 'smtp' }))}
                  className={`flex-1 px-4 py-2 text-sm rounded-lg font-medium transition ${emailSettings.provider === 'smtp' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Custom SMTP
                </button>
              </div>
            </div>

            {/* Sender name (both) */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Sender Name (optional)</label>
              <input type="text" value={emailSettings.sender_name} onChange={e => setEmailSettings(s => ({ ...s, sender_name: e.target.value }))}
                placeholder="e.g. Your Company Ltd"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Shown as the &quot;From&quot; name. Defaults to your email address.</p>
            </div>

            {/* Email + password (both) */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">{emailSettings.provider === 'gmail' ? 'Gmail Address' : 'SMTP Username / Email'}</label>
              <input type="email" value={emailSettings.smtp_user} onChange={e => setEmailSettings(s => ({ ...s, smtp_user: e.target.value }))}
                placeholder={emailSettings.provider === 'gmail' ? 'you@gmail.com' : 'you@yourcompany.com'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">{emailSettings.provider === 'gmail' ? 'Gmail App Password' : 'SMTP Password'}</label>
              <input type="password" value={emailSettings.smtp_password} onChange={e => setEmailSettings(s => ({ ...s, smtp_password: e.target.value }))}
                placeholder={emailSettings.provider === 'gmail' ? '16-character app password' : 'Your SMTP password'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {emailSettings.provider === 'gmail' && (
                <p className="text-xs text-gray-400 mt-1">
                  Use a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google App Password</a>, not your normal Gmail password.
                </p>
              )}
            </div>

            {/* Custom SMTP only */}
            {emailSettings.provider === 'smtp' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">SMTP Host</label>
                    <input type="text" value={emailSettings.smtp_host} onChange={e => setEmailSettings(s => ({ ...s, smtp_host: e.target.value }))}
                      placeholder="smtp.yourcompany.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Port</label>
                    <input type="number" value={emailSettings.smtp_port} onChange={e => setEmailSettings(s => ({ ...s, smtp_port: Number(e.target.value) }))}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Use SSL/TLS (secure)</p>
                    <p className="text-xs text-gray-400">Enable for port 465. Disable for 587 (STARTTLS).</p>
                  </div>
                  <button onClick={() => setEmailSettings(s => ({ ...s, smtp_secure: !s.smtp_secure }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${emailSettings.smtp_secure ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailSettings.smtp_secure ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button onClick={saveEmailSettings} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm">
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
              </button>
              <button onClick={sendTestEmail} disabled={emailTesting || !emailSettings.smtp_user || !emailSettings.smtp_password}
                title={!emailSettings.smtp_user || !emailSettings.smtp_password ? 'Enter email and password first' : ''}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition text-sm">
                {emailTesting ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
            {emailTestResult && <p className={`text-xs text-center font-medium ${emailTestResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{emailTestResult}</p>}
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
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
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
                  {[...ALL_NAV_CATS, ...umucyoCats.filter(u => !ALL_NAV_CATS.find(a => a.cat === u.cat))]
                    .filter(c =>
                      c.label.toLowerCase().includes(sidebarSearch.toLowerCase()) &&
                      !sidebarItems.find(i => i.cat === c.cat)
                    ).map(item => (
                      <button key={item.cat} onClick={() => addToSidebar(item)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                        + {item.label}
                      </button>
                    ))}
                  {![...ALL_NAV_CATS, ...umucyoCats].find(c => c.label.toLowerCase() === sidebarSearch.toLowerCase()) && (
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="font-semibold text-gray-800">Subscription</h2>

            {/* Current status */}
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

            {/* Plan cards */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                {profile?.subscription_status === 'active' ? 'Upgrade or Change Plan' : 'Choose a Plan'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Monthly */}
                <div className={`border-2 rounded-xl p-4 space-y-3 transition ${profile?.subscription_plan === 'monthly' && profile?.subscription_status === 'active' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Monthly</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">100 RWF <span className="text-xs font-normal text-gray-400">/mo</span></p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {['All tenders access','AI proposal generation','Analyse tender','Form Filler AI','DOCX export','Email notifications'].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span>{f}</li>
                    ))}
                  </ul>
                  <Link href="/register?plan=monthly&currency=RWF"
                    className="block text-center py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition">
                    {profile?.subscription_plan === 'monthly' && profile?.subscription_status === 'active' ? 'Renew Monthly' : 'Get Monthly'}
                  </Link>
                </div>
                {/* Annual */}
                <div className={`border-2 rounded-xl p-4 space-y-3 transition relative ${profile?.subscription_plan === 'annual' && profile?.subscription_status === 'active' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Best Value</span>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Annual</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">100 RWF <span className="text-xs font-normal text-gray-400">/yr</span></p>
                    <p className="text-xs text-green-600">Save 100 RWF vs monthly</p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    {['All tenders access','AI proposal generation','Analyse tender','Form Filler AI','DOCX export','Email notifications','Priority support'].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span>{f}</li>
                    ))}
                  </ul>
                  <Link href="/register?plan=annual&currency=RWF"
                    className="block text-center py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition">
                    {profile?.subscription_plan === 'annual' && profile?.subscription_status === 'active' ? 'Renew Annual' : 'Get Annual'}
                  </Link>
                </div>
              </div>
            </div>

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

        {tab === 'employees' && (
          <div className="space-y-6">
            {/* Upload new CV */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Add Employee CV</h2>
              <p className="text-xs text-gray-400">Upload a PDF CV — AI will automatically extract the employee&apos;s name, role, and bio.</p>

              {/* Drop zone */}
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition
                ${cvUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
                <input type="file" accept=".pdf" className="hidden" disabled={cvUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); e.target.value = ''; }} />
                {cvUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-blue-600 font-medium">Uploading &amp; extracting CV…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">Drop CV here or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PDF only — max 10MB</p>
                  </>
                )}
              </label>

              {cvError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{cvError}</p>}
            </div>

            {/* Employee list */}
            {employees.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h2 className="font-semibold text-gray-800">Team CVs ({employees.length})</h2>
                <div className="space-y-3">
                  {employees.map(emp => (
                    <div key={emp.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      {editingEmp && (editingEmp as any)._id === emp.id ? (
                        /* Edit mode */
                        <div className="space-y-3">
                          {[['name','Full Name'],['role','Job Title / Role'],['bio','Professional Bio']] .map(([field, label]) => (
                            <div key={field}>
                              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                              {field === 'bio'
                                ? <textarea rows={3} value={(editingEmp as any)[field]} onChange={e => setEditingEmp((prev: any) => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                : <input type="text" value={(editingEmp as any)[field]} onChange={e => setEditingEmp((prev: any) => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              }
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <button onClick={() => updateEmployee({ ...emp, ...(editingEmp as any) })}
                              className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition">Save Changes</button>
                            <button onClick={() => setEditingEmp(null)}
                              className="px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{emp.name || 'Unknown'}</p>
                              <p className="text-xs text-blue-600 font-medium">{emp.role || 'No role'}</p>
                              {emp.experience_years && <p className="text-xs text-gray-400">{emp.experience_years} years experience</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                              <button onClick={() => setEditingEmp({ ...(emp as any), _id: emp.id })}
                                className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">Edit</button>
                              <a href={emp.cv_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">
                                View CV
                              </a>
                              <button onClick={() => { navigator.clipboard.writeText(emp.cv_url); }}
                                className="text-xs text-gray-500 hover:text-green-600 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">Copy Link</button>
                              <button onClick={() => deleteEmployee(emp.id)}
                                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 border border-red-100">Remove</button>
                            </div>
                          </div>
                          {emp.bio && <p className="text-xs text-gray-600 leading-relaxed">{emp.bio}</p>}
                          {emp.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {emp.skills.map((s: string, i: number) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                              ))}
                            </div>
                          )}
                          <div className="pt-1 border-t border-gray-100">
                            <p className="text-xs text-gray-400 break-all">
                              <span className="font-medium text-gray-500">CV link: </span>{emp.cv_url}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {employees.length === 0 && !cvUploading && (
              <p className="text-xs text-gray-400 text-center py-4">No employee CVs added yet. Upload a PDF above to get started.</p>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* PRICING TAB — items/goods/services with unit prices          */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'pricing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-800">Pricing Catalogue</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add your products, goods, and services with unit prices. When generating a proposal, the system checks here first for pricing.</p>
              </div>

              {/* Goods / Service sub-tabs */}
              <div className="flex gap-2">
                {(['goods', 'service'] as const).map(ct => (
                  <button key={ct} onClick={() => setPricingTab(ct)}
                    className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition ${pricingTab === ct ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {ct === 'goods' ? 'Products / Goods' : 'Services'}
                  </button>
                ))}
              </div>

              {/* Excel drop zone */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Bulk Import from Excel</label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${xlsxParsing ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={xlsxParsing}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleXlsxFile(f); e.target.value = ''; }} />
                  {xlsxParsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                      <p className="text-sm text-blue-600 font-medium">Reading file…</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-700">Drop Excel / CSV here or click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">The system detects item/product, price, unit, and description columns automatically</p>
                    </>
                  )}
                </label>
              </div>

              {/* Manual add form */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Add Item Manually</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} placeholder="Item / product name *"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
                  <input type="text" value={newItem.description} onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))} placeholder="Description / specs"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
                  <input type="text" value={newItem.unit} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value }))} placeholder="Unit (e.g. piece, kg, month)"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={newItem.unit_price} onChange={e => setNewItem(n => ({ ...n, unit_price: e.target.value }))} placeholder="Unit Price (RWF)" min="0" step="0.01"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={newItem.margin_pct} onChange={e => setNewItem(n => ({ ...n, margin_pct: e.target.value }))} placeholder="Margin %" min="0" step="0.1"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={newItem.currency} onChange={e => setNewItem(n => ({ ...n, currency: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="RWF">RWF</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => newItem.name.trim() && saveItem({ ...newItem, category: pricingTab })}
                    disabled={!newItem.name.trim() || savingItem}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                    {savingItem ? 'Saving...' : '+ Add Item'}
                  </button>
                </div>
              </div>

              {pricingMsg && <p className={`text-xs text-center font-medium ${pricingMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{pricingMsg}</p>}
            </div>

            {/* Existing items list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">{pricingTab === 'goods' ? 'Products / Goods' : 'Services'} ({pricingItems.filter(i => i.category === pricingTab).length})</h3>
              {pricingItems.filter(i => i.category === pricingTab).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No {pricingTab} added yet. Add manually or import from Excel above.</p>
              ) : (
                <div className="space-y-2">
                  {pricingItems.filter(i => i.category === pricingTab).map((item) => {
                    const idx = pricingItems.indexOf(item);
                    const isEditing = editingItem?.id === item.id;
                    const finalPrice = (Number(item.unit_price) || 0) * (1 + (Number(item.margin_pct) || 0) / 100);
                    return (
                      <div key={item.id || idx} className="border border-gray-200 rounded-lg p-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={editingItem!.name} onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Name"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 col-span-2" />
                              <input type="text" value={editingItem!.description} onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : prev)} placeholder="Description"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 col-span-2" />
                              <input type="text" value={editingItem!.unit} onChange={e => setEditingItem(prev => prev ? { ...prev, unit: e.target.value } : prev)} placeholder="Unit"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="number" value={editingItem!.unit_price} onChange={e => setEditingItem(prev => prev ? { ...prev, unit_price: e.target.value } : prev)} placeholder="Price"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="number" value={editingItem!.margin_pct} onChange={e => setEditingItem(prev => prev ? { ...prev, margin_pct: e.target.value } : prev)} placeholder="Margin %"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <select value={editingItem!.currency} onChange={e => setEditingItem(prev => prev ? { ...prev, currency: e.target.value } : prev)}
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="RWF">RWF</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveItem(editingItem!)} disabled={savingItem}
                                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
                              <button onClick={() => setEditingItem(null)}
                                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{item.name}</p>
                              {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                              <div className="flex flex-wrap gap-3 mt-1">
                                <span className="text-xs text-gray-600">Price: <span className="font-semibold">{Number(item.unit_price).toLocaleString()} {item.currency}</span>{item.unit ? ` /${item.unit}` : ''}</span>
                                {Number(item.margin_pct) > 0 && (
                                  <span className="text-xs text-blue-600">Margin: {item.margin_pct}% → {finalPrice.toLocaleString()} {item.currency}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => setEditingItem({ ...item })} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">Edit</button>
                              {item.id && <button onClick={() => deleteItem(item.id!)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 border border-red-100">Remove</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Excel confirm modal */}
            {xlsxPreview && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">Confirm Import — {xlsxPreview.length} items</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Remove unwanted rows, set a margin, then import.</p>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
                    <label className="text-xs font-semibold text-gray-600 shrink-0">Margin % for all:</label>
                    <input type="number" value={xlsxGlobalMargin} onChange={e => setXlsxGlobalMargin(e.target.value)} min="0" step="0.1"
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <div className="flex gap-2 ml-auto text-xs">
                      {xlsxPreview.filter(i => !i._exists).length > 0 && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">{xlsxPreview.filter(i => !i._exists).length} new</span>}
                      {xlsxPreview.filter(i => i._exists).length > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{xlsxPreview.filter(i => i._exists).length} update</span>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white sticky top-0 border-b border-gray-100 text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-4 py-2">Item</th>
                          <th className="text-right px-3 py-2">Price</th>
                          <th className="text-left px-3 py-2">Unit</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="w-8 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {xlsxPreview.map((item, i) => (
                          <tr key={i} className="bg-white hover:bg-gray-50/60">
                            <td className="px-4 py-2 font-medium text-gray-800">{item.name}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{item.unit_price || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{item.unit || '—'}</td>
                            <td className="px-3 py-2">
                              {item._exists
                                ? <span className="text-blue-600 font-medium">update</span>
                                : <span className="text-green-600 font-medium">new</span>}
                            </td>
                            <td className="pr-3 py-2 text-center">
                              <button
                                onClick={() => setXlsxPreview(prev => prev ? prev.filter((_, j) => j !== i) : prev)}
                                className="text-gray-300 hover:text-red-500 transition font-bold text-base leading-none"
                                title="Remove this item">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {xlsxPreview.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">All items removed. Click Cancel to go back.</p>
                    )}
                  </div>
                  <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
                    <button onClick={confirmXlsxImport} disabled={xlsxSaving || xlsxPreview.length === 0}
                      className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {xlsxSaving ? 'Importing...' : `Import ${xlsxPreview.length} item${xlsxPreview.length !== 1 ? 's' : ''}`}
                    </button>
                    <button onClick={() => setXlsxPreview(null)} disabled={xlsxSaving}
                      className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* SUPPLIERS TAB — supplier directory + quote links + inbox   */}
        {/* ════════════════════════════════════════════════════════ */}
        {tab === 'suppliers' && (
          <div className="space-y-6">
            {/* Add supplier */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-800">Suppliers</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add suppliers with their email and WhatsApp. When an item is missing from your catalogue, send them a quote request link.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={newSupplier.name} onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))} placeholder="Supplier name *"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
                <input type="text" value={newSupplier.label} onChange={e => setNewSupplier(s => ({ ...s, label: e.target.value }))} placeholder="Label / category (e.g. IT, Construction)"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="email" value={newSupplier.contact_email} onChange={e => setNewSupplier(s => ({ ...s, contact_email: e.target.value }))} placeholder="Email"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" value={newSupplier.whatsapp} onChange={e => setNewSupplier(s => ({ ...s, whatsapp: e.target.value }))} placeholder="WhatsApp number (e.g. +2507XXXXXXXX)"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" value={newSupplier.notes} onChange={e => setNewSupplier(s => ({ ...s, notes: e.target.value }))} placeholder="Notes"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
              </div>
              <button onClick={() => newSupplier.name.trim() && saveSupplier({ ...newSupplier })}
                disabled={!newSupplier.name.trim() || savingSupplier}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {savingSupplier ? 'Saving...' : '+ Add Supplier'}
              </button>
              {supplierMsg && <p className={`text-xs text-center font-medium ${supplierMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{supplierMsg}</p>}
            </div>

            {/* Supplier list */}
            {suppliersData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
                <h3 className="font-semibold text-gray-800 text-sm">Your Suppliers ({suppliersData.length})</h3>
                <div className="space-y-2">
                  {suppliersData.map((s, idx) => {
                    const isEditing = editingSupplier?.id === s.id;
                    return (
                      <div key={s.id || idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={editingSupplier!.name} onChange={e => setEditingSupplier(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Name"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 col-span-2" />
                              <input type="text" value={editingSupplier!.label} onChange={e => setEditingSupplier(prev => prev ? { ...prev, label: e.target.value } : prev)} placeholder="Label"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="email" value={editingSupplier!.contact_email} onChange={e => setEditingSupplier(prev => prev ? { ...prev, contact_email: e.target.value } : prev)} placeholder="Email"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="text" value={editingSupplier!.whatsapp} onChange={e => setEditingSupplier(prev => prev ? { ...prev, whatsapp: e.target.value } : prev)} placeholder="WhatsApp"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="text" value={editingSupplier!.notes} onChange={e => setEditingSupplier(prev => prev ? { ...prev, notes: e.target.value } : prev)} placeholder="Notes"
                                className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 col-span-2" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveSupplier(editingSupplier!)} disabled={savingSupplier}
                                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
                              <button onClick={() => setEditingSupplier(null)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                {s.label && <span className="inline-block mt-0.5 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{s.label}</span>}
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {s.contact_email && <span className="text-xs text-gray-500">{s.contact_email}</span>}
                                  {s.whatsapp && <span className="text-xs text-gray-500">{s.whatsapp}</span>}
                                </div>
                                {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                              </div>
                              <div className="flex flex-wrap gap-1.5 shrink-0">
                                {/* Send email */}
                                {s.contact_email && (
                                  <button onClick={async () => {
                                    setShowQuoteBuilder(true); setQuoteSupplier(s.name);
                                    setQuoteTitle(`Price Request from ${company.company_name || 'PryroTender'}`);
                                  }} className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 border border-blue-200">Quote</button>
                                )}
                                {/* WhatsApp */}
                                {s.whatsapp && (
                                  <a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 border border-green-200">WhatsApp</a>
                                )}
                                <button onClick={() => setEditingSupplier({ ...s })} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">Edit</button>
                                {s.id && <button onClick={() => deleteSupplier(s.id!)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 border border-red-100">Remove</button>}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quote link builder */}
            {showQuoteBuilder && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 text-sm">Create Quote Request Link</h3>
                  <button onClick={() => { setShowQuoteBuilder(false); setQuoteLink(''); setQuoteItems([{ name: '', description: '', unit: '', qty: 1 }]); }}
                    className="text-xs text-gray-400 hover:text-gray-700">✕ Close</button>
                </div>
                <p className="text-xs text-gray-400">Add the items you need priced. A link will be generated that you can email or WhatsApp to the supplier. They fill in prices on a branded form with your logo.</p>

                <input type="text" value={quoteTitle} onChange={e => setQuoteTitle(e.target.value)} placeholder="Quote title (e.g. Price Request for Office Supplies)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                <select value={quoteSupplier} onChange={e => setQuoteSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select supplier (optional)</option>
                  {suppliersData.map((s, i) => <option key={s.id || i} value={s.name}>{s.name}</option>)}
                </select>

                {/* Quote items */}
                <div className="space-y-2">
                  {quoteItems.map((qi, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5">
                      <input type="text" value={qi.name} onChange={e => setQuoteItems(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))} placeholder="Item name"
                        className="col-span-5 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input type="text" value={qi.unit} onChange={e => setQuoteItems(prev => prev.map((p, j) => j === i ? { ...p, unit: e.target.value } : p))} placeholder="Unit"
                        className="col-span-2 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input type="number" value={qi.qty} onChange={e => setQuoteItems(prev => prev.map((p, j) => j === i ? { ...p, qty: Number(e.target.value) } : p))} placeholder="Qty" min="1"
                        className="col-span-2 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input type="text" value={qi.description} onChange={e => setQuoteItems(prev => prev.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} placeholder="Description"
                        className="col-span-2 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <button onClick={() => setQuoteItems(prev => prev.filter((_, j) => j !== i))} disabled={quoteItems.length === 1}
                        className="col-span-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-30">✕</button>
                    </div>
                  ))}
                  <button onClick={() => setQuoteItems(prev => [...prev, { name: '', description: '', unit: '', qty: 1 }])}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add row</button>
                </div>

                <button onClick={createQuoteLink} disabled={creatingQuote || !quoteItems.some(i => i.name.trim())}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {creatingQuote ? 'Generating...' : 'Generate Quote Link'}
                </button>

                {quoteLink && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-green-700">✓ Link created!</p>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={quoteLink}
                        className="flex-1 px-3 py-2 bg-white border border-green-200 rounded text-xs text-gray-600" />
                      <button onClick={() => navigator.clipboard.writeText(quoteLink)}
                        className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">Copy</button>
                    </div>
                    {/* Email the link */}
                    {(() => {
                      const supp = suppliersData.find(s => s.name === quoteSupplier);
                      return supp?.contact_email ? (
                        <a href={`mailto:${supp.contact_email}?subject=${encodeURIComponent(quoteTitle)}&body=${encodeURIComponent(`Hello ${supp.name},\n\nWe would like to request pricing for the following items. Please click the link below to fill in your prices:\n\n${quoteLink}\n\nThank you,\n${company.company_name || ''}`)}`}
                          className="inline-block mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium">Open in email →</a>
                      ) : null;
                    })()}
                    {/* WhatsApp the link */}
                    {(() => {
                      const supp = suppliersData.find(s => s.name === quoteSupplier);
                      return supp?.whatsapp ? (
                        <a href={`https://wa.me/${supp.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${supp.name}, we would like to request pricing. Please fill in your prices here: ${quoteLink}`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-block mt-1 ml-2 text-xs text-green-600 hover:text-green-700 font-medium">Send on WhatsApp →</a>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Submitted quotes inbox */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Quote Responses ({quoteRequests.filter(q => q.status === 'submitted').length} new)</h3>
              {quoteRequests.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No quote requests sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {quoteRequests.map((qr) => (
                    <div key={qr.id} className={`border rounded-lg p-3 ${qr.status === 'submitted' ? 'border-green-300 bg-green-50/50' : qr.status === 'accepted' ? 'border-blue-200' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{qr.title}</p>
                          <p className="text-xs text-gray-400">
                            {qr.suppliers?.name ? `→ ${qr.suppliers.name} · ` : ''}{qr.items?.length || 0} items · {new Date(qr.created_at).toLocaleDateString()}
                          </p>
                          <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            qr.status === 'submitted' ? 'bg-green-100 text-green-700' :
                            qr.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                            qr.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{qr.status}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {qr.status === 'submitted' && (
                            <button onClick={() => setExpandedQuote(expandedQuote === qr.id ? null : qr.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 border border-blue-200">View</button>
                          )}
                          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/supplier-quote/${qr.token}`)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">Copy Link</button>
                        </div>
                      </div>

                      {/* Expanded submitted quote */}
                      {expandedQuote === qr.id && qr.response && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          <table className="w-full text-xs">
                            <thead className="text-gray-500 uppercase tracking-wide">
                              <tr><th className="text-left py-1">Item</th><th className="text-right py-1 px-2">Unit Price</th><th className="text-center py-1 px-2">Qty</th><th className="text-right py-1 px-2">Total</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(qr.response as any[]).map((item, i) => (
                                <tr key={i}>
                                  <td className="py-1.5 font-medium text-gray-800">{item.name}</td>
                                  <td className="py-1.5 text-right px-2 text-gray-600">{Number(item.unit_price).toLocaleString()} RWF</td>
                                  <td className="py-1.5 text-center px-2 text-gray-500">{item.qty}</td>
                                  <td className="py-1.5 text-right px-2 font-semibold text-gray-700">{Number(item.total).toLocaleString()} RWF</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {qr.response_notes && <p className="text-xs text-gray-500 mt-1">Notes: {qr.response_notes}</p>}

                          {/* Accept with margin */}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                            <label className="text-xs font-semibold text-gray-600">Margin %:</label>
                            <input type="number" value={acceptMargin} onChange={e => setAcceptMargin(e.target.value)} min="0" step="0.1"
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            <button onClick={() => acceptQuote(qr.id)} disabled={acceptingQuote === qr.id}
                              className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                              {acceptingQuote === qr.id ? 'Accepting...' : '✓ Accept & Save to Catalogue'}
                            </button>
                          </div>
                          {quoteActionMsg && <p className="text-xs text-green-600 font-medium mt-1">{quoteActionMsg}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
