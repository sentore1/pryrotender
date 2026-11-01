'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { FileUploadZone } from '@/components/FileUploadZone';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

const TNR = 'Times New Roman';
const BODY_SIZE = 22;   // 11pt in half-points
const H2_SIZE   = 26;   // 13pt
const H3_SIZE   = 24;   // 12pt
const BLACK     = '000000';

/** Detect image type from ArrayBuffer magic bytes */
function detectImageType(buf: ArrayBuffer): 'png' | 'jpg' | 'gif' | 'bmp' {
  const bytes = new Uint8Array(buf.slice(0, 4));
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'jpg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'gif';
  return 'png'; // default
}

/**
 * Get the natural pixel dimensions of an image from its ArrayBuffer.
 * Returns { width, height } in pixels, or null if undetectable.
 */
async function getImageDimensions(buf: ArrayBuffer): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    try {
      const blob = new Blob([buf]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    } catch { resolve(null); }
  });
}

/**
 * Scale image to fit within maxW × maxH while preserving aspect ratio.
 * Returns { width, height } in pixels (for docx transformation).
 */
function scaleToFit(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const ratio = Math.min(maxW / naturalW, maxH / naturalH);
  return {
    width:  Math.round(naturalW * ratio),
    height: Math.round(naturalH * ratio),
  };
}

/** Strip ALL markdown symbols: **, *, ##, ---  from a string */
function stripAllMd(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')        // *italic* → italic
    .replace(/^#{1,6}\s+/, '')            // ## heading
    .replace(/^[-*]{3,}$/, '');           // --- or ***
}

/** Split a line on **bold** markers and return TextRun children, stripping all other * */
function boldRuns(line: string, size = BODY_SIZE, color = BLACK): TextRun[] {
  // Process **bold** pairs first, then strip every remaining lone *
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  const runs: TextRun[] = [];
  for (const p of parts) {
    if (p.length === 0) continue;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      // Bold run — strip the markers
      runs.push(new TextRun({ text: p.slice(2, -2), bold: true, size, color, font: TNR }));
    } else {
      // Plain run — strip ALL remaining * characters
      const clean = p.replace(/\*/g, '');
      if (clean.length > 0) {
        runs.push(new TextRun({ text: clean, size, color, font: TNR }));
      }
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: '', size, color, font: TNR })];
}

/** Detect whether a line is a markdown table pipe row */
function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

/** Detect separator row: |---|---| */
function isSeparatorRow(line: string): boolean {
  return isTableRow(line) && /^\|[\s:|-]+\|$/.test(line.trim());
}

/** Parse a markdown pipe table block into a docx Table */
function buildDocxTable(tableLines: string[]): Table {
  const dataRows = tableLines.filter(l => !isSeparatorRow(l));

  const rows = dataRows.map((rowLine, rowIdx) => {
    const cells = rowLine
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());

    return new TableRow({
      children: cells.map(cellText =>
        new TableCell({
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 4, color: BLACK },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
            left:   { style: BorderStyle.SINGLE, size: 4, color: BLACK },
            right:  { style: BorderStyle.SINGLE, size: 4, color: BLACK },
          },
          shading: rowIdx === 0
            ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9D9D9' }
            : { type: ShadingType.CLEAR, color: 'auto', fill: 'FFFFFF' },
          children: [new Paragraph({
            children: boldRuns(cellText, 20, BLACK),
            spacing: { before: 40, after: 40 },
          })],
        })
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

async function urlToBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch { return null; }
}

async function downloadProposalDocx(
  content: string,
  filename: string,
  logoUrl?: string,
  signatureUrl?: string,
  companyName?: string,
  companyAddress?: string,
  companyPhone?: string,
  companyEmail?: string,
  companyWebsite?: string,
  refNumber?: string,
) {
  const children: (Paragraph | Table)[] = [];

  // ── HEADER: Logo only (full width, natural proportions) ─────
  if (logoUrl) {
    const buf = await urlToBuffer(logoUrl);
    if (buf) {
      const imgType = detectImageType(buf);
      const natural = await getImageDimensions(buf);
      const { width, height } = natural
        ? scaleToFit(natural.width, natural.height, 200, 80)
        : { width: 160, height: 60 };
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: buf, transformation: { width, height }, type: imgType })],
        spacing: { after: 120 },
      }));
    }
  }

  // ── HEADER: Company info lines ───────────────────────────────
  const headerInfoLines: string[] = [
    companyName    || '',
    companyAddress || '',
    companyPhone   || '',
    companyEmail   || '',
    companyWebsite || '',
    refNumber ? `Ref: ${refNumber}` : '',
    `Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  ].filter(Boolean);

  for (const info of headerInfoLines) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: info,
        size: 20,
        bold: info === companyName,
        color: BLACK,
        font: TNR,
      })],
      spacing: { after: 40 },
    }));
  }

  // Spacer before body — NO divider line
  children.push(new Paragraph({ text: '', spacing: { after: 240 } }));

  // ── BODY ─────────────────────────────────────────────────────
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Markdown table block ──
    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && (isTableRow(lines[i]) || isSeparatorRow(lines[i]))) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.filter(l => !isSeparatorRow(l)).length > 0) {
        children.push(buildDocxTable(tableLines));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
      continue;
    }

    // ── H2 heading (no underline) ──
    if (line.startsWith('## ')) {
      const text = stripAllMd(line.slice(3).trim());
      children.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: H2_SIZE, color: BLACK, font: TNR })],
        spacing: { before: 320, after: 120 },
      }));
      i++; continue;
    }

    // ── H3 heading ──
    if (line.startsWith('### ')) {
      const text = stripAllMd(line.slice(4).trim());
      children.push(new Paragraph({
        children: [new TextRun({ text, bold: true, size: H3_SIZE, color: BLACK, font: TNR })],
        spacing: { before: 200, after: 80 },
      }));
      i++; continue;
    }

    // ── Horizontal rule — skip entirely (no line rendered) ──
    if (/^[-*]{3,}$/.test(line.trim())) {
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      i++; continue;
    }

    // ── Bullet point (* text or - text) ──
    const bulletMatch = line.match(/^[*-]\s+(.+)/);
    if (bulletMatch) {
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: boldRuns(bulletMatch[1]),
        spacing: { after: 60 },
      }));
      i++; continue;
    }

    // ── Empty line ──
    if (line.trim() === '') {
      children.push(new Paragraph({ text: '', spacing: { after: 60 } }));
      i++; continue;
    }

    // ── Regular paragraph ──
    children.push(new Paragraph({
      children: boldRuns(line),
      spacing: { after: 80 },
    }));
    i++;
  }

  // ── FOOTER: company name + stamp (no divider line) ───────────
  children.push(new Paragraph({ text: '', spacing: { before: 480 } }));

  if (companyName) {
    children.push(new Paragraph({
      children: [new TextRun({ text: companyName, bold: true, size: BODY_SIZE, color: BLACK, font: TNR })],
      spacing: { after: 40 },
    }));
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Authorized Signatory', size: 20, color: BLACK, font: TNR })],
    spacing: { after: 120 },
  }));

  if (signatureUrl) {
    const buf = await urlToBuffer(signatureUrl);
    if (buf) {
      const imgType = detectImageType(buf);
      const natural = await getImageDimensions(buf);
      const { width, height } = natural
        ? scaleToFit(natural.width, natural.height, 200, 100)
        : { width: 180, height: 80 };
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: buf, transformation: { width, height }, type: imgType })],
        spacing: { before: 60 },
      }));
    }
  }

  // ── BUILD AND SAVE ───────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: TNR, size: BODY_SIZE, color: BLACK },
        },
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

type ProposalData = {
  content: string;
  proposalId?: string;
  logoUrl?: string;
  signatureUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  refNumber?: string;
};

export default function AnalyseTenderPage() {
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [view, setView] = useState<'analysis' | 'proposal'>('analysis');

  // Email composer
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Load the subscriber's company name once, so we can sign composed emails.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.id) {
        const { data: p } = await supabase.from('profiles').select('company_name').eq('id', user.id).maybeSingle();
        if (p?.company_name) setCompanyName(p.company_name);
      }
    });
  }, []);

  const reset = () => {
    setFile(null); setPastedText(''); setAnalysis(''); setError('');
    setChatInput(''); setProposal(null); setView('analysis');
    setContactEmails([]); setShowEmailModal(false);
  };

  const canAnalyse = inputTab === 'upload' ? !!file : pastedText.trim().length > 20;

  const handleAnalyse = async (f: File | null = file) => {
    if (!canAnalyse) return;
    setLoading(true); setError(''); setAnalysis(''); setProposal(null); setView('analysis');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fd = new FormData();

      if (inputTab === 'paste') {
        // Wrap pasted text as a plain-text file blob
        const blob = new Blob([pastedText], { type: 'text/plain' });
        fd.append('file', blob, 'pasted_tender.txt');
      } else {
        fd.append('file', f!);
      }
      if (user?.id) fd.append('userId', user.id);

      const res = await fetch('/api/analyse-tender', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setContactEmails(data.contactEmails || []);
      } else setError(data.error || 'Analysis failed.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const sendFollowUp = async () => {
    if (!chatInput.trim() || !analysis) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/adjust-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: analysis, instruction: chatInput }),
      });
      const data = await res.json();
      if (data.success) { setAnalysis(data.proposal); setChatInput(''); }
      else setError(data.error || 'Failed to update analysis.');
    } catch { setError('Network error.'); }
    finally { setChatLoading(false); }
  };

  const handleGenerateProposal = async () => {
    setGenLoading(true); setError('');
    try {
      const tenderName = file?.name?.replace(/\.[^.]+$/, '') || 'Tender';

      // Fetch profile client-side — we have a live session here, no cookie needed
      const { data: { user } } = await supabase.auth.getUser();
      let profileData: any = null;
      let accessToken: string | undefined;

      // Get the current session token to forward to the API
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token;

      if (user?.id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,logo_url,signature_url')
          .eq('id', user.id)
          .single();
        profileData = p;
      }

      const res = await fetch('/api/generate-proposal-from-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ analysis, tenderName }),
      });
      const data = await res.json();
      if (data.success) {
        const refNumber = profileData?.company_ref_prefix
          ? `${profileData.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
          : undefined;

        setProposal({
          content: data.proposal,
          proposalId: data.proposalId,
          // Prefer client-side profile (reliable) over API response
          logoUrl: profileData?.logo_url || data.profile?.logoUrl,
          signatureUrl: profileData?.signature_url || data.profile?.signatureUrl,
          companyName: profileData?.company_name || data.profile?.companyName,
          companyAddress: profileData?.company_address || data.profile?.companyAddress,
          companyPhone: profileData?.company_phone || data.profile?.companyPhone,
          companyEmail: profileData?.company_email || data.profile?.companyEmail,
          companyWebsite: profileData?.company_website || data.profile?.companyWebsite,
          refNumber: refNumber || data.profile?.refNumber,
        });
        setView('proposal');
      } else {
        setError(data.error || 'Failed to generate proposal.');
      }
    } catch { setError('Network error.'); }
    finally { setGenLoading(false); }
  };

  const tenderFilename = file?.name?.replace(/\.[^.]+$/, '') || 'proposal';

  const openEmailModal = (email?: string) => {
    const to = email || contactEmails[0] || '';
    const tenderName = file?.name?.replace(/\.[^.]+$/, '') || 'Tender';
    const signature = companyName ? `\n\nBest regards,\n${companyName}` : '\n\nBest regards,';
    setEmailForm({
      to,
      subject: `Inquiry regarding: ${tenderName}`,
      body: `Dear Sir/Madam,\n\nI am writing in reference to the above tender and would like to express our interest and request further information.${signature}`,
    });
    setEmailStatus('');
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailForm.to.trim() || !emailForm.subject.trim() || !emailForm.body.trim()) {
      setEmailStatus('Please fill in the recipient, subject, and body.');
      return;
    }
    setSendingEmail(true); setEmailStatus('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ to: emailForm.to, subject: emailForm.subject, body: emailForm.body }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus('✓ Email sent successfully!');
        setTimeout(() => { setShowEmailModal(false); setEmailStatus(''); }, 1500);
      } else {
        setEmailStatus(data.error || 'Failed to send email.');
      }
    } catch { setEmailStatus('Network error.'); }
    setSendingEmail(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-800">Analyse Tender</h1>
            <p className="text-xs text-gray-400 mt-0.5">Upload a tender document and AI will analyse it based on your company profile</p>
          </div>
          {analysis && (
            <div className="flex gap-1">
              <button onClick={() => setView('analysis')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${view === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Analysis
              </button>
              {proposal && (
                <button onClick={() => setView('proposal')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${view === 'proposal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Proposal
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 w-full">

        {view === 'analysis' && (
          <>
            {/* Input tabs: Upload or Paste */}
            {!analysis && (
              <div className="mb-4">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
                  {(['upload', 'paste'] as const).map(t => (
                    <button key={t} onClick={() => setInputTab(t)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all capitalize
                        ${inputTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {t === 'upload' ? 'Upload File' : 'Paste Text'}
                    </button>
                  ))}
                </div>

                {inputTab === 'upload' && (
                  <FileUploadZone
                    file={file}
                    accept=".pdf,.txt,.doc,.docx"
                    acceptLabel="PDF, TXT, DOC"
                    onFile={f => { setFile(f); setAnalysis(''); setError(''); setProposal(null); }}
                    onError={setError}
                  />
                )}

                {inputTab === 'paste' && (
                  <div className="mb-4">
                    <textarea
                      value={pastedText}
                      onChange={e => setPastedText(e.target.value)}
                      placeholder="Paste the tender text here…"
                      rows={10}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none placeholder:text-gray-400"
                    />
                    {pastedText.trim().length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 text-right">{pastedText.trim().length} characters</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && <div className="mb-4 flex justify-end"><div className="px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium inline-block">{error}</div></div>}

            {canAnalyse && !analysis && (
              <div className="flex justify-end mb-4">
                <button onClick={() => handleAnalyse()} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm transition-colors">
                  {loading
                    ? <><span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Analysing…</>
                    : <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>Analyse Tender</>}
                </button>
              </div>
            )}

            {analysis && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Analysis Result</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEmailModal()} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Send Email
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(analysis)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">Copy</button>
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-50">Reset</button>
                  </div>
                </div>

                {contactEmails.length > 0 && (
                  <div className="flex items-start gap-2 flex-wrap text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <span className="text-blue-600 font-medium shrink-0 mt-0.5">Detected contact emails:</span>
                    {contactEmails.map(em => (
                      <button key={em} onClick={() => openEmailModal(em)}
                        className="px-2 py-0.5 bg-white text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition font-medium">
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <MarkdownRenderer content={analysis} />

                <button onClick={handleGenerateProposal} disabled={genLoading}
                  className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                  {genLoading
                    ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Generating Proposal...</span>
                    : '✦ Generate Proposal from Analysis'}
                </button>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <input
                    type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendFollowUp()}
                    placeholder="Ask a follow-up question or request changes..."
                    disabled={chatLoading}
                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={sendFollowUp} disabled={chatLoading || !chatInput.trim()}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {chatLoading ? '...' : 'Ask'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'proposal' && proposal && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generated Proposal</span>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(proposal.content)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">Copy</button>
                <button
                  onClick={() => downloadProposalDocx(proposal.content, `proposal_${tenderFilename}.docx`, proposal.logoUrl, proposal.signatureUrl, proposal.companyName, proposal.companyAddress, proposal.companyPhone, proposal.companyEmail, proposal.companyWebsite, proposal.refNumber)}
                  className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold">
                  ↓ Download DOCX
                </button>
              </div>
            </div>

            {/* Stamp/signature preview */}
            {(proposal.logoUrl || proposal.signatureUrl) && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                {proposal.logoUrl && (
                  <img src={proposal.logoUrl} alt="Company logo" className="h-10 object-contain" />
                )}
                <div className="text-right">
                  {proposal.companyName && <p className="text-xs font-semibold text-gray-700">{proposal.companyName}</p>}
                  {proposal.signatureUrl && (
                    <img src={proposal.signatureUrl} alt="Signature/Stamp" className="h-12 object-contain ml-auto mt-1" />
                  )}
                </div>
              </div>
            )}

            <MarkdownRenderer content={proposal.content} />

            {/* Bottom stamp */}
            {(proposal.logoUrl || proposal.signatureUrl) && (
              <div className="flex items-end justify-between pt-4 border-t border-gray-100">
                <div>
                  {proposal.companyName && <p className="text-xs font-bold text-gray-700">{proposal.companyName}</p>}
                  <p className="text-xs text-gray-400">Authorized Signatory</p>
                </div>
                {proposal.signatureUrl && (
                  <img src={proposal.signatureUrl} alt="Signature" className="h-14 object-contain" />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Email composer modal ── */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Send Email</h3>
                <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">To</label>
                  <input type="email" value={emailForm.to} onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {contactEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {contactEmails.map(em => (
                        <button key={em} type="button" onClick={() => setEmailForm(f => ({ ...f, to: em }))}
                          className={`px-2 py-0.5 text-xs rounded-full border transition ${emailForm.to === em ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Subject</label>
                  <input type="text" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Body</label>
                  <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                {emailStatus && (
                  <p className={`text-xs font-medium ${emailStatus.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{emailStatus}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowEmailModal(false)} disabled={sendingEmail}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm">
                    Cancel
                  </button>
                  <button onClick={sendEmail} disabled={sendingEmail}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                    {sendingEmail ? <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Sending...</> : 'Send Email'}
                  </button>
                </div>
                {emailStatus && !emailStatus.startsWith('✓') && /settings|smtp|gmail|not configured|login failed|connect/i.test(emailStatus) && (
                  <p className="text-xs text-center text-gray-500">
                    Set up your sender account in <a href="/settings" className="text-blue-600 underline">Settings → Email</a>.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
