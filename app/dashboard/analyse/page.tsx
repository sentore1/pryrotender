'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { FileUploadZone } from '@/components/FileUploadZone';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

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
  companyName?: string
) {
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  // Logo at top
  if (logoUrl) {
    const buf = await urlToBuffer(logoUrl);
    if (buf) {
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun({ data: buf, transformation: { width: 120, height: 40 }, type: 'png' })],
        spacing: { after: 200 },
      }));
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    else if (line.startsWith('### ')) children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    else if (line.trim() === '') children.push(new Paragraph({ text: '' }));
    else {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      children.push(new Paragraph({
        children: parts.map(p =>
          p.startsWith('**') && p.endsWith('**')
            ? new TextRun({ text: p.slice(2, -2), bold: true, size: 22 })
            : new TextRun({ text: p, size: 22 })
        ),
      }));
    }
  }

  // Signature/stamp at bottom
  children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
  if (companyName) {
    children.push(new Paragraph({
      children: [new TextRun({ text: companyName, bold: true, size: 22 })],
    }));
  }
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

type ProposalData = {
  content: string;
  proposalId?: string;
  logoUrl?: string;
  signatureUrl?: string;
  companyName?: string;
};

export default function AnalyseTenderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [view, setView] = useState<'analysis' | 'proposal'>('analysis');

  const reset = () => { setFile(null); setAnalysis(''); setError(''); setChatInput(''); setProposal(null); setView('analysis'); };

  const handleAnalyse = async (f: File = file!) => {
    if (!f) return;
    setLoading(true); setError(''); setAnalysis(''); setProposal(null); setView('analysis');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fd = new FormData();
      fd.append('file', f);
      if (user?.id) fd.append('userId', user.id);
      const res = await fetch('/api/analyse-tender', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setAnalysis(data.analysis);
      else setError(data.error || 'Analysis failed.');
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
      const res = await fetch('/api/generate-proposal-from-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, tenderName }),
      });
      const data = await res.json();
      if (data.success) {
        setProposal({
          content: data.proposal,
          proposalId: data.proposalId,
          logoUrl: data.profile?.logoUrl,
          signatureUrl: data.profile?.signatureUrl,
          companyName: data.profile?.companyName,
        });
        setView('proposal');
      } else {
        setError(data.error || 'Failed to generate proposal.');
      }
    } catch { setError('Network error.'); }
    finally { setGenLoading(false); }
  };

  const tenderFilename = file?.name?.replace(/\.[^.]+$/, '') || 'proposal';

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

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 max-w-3xl w-full mx-auto">

        {view === 'analysis' && (
          <>
            <FileUploadZone
              file={file}
              accept=".pdf,.txt,.doc,.docx"
              acceptLabel="PDF, TXT, DOC"
              onFile={f => { setFile(f); setAnalysis(''); setError(''); setProposal(null); }}
              onError={setError}
            />

            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

            {file && !analysis && (
              <button onClick={() => handleAnalyse()} disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm mb-4">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Analysing...</span>
                  : 'Analyse Tender'}
              </button>
            )}

            {analysis && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Analysis Result</span>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(analysis)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">Copy</button>
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-50">Reset</button>
                  </div>
                </div>

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
                  onClick={() => downloadProposalDocx(proposal.content, `proposal_${tenderFilename}.docx`, proposal.logoUrl, proposal.signatureUrl, proposal.companyName)}
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
      </div>
    </div>
  );
}
