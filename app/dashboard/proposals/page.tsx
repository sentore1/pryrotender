'use client';
import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

async function downloadDocx(content: string, filename: string) {
  const lines = content.split('\n');
  const children = lines.map(line => {
    if (line.startsWith('## ')) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    if (line.startsWith('### ')) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    if (line.trim() === '') return new Paragraph({ text: '' });
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return new Paragraph({ children: parts.map(p => p.startsWith('**') && p.endsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, size: 22 }) : new TextRun({ text: p, size: 22 })) });
  });
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
            <p className="text-4xl mb-3">📄</p>
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
