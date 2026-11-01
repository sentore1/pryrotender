'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileUploadZone } from '@/components/FileUploadZone';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// ─── Types ────────────────────────────────────────────────────────────────
interface FormField {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  section: string;
  filled: boolean;
}

// ─── Download base64 PDF ──────────────────────────────────────────────────
function downloadPdf(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteArr   = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArr], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Download DOCX ────────────────────────────────────────────────────────
async function downloadFilledDocx(formText: string, fields: FormField[], filename: string) {
  let filled = formText;
  for (const f of fields) {
    if (f.value.trim()) {
      const escaped = f.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filled = filled.replace(new RegExp(escaped, 'g'), f.value);
    }
  }
  const children: Paragraph[] = filled.split('\n').map(line => {
    const t = line.trim();
    if (!t) return new Paragraph({ text: '' });
    if (t.match(/^[A-Z0-9\s&/]+$/) && t.length < 60)
      return new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 } });
    return new Paragraph({ children: [new TextRun({ text: t, size: 22, font: 'Calibri' })], spacing: { after: 60 } });
  });
  const doc = new Document({
    styles: { paragraphStyles: [{ id: 'Heading2', name: 'Heading 2', run: { bold: true, size: 26, font: 'Calibri' } }] },
    sections: [{ children }],
  });
  saveAs(await Packer.toBlob(doc), filename);
}

// ─── Profile banner ───────────────────────────────────────────────────────
function ProfileBanner({ missing }: { missing: string[] }) {
  if (!missing.length) return null;
  return (
    <div className="mb-4 px-4 py-3 bg-orange-500 rounded-lg">
      <p className="text-xs font-semibold text-white">Company profile incomplete</p>
      <p className="text-xs text-orange-100 mt-0.5">
        Missing: <span className="font-medium text-white">{missing.join(', ')}</span>.{' '}
        <a href="/settings" className="underline text-orange-100 hover:text-white">Fill in settings</a> so more fields get auto-filled.
      </p>
    </div>
  );
}

// ─── Tab 1: Smart Fill ────────────────────────────────────────────────────
function SmartFillTab() {
  const [file,     setFile]     = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [fields,   setFields]   = useState<FormField[]>([]);
  const [formText, setFormText] = useState('');
  const [missingProfile, setMissingProfile] = useState<string[]>([]);

  const reset = () => { setFile(null); setFields([]); setFormText(''); setError(''); setMissingProfile([]); };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true); setError(''); setFields([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/extract-form-fields', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setFields(data.fields || []);
        setFormText(data.formText || '');
        if (data.profileCompleteness?.missing?.length) setMissingProfile(data.profileCompleteness.missing);
      } else { setError(data.error || 'Failed to extract fields.'); }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const updateField = (id: string, value: string) =>
    setFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));

  const sections = fields.reduce<Record<string, FormField[]>>((acc, f) => {
    const sec = f.section || 'General';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(f);
    return acc;
  }, {});

  const filledCount  = fields.filter(f => f.value.trim()).length;
  const pendingCount = fields.filter(f => !f.value.trim()).length;
  const baseName     = file?.name?.replace(/\.[^.]+$/, '') || 'form';

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <FileUploadZone
        file={file} accept=".pdf" acceptLabel="PDF"
        onFile={f => { setFile(f); setFields([]); setError(''); }}
        onError={setError}
      />

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* CTA button */}
      {file && !fields.length && (
        <button onClick={handleExtract} disabled={loading}
          className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm transition-colors">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Extracting &amp; filling fields…
              </span>
            : 'Extract &amp; Fill Fields with AI'}
        </button>
      )}

      {/* Results */}
      {fields.length > 0 && (
        <div className="space-y-3">

          {/* Stats + actions bar */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">{filledCount}/{fields.length} fields filled</span>
              {pendingCount > 0 && (
                <span className="text-xs text-gray-400">· {pendingCount} need input</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadFilledDocx(formText, fields, `${baseName}_filled.docx`)}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                ↓ Download DOCX
              </button>
              <button onClick={reset}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Reset
              </button>
            </div>
          </div>

          {missingProfile.length > 0 && <ProfileBanner missing={missingProfile} />}

          {/* Field sections */}
          {Object.entries(sections).map(([section, sectionFields]) => (
            <div key={section} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{section}</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionFields.map(field => (
                  <div key={field.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">{field.label}</label>
                      {field.value.trim()
                        ? <span className="text-xs text-green-600 font-medium">✓ filled</span>
                        : <span className="text-xs text-gray-400">needs input</span>}
                    </div>
                    <input
                      type="text"
                      value={field.value}
                      onChange={e => updateField(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors
                        ${field.value.trim() ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white placeholder:text-gray-400'}`}
                    />
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{field.placeholder}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Bottom download */}
          <button onClick={() => downloadFilledDocx(formText, fields, `${baseName}_filled.docx`)}
            className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 text-sm transition-colors">
            ↓ Download Filled Form as DOCX
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: PDF Fill ──────────────────────────────────────────────────────
function PdfFillTab() {
  const [file,         setFile]         = useState<File | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [filledPdfB64, setFilledPdfB64] = useState('');
  const [fieldCount,   setFieldCount]   = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [missingProfile, setMissingProfile] = useState<string[]>([]);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: p } = await supabase.from('profiles')
          .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio')
          .eq('id', user.id).single();
        if (p) setMissingProfile(Object.entries(p).filter(([, v]) => !v || String(v).trim() === '').map(([k]) => k.replace(/^company_/, '').replace(/_/g, ' ')));
      } catch { /**/ } finally { setProfileChecked(true); }
    })();
  }, []);

  const reset = () => { setFile(null); setFilledPdfB64(''); setError(''); setFieldCount(0); setSkippedCount(0); };

  const handleFill = async () => {
    if (!file) return;
    setLoading(true); setError(''); setFilledPdfB64('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/fill-form', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setFilledPdfB64(data.pdf);
        setFieldCount(data.fieldCount ?? 0);
        setSkippedCount(data.skippedCount ?? 0);
        if (data.profileCompleteness?.missing?.length) setMissingProfile(data.profileCompleteness.missing);
      } else { setError(data.error || 'Failed to process form.'); }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const baseName = file?.name?.replace(/\.[^.]+$/, '') || 'form';

  return (
    <div className="space-y-3">
      {profileChecked && !filledPdfB64 && <ProfileBanner missing={missingProfile} />}

      <FileUploadZone
        file={file} accept=".pdf" acceptLabel="PDF"
        onFile={f => { setFile(f); setFilledPdfB64(''); setError(''); }}
        onError={setError}
      />

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {file && !filledPdfB64 && (
        <button onClick={handleFill} disabled={loading}
          className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm transition-colors">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Filling form…
              </span>
            : 'Fill Form with AI'}
        </button>
      )}

      {filledPdfB64 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Top bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">
                {fieldCount} field{fieldCount !== 1 ? 's' : ''} filled
                {skippedCount > 0 && <span className="text-gray-400 font-normal"> · {skippedCount} skipped</span>}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadPdf(filledPdfB64, `${baseName}_filled.pdf`)}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                ↓ Download PDF
              </button>
              <button onClick={reset}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Reset
              </button>
            </div>
          </div>

          {missingProfile.length > 0 && (
            <div className="px-4 pt-3"><ProfileBanner missing={missingProfile} /></div>
          )}

          {/* PDF preview */}
          <div className="bg-gray-50" style={{ height: '65vh' }}>
            <iframe src={`data:application/pdf;base64,${filledPdfB64}`} className="w-full h-full" title="Filled form preview" />
          </div>
          <p className="text-xs text-gray-400 text-center py-2">
            Preview may not render in all browsers — use Download above.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function FormFillerPage() {
  const [tab, setTab] = useState<'smart' | 'pdf'>('smart');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Form Filler</h1>
            <p className="text-xs text-gray-400 mt-0.5">Upload a PDF form — AI fills it using your company profile</p>
          </div>
          {/* Tab pills */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
            {(['smart', 'pdf'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize
                  ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'smart' ? 'Smart Fill' : 'PDF Fill'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 w-full max-w-3xl mx-auto">
        {tab === 'smart' ? <SmartFillTab /> : <PdfFillTab />}
      </div>
    </div>
  );
}
