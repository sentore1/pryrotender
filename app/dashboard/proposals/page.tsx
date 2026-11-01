'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

// ─── DOCX helpers (identical to analyse page) ────────────────────────────────

const TNR = 'Times New Roman';
const BODY_SIZE = 22;
const H2_SIZE = 26;
const H3_SIZE = 24;
const BLACK = '000000';

function detectImageType(buf: ArrayBuffer): 'png' | 'jpg' | 'gif' | 'bmp' {
  const b = new Uint8Array(buf.slice(0, 4));
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xFF && b[1] === 0xD8) return 'jpg';
  if (b[0] === 0x47 && b[1] === 0x49) return 'gif';
  return 'png';
}

async function getImageDimensions(buf: ArrayBuffer): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    try {
      const url = URL.createObjectURL(new Blob([buf]));
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    } catch { resolve(null); }
  });
}

function scaleToFit(w: number, h: number, maxW: number, maxH: number) {
  const r = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

async function urlToBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    return res.ok ? res.arrayBuffer() : null;
  } catch { return null; }
}

function stripAllMd(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]{3,}$/, '');
}

function boldRuns(line: string, size = BODY_SIZE, color = BLACK): TextRun[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  const runs: TextRun[] = [];
  for (const p of parts) {
    if (!p.length) continue;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      runs.push(new TextRun({ text: p.slice(2, -2), bold: true, size, color, font: TNR }));
    } else {
      const clean = p.replace(/\*/g, '');
      if (clean.length) runs.push(new TextRun({ text: clean, size, color, font: TNR }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', size, color, font: TNR })];
}

function isTableRow(line: string) { return line.trim().startsWith('|') && line.trim().endsWith('|'); }
function isSepRow(line: string) { return isTableRow(line) && /^\|[\s:|-]+\|$/.test(line.trim()); }

function buildTable(tableLines: string[]): Table {
  const rows = tableLines.filter(l => !isSepRow(l)).map((rowLine, idx) => {
    const cells = rowLine.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    return new TableRow({
      children: cells.map(cellText => new TableCell({
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 4, color: BLACK },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
          left:   { style: BorderStyle.SINGLE, size: 4, color: BLACK },
          right:  { style: BorderStyle.SINGLE, size: 4, color: BLACK },
        },
        shading: idx === 0
          ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9D9D9' }
          : { type: ShadingType.CLEAR, color: 'auto', fill: 'FFFFFF' },
        children: [new Paragraph({ children: boldRuns(cellText, 20, BLACK), spacing: { before: 40, after: 40 } })],
      })),
    });
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

async function downloadDocx(content: string, filename: string) {
  const { data: { user } } = await supabase.auth.getUser();
  let logoUrl = '', sigUrl = '', companyName = '', companyAddress = '',
      companyPhone = '', companyEmail = '', companyWebsite = '', refNumber = '';

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('logo_url,signature_url,company_name,company_address,company_phone,company_email,company_website,company_ref_prefix')
      .eq('id', user.id)
      .single();
    if (p) {
      logoUrl       = p.logo_url        || '';
      sigUrl        = p.signature_url   || '';
      companyName   = p.company_name    || '';
      companyAddress= p.company_address || '';
      companyPhone  = p.company_phone   || '';
      companyEmail  = p.company_email   || '';
      companyWebsite= p.company_website || '';
      refNumber     = p.company_ref_prefix
        ? `${p.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
        : '';
    }
  }

  const children: (Paragraph | Table)[] = [];

  // ── Logo ────────────────────────────────────────────────────
  if (logoUrl) {
    const buf = await urlToBuffer(logoUrl);
    if (buf) {
      const imgType = detectImageType(buf);
      const nat = await getImageDimensions(buf);
      const { width, height } = nat ? scaleToFit(nat.width, nat.height, 200, 80) : { width: 160, height: 60 };
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: buf, transformation: { width, height }, type: imgType })],
        spacing: { after: 120 },
      }));
    }
  }

  // ── Company header lines ─────────────────────────────────────
  for (const info of [companyName, companyAddress, companyPhone, companyEmail, companyWebsite,
      refNumber ? `Ref: ${refNumber}` : '',
      `Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    ].filter(Boolean)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: info, size: 20, bold: info === companyName, color: BLACK, font: TNR })],
      spacing: { after: 40 },
    }));
  }

  children.push(new Paragraph({ text: '', spacing: { after: 240 } }));

  // ── Body ─────────────────────────────────────────────────────
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isTableRow(line)) {
      const tbl: string[] = [];
      while (i < lines.length && (isTableRow(lines[i]) || isSepRow(lines[i]))) { tbl.push(lines[i]); i++; }
      if (tbl.filter(l => !isSepRow(l)).length > 0) {
        children.push(buildTable(tbl));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
      continue;
    }

    if (line.startsWith('## ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: stripAllMd(line.slice(3).trim()), bold: true, size: H2_SIZE, color: BLACK, font: TNR })],
        spacing: { before: 320, after: 120 },
      }));
      i++; continue;
    }

    if (line.startsWith('### ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: stripAllMd(line.slice(4).trim()), bold: true, size: H3_SIZE, color: BLACK, font: TNR })],
        spacing: { before: 200, after: 80 },
      }));
      i++; continue;
    }

    if (/^[-*]{3,}$/.test(line.trim())) {
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      i++; continue;
    }

    const bm = line.match(/^[*-]\s+(.+)/);
    if (bm) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: boldRuns(bm[1]), spacing: { after: 60 } }));
      i++; continue;
    }

    if (line.trim() === '') {
      children.push(new Paragraph({ text: '', spacing: { after: 60 } }));
      i++; continue;
    }

    children.push(new Paragraph({ children: boldRuns(line), spacing: { after: 80 } }));
    i++;
  }

  // ── Footer ───────────────────────────────────────────────────
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
  if (sigUrl) {
    const buf = await urlToBuffer(sigUrl);
    if (buf) {
      const imgType = detectImageType(buf);
      const nat = await getImageDimensions(buf);
      const { width, height } = nat ? scaleToFit(nat.width, nat.height, 200, 100) : { width: 180, height: 80 };
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: buf, transformation: { width, height }, type: imgType })],
        spacing: { before: 60 },
      }));
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: TNR, size: BODY_SIZE, color: BLACK } } } },
    sections: [{ children }],
  });
  saveAs(await Packer.toBlob(doc), filename);
}

// ─── Page component ───────────────────────────────────────────────────────────

/** Convert markdown to clean HTML for PDF printing */
function mdToHtml(content: string): string {
  const lines = content.split('\n');
  let html = '';
  let inTable = false;
  let tableHtml = '';

  const flush = () => { if (inTable) { html += `<table>${tableHtml}</table>`; tableHtml = ''; inTable = false; } };

  const renderInline = (text: string) =>
    text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*/g, '');

  for (const line of lines) {
    const trimmed = line.trim();

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (/^\|[\s:|-]+\|$/.test(trimmed)) continue; // separator
      inTable = true;
      const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const tag = tableHtml === '' ? 'th' : 'td';
      tableHtml += `<tr>${cells.map(c => `<${tag}>${renderInline(c)}</${tag}>`).join('')}</tr>`;
      continue;
    }

    flush();

    if (trimmed.startsWith('## '))       { html += `<h2>${renderInline(trimmed.slice(3))}</h2>`; continue; }
    if (trimmed.startsWith('### '))      { html += `<h3>${renderInline(trimmed.slice(4))}</h3>`; continue; }
    if (/^[-*]{3,}$/.test(trimmed))     { continue; } // skip hr
    const bm = line.match(/^[*-]\s+(.+)/);
    if (bm)                              { html += `<li>${renderInline(bm[1])}</li>`; continue; }
    if (trimmed === '')                  { html += '<br/>'; continue; }
    html += `<p>${renderInline(line)}</p>`;
  }
  flush();
  return html;
}

async function downloadPdf(content: string, tenderName: string) {
  const { data: { user } } = await supabase.auth.getUser();
  let logoUrl = '', sigUrl = '', companyName = '', companyAddress = '',
      companyPhone = '', companyEmail = '', companyWebsite = '', refNumber = '';

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('logo_url,signature_url,company_name,company_address,company_phone,company_email,company_website,company_ref_prefix')
      .eq('id', user.id)
      .single();
    if (p) {
      logoUrl        = p.logo_url        || '';
      sigUrl         = p.signature_url   || '';
      companyName    = p.company_name    || '';
      companyAddress = p.company_address || '';
      companyPhone   = p.company_phone   || '';
      companyEmail   = p.company_email   || '';
      companyWebsite = p.company_website || '';
      refNumber      = p.company_ref_prefix
        ? `${p.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
        : '';
    }
  }

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const bodyHtml = mdToHtml(content);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${tenderName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; padding: 30mm 20mm; }
  .header-logo { max-width: 180px; max-height: 70px; object-fit: contain; margin-bottom: 10px; display: block; }
  .header-info { font-size: 10pt; margin-bottom: 2px; }
  .header-info.bold { font-weight: bold; }
  .spacer { height: 16px; }
  h2 { font-size: 13pt; font-weight: bold; color: #000; margin: 18px 0 8px 0; }
  h3 { font-size: 12pt; font-weight: bold; color: #000; margin: 12px 0 6px 0; }
  p  { font-size: 11pt; margin: 5px 0; line-height: 1.5; }
  li { font-size: 11pt; margin: 3px 0 3px 18px; line-height: 1.5; }
  br { display: block; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  th { background: #d9d9d9; font-weight: bold; border: 1px solid #000; padding: 5px 7px; text-align: left; }
  td { border: 1px solid #000; padding: 5px 7px; }
  .footer { margin-top: 40px; }
  .footer-name { font-weight: bold; font-size: 11pt; }
  .footer-label { font-size: 10pt; color: #444; margin: 2px 0 8px 0; }
  .footer-sig { max-width: 180px; max-height: 90px; object-fit: contain; margin-top: 6px; display: block; }
  @media print { body { padding: 15mm 15mm; } }
</style>
</head><body>
${logoUrl ? `<img class="header-logo" src="${logoUrl}" />` : ''}
${companyName    ? `<div class="header-info bold">${companyName}</div>`    : ''}
${companyAddress ? `<div class="header-info">${companyAddress}</div>`      : ''}
${companyPhone   ? `<div class="header-info">${companyPhone}</div>`        : ''}
${companyEmail   ? `<div class="header-info">${companyEmail}</div>`        : ''}
${companyWebsite ? `<div class="header-info">${companyWebsite}</div>`      : ''}
${refNumber      ? `<div class="header-info">Ref: ${refNumber}</div>`      : ''}
<div class="header-info">Date: ${dateStr}</div>
<div class="spacer"></div>
${bodyHtml}
<div class="footer">
  ${companyName ? `<div class="footer-name">${companyName}</div>` : ''}
  <div class="footer-label">Authorized Signatory</div>
  ${sigUrl ? `<img class="footer-sig" src="${sigUrl}" />` : ''}
</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow!.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for images to load before printing
  const images = Array.from(iframeDoc.querySelectorAll('img'));
  await Promise.all(images.map(img =>
    img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })
  ));

  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();

  setTimeout(() => document.body.removeChild(iframe), 2000);
}

type Proposal = { id: string; tender_name: string; content: string; created_at: string };

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Proposal | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  useEffect(() => {
    // Fetch directly from Supabase client-side — no cookie auth issues
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('proposals')
        .select('id,tender_name,content,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setProposals(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proposal?')) return;
    setDeleting(id);
    const { error } = await supabase.from('proposals').delete().eq('id', id);
    if (!error) {
      setProposals(p => p.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    }
    setDeleting(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <h1 className="text-sm font-bold text-gray-800">My Proposals</h1>
        <p className="text-xs text-gray-400 mt-0.5">All proposals generated from tender analyses</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 w-full">
        {loading && (
          <div className="flex justify-center py-12">
            <span className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {!loading && proposals.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm font-medium">No proposals yet</p>
            <p className="text-xs mt-1">Analyse a tender and generate a proposal to see it here.</p>
          </div>
        )}

        {!loading && proposals.length > 0 && !selected && (
          <div className="space-y-3">
            {proposals.map(p => (
              <div key={p.id} className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] rounded-[4px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.tender_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button onClick={() => setSelected(p)}
                    className="text-xs px-3 py-1.5 text-gray-800 font-semibold rounded hover:bg-gray-100 border border-gray-200">
                    View
                  </button>
                  <button onClick={() => downloadDocx(p.content, `proposal_${p.tender_name.replace(/\s+/g, '_')}.docx`)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                    ↓ DOCX
                  </button>
                  <button onClick={() => downloadPdf(p.content, p.tender_name)}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">
                    ↓ PDF
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                    className="text-xs px-2 py-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] rounded-[4px] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-700 mb-1">← Back to list</button>
                <p className="text-sm font-bold text-gray-800">{selected.tender_name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigator.clipboard.writeText(selected.content)}
                  className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50 border border-gray-200">
                  Copy
                </button>
                <button onClick={() => downloadDocx(selected.content, `proposal_${selected.tender_name.replace(/\s+/g, '_')}.docx`)}
                  className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold">
                  ↓ DOCX
                </button>
                <button onClick={() => downloadPdf(selected.content, selected.tender_name)}
                  className="text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg font-semibold">
                  ↓ PDF
                </button>
              </div>
            </div>
            <MarkdownRenderer content={selected.content} />
          </div>
        )}
      </div>
    </div>
  );
}
