'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

async function urlToBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch { return null; }
}

async function downloadDocx(content: string, filename: string) {
  // Fetch profile for logo/signature/company info
  const { data: { user } } = await supabase.auth.getUser();
  let logoUrl = '', signatureUrl = '', companyName = '', companyAddress = '', companyPhone = '', companyEmail = '', companyWebsite = '', refNumber = '';
  if (user) {
    const { data: p } = await supabase.from('profiles').select('logo_url,signature_url,company_name,company_address,company_phone,company_email,company_website,company_ref_prefix').eq('id', user.id).single();
    if (p) {
      logoUrl = p.logo_url || '';
      signatureUrl = p.signature_url || '';
      companyName = p.company_name || '';
      companyAddress = p.company_address || '';
      companyPhone = p.company_phone || '';
      companyEmail = p.company_email || '';
      companyWebsite = p.company_website || '';
      refNumber = p.company_ref_prefix ? `${p.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}` : '';
    }
  }

  const lines = content.split('\n');
  const children: Paragraph[] = [];

  // Logo
  if (logoUrl) {
    const buf = await urlToBuffer(logoUrl);
    if (buf) {
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: buf, transformation: { width: 130, height: 45 }, type: 'png' })],
        spacing: { after: 80 },
      }));
    }
  }

  // Company header info
  const headerLines = [companyName, companyAddress, companyPhone, companyEmail, companyWebsite, refNumber ? `Ref: ${refNumber}` : '', `Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`].filter(Boolean);
  for (const info of headerLines) {
    children.push(new Paragraph({
      children: [new TextRun({ text: info, size: 20, bold: info === companyName })],
      spacing: { after: 40 },
    }));
  }
  children.push(new Paragraph({ text: '\u2500'.repeat(60), spacing: { after: 200 } }));

  for (const line of lines) {
    if (line.startsWith('## ')) children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    else if (line.startsWith('### ')) children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    else if (line.trim() === '') children.push(new Paragraph({ text: '' }));
    else {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      children.push(new Paragraph({ children: parts.map(p => p.startsWith('**') && p.endsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, size: 22 }) : new TextRun({ text: p, size: 22 })) }));
    }
  }

  // Footer: company name + stamp
  children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
  if (companyName) children.push(new Paragraph({ children: [new TextRun({ text: companyName, bold: true, size: 22 })] }));
  if (signatureUrl) {
    const buf = await urlToBuffer(signatureUrl);
    if (buf) {
      children.push(new Paragraph({
        children: [new ImageRun({ data: buf, transformation: { width: 150, height: 60 }, type: 'png' })],
        spacing: { before: 100 },
      }));
    }
  }

  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  saveAs(blob, filename);
}

type Proposal = { id: string; tender_name: string; content: string; created_at: string };

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/proposals')
      .then(r => r.json())
      .then(d => { if (d.success) setProposals(d.proposals); })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proposal?')) return;
    setDeleting(id);
    const res = await fetch('/api/proposals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) {
      setProposals(p => p.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    }
    setDeleting(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <h1 className="text-sm font-bold text-gray-800">My Proposals</h1>
        <p className="text-xs text-gray-400 mt-0.5">All proposals you have generated from tender analyses</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 max-w-3xl w-full mx-auto">
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
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-blue-200 transition">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.tender_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setSelected(p)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100">View</button>
                  <button onClick={() => downloadDocx(p.content, `proposal_${p.tender_name.replace(/\s+/g, '_')}.docx`)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">↓ DOCX</button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-xs px-2 py-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-700 mb-1">← Back to list</button>
                <p className="text-sm font-bold text-gray-800">{selected.tender_name}</p>
                <p className="text-xs text-gray-400">{new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(selected.content)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">Copy</button>
                <button onClick={() => downloadDocx(selected.content, `proposal_${selected.tender_name.replace(/\s+/g, '_')}.docx`)} className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold">↓ Download DOCX</button>
              </div>
            </div>
            <MarkdownRenderer content={selected.content} />
          </div>
        )}
      </div>
    </div>
  );
}
