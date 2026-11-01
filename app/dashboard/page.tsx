'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tender } from '@/lib/scraper';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

// ── Markdown → DOCX ──────────────────────────────────────────────────────────
async function downloadDocx(markdown: string, title: string) {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---')) {
      const headers = line.trim().split('|').filter(Boolean).map(s => s.trim());
      const rows: string[][] = [];
      i += 2; // skip separator
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').filter(Boolean).map(s => s.trim()));
        i++;
      }
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map(h => new TableCell({
              shading: { fill: 'FFFFFF' },
              children: [new Paragraph({ children: [new TextRun({ text: h.replace(/\*\*/g, '').replace(/\*/g, ''), bold: true, color: '000000', size: 20, font: 'Times New Roman' })] })],
            })),
          }),
          ...rows.map((row) => new TableRow({
            children: row.map(cell => new TableCell({
              shading: { fill: 'FFFFFF' },
              children: [new Paragraph({ children: [new TextRun({ text: cell.replace(/\*\*/g, '').replace(/\*/g, ''), size: 20, color: '000000', font: 'Times New Roman' })] })],
            })),
          })),
        ],
      }));
      children.push(new Paragraph({ text: '' }));
      continue;
    }

    // Headings
    if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.replace(/^## /, '').replace(/\*\*/g, ''), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({ text: line.replace(/^### /, '').replace(/\*\*/g, ''), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } }));
    } else if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.replace(/^# /, '').replace(/\*\*/g, ''), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
    } else if (line.trim() === '---' || line.trim().match(/^-{3,}$/)) {
      children.push(new Paragraph({ text: '' }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const rawText = isBullet ? line.trim().slice(2) : line;
      // Inline bold parsing — strip ** markers cleanly
      const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts
        .filter(p => p !== '')
        .map(p => p.startsWith('**') && p.endsWith('**')
          ? new TextRun({ text: p.slice(2, -2), bold: true, size: 22, font: 'Times New Roman' })
          : new TextRun({ text: p.replace(/\*\*/g, '').replace(/\*/g, ''), size: 22, font: 'Times New Roman' })
        );
      children.push(new Paragraph({
        bullet: isBullet ? { level: 0 } : undefined,
        children: runs,
      }));
    }
    i++;
  }

  const doc = new Document({
    styles: {
      paragraphStyles: [
        { id: 'Heading2', name: 'Heading 2', run: { color: '000000', bold: true, size: 28, font: 'Times New Roman' } },
        { id: 'Heading3', name: 'Heading 3', run: { color: '000000', bold: true, size: 24, font: 'Times New Roman' } },
      ],
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.slice(0, 60).replace(/[^a-z0-9]/gi, '_')}_proposal.docx`);
}

// ── Markdown → React renderer ─────────────────────────────────────────────────
function cleanLine(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')           // remove # headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // remove **bold**
    .replace(/\*([^*]+)\*/g, '$1')       // remove *italic*
    .replace(/__([^_]+)__/g, '$1')       // remove __underline__
    .replace(/_([^_]+)_/g, '$1')         // remove _italic_
    .replace(/^-{3,}$/, '')              // remove --- lines
    .replace(/\*\*/g, '').replace(/##/g, '').replace(/__/g, '') // strip leftover symbols
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}]/gu, '') // remove emojis
    .trim();
}

function ProposalRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const raw = lines[i];

    // Table
    if (raw.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---')) {
      const headers = raw.trim().split('|').filter(Boolean).map(s => cleanLine(s));
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').filter(Boolean).map(s => cleanLine(s)));
        i++;
      }
      elements.push(
        <div key={k++} className="overflow-x-auto my-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>{headers.map((h, j) => <th key={j} className="bg-white text-gray-900 px-3 py-2 text-left font-semibold border border-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="bg-white">
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 border border-black" style={{ fontFamily: '"Times New Roman", Times, serif', color: '#111' }}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const line = cleanLine(raw);

    if (raw.trim() === '---' || line === '') {
      elements.push(<div key={k++} className="h-1" />);
    } else if (raw.trim().startsWith('- ') || raw.trim().startsWith('* ')) {
      const bulletText = raw.trim().startsWith('* ') ? raw.trim().slice(2) : raw.trim().slice(2);
      elements.push(<li key={k++} className="ml-4 list-disc" style={{ color: '#111' }}>{cleanLine(bulletText)}</li>);
    } else {
      elements.push(<p key={k++} className="leading-relaxed" style={{ color: '#111' }}>{line}</p>);
    }
    i++;
  }

  return <div className="space-y-0.5" style={{ fontFamily: '"Times New Roman", Times, serif', color: '#111' }}>{elements}</div>;
}


const CAT_COLORS: Record<string, string> = {
  IT: 'bg-blue-600 text-white',
  Construction: 'bg-orange-600 text-white',
  Medical: 'bg-red-600 text-white',
  Consultancy: 'bg-purple-600 text-white',
  Goods: 'bg-green-600 text-white',
};

function TenderCard({ tender, selected, generating, hasProposal, onClick }: { tender: Tender; selected: boolean; generating: boolean; hasProposal: boolean; onClick: () => void }) {
  const tag = Object.keys(CAT_COLORS).find(k =>
    tender.title?.toLowerCase().includes(k.toLowerCase()) || tender.description?.toLowerCase().includes(k.toLowerCase())
  );
  const proposalReady = selected && hasProposal;
  return (
    <div onClick={onClick} className={`bg-white rounded-md px-4 py-3.5 cursor-pointer transition-all ${selected ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap min-w-0">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${tag ? CAT_COLORS[tag] : 'bg-gray-600 text-white'}`}>{tag || 'Tender'}</span>
            {tender.organization && tender.organization !== 'Not specified' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 truncate max-w-[140px]">{tender.organization}</span>}
          </div>
          <p className={`text-sm font-semibold text-gray-800 leading-snug ${proposalReady ? 'line-clamp-2' : 'truncate'}`}>{tender.title}</p>
          {!proposalReady && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tender.description}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {!proposalReady && (
            <a href={tender.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-gray-600 text-xs font-semibold hover:text-gray-900 transition" style={{borderRadius:6}}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              View
            </a>
          )}
          {generating
            ? <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:6}}><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Generating...</div>
            : proposalReady
              ? <span className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold" style={{borderRadius:6}}><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Generated</span>
              : selected
                ? <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:6}}><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Selected</span>
                : <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:6}}>Generate<svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></span>
          }
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{tender.deadline}</span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {tender.source && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tender.source === 'Umucyo (Gov)' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{tender.source}</span>}
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const params = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [proposal, setProposal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(640);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);
  const [profile, setProfile] = useState<{ company_name?: string; company_address?: string; company_email?: string; company_bio?: string; required_documents?: string[]; former_clients?: { name: string; project: string }[]; company_phone?: string; company_website?: string; company_ref_prefix?: string } | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customGenerating, setCustomGenerating] = useState(false);
  const [customProposal, setCustomProposal] = useState('');
  const isResizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX; const startW = panelWidth;
    const onMove = (ev: MouseEvent) => { if (!isResizing.current) return; setPanelWidth(Math.max(380, Math.min(960, startW + (startX - ev.clientX)))); };
    const onUp = () => { isResizing.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    const p = params.get('payment');
    if (p === 'success' || p === 'failed') {
      setPaymentStatus(p as 'success' | 'failed');
      setTimeout(() => setPaymentStatus(null), 6000);
      window.history.replaceState({}, '', '/dashboard');
    }
    if (params.get('custom') === '1') {
      setCustomMode(true);
    } else {
      fetchTenders(params.get('category') || '');
    }
    // fetch profile for proposal enrichment
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) supabase.from('profiles').select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients').eq('id', user.id).single().then(({ data }) => { if (data) setProfile(data); });
      });
    });
  }, [params]);

  const fetchTenders = async (cat: string) => {
    setLoading(true); setError(''); setSelectedTender(null); setProposal('');
    try {
      // Category strings from the sidebar can be multi-word (e.g. "IT Technology Software").
      // The scraper matches a single keyword, so use only the first word for the API call,
      // then client-side filter the results to include any tender matching ANY of the keywords.
      const keywords = cat.trim() ? cat.trim().split(/\s+/) : [];
      const primaryKeyword = keywords[0] ?? '';

      const res = await fetch('/api/tenders?category=' + encodeURIComponent(primaryKeyword));
      const data = await res.json();
      if (data.success) {
        let results = data.tenders;
        // If there are additional keywords, also fetch them and merge (dedupe by id)
        if (keywords.length > 1) {
          const extras = await Promise.all(
            keywords.slice(1).map(kw =>
              fetch('/api/tenders?category=' + encodeURIComponent(kw))
                .then(r => r.json())
                .then(d => d.success ? d.tenders : [])
                .catch(() => [])
            )
          );
          const seen = new Set(results.map((t: Tender) => t.id));
          for (const batch of extras) {
            for (const t of batch) {
              if (!seen.has(t.id)) { seen.add(t.id); results = [...results, t]; }
            }
          }
        }
        setTenders(results);
        if (!results.length) setError('No tenders found.');
      } else { setError(data.error || 'Failed.'); setTenders([]); }
    } catch { setError('Network error.'); setTenders([]); }
    finally { setLoading(false); }
  };

  const generateProposal = async (tender: Tender) => {
    setSelectedTender(tender); setGenerating(true); setProposal(''); setError('');
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers,
        body: JSON.stringify({ tenderDetails: tender.title + '\n\n' + tender.description, requirements: tender.requirements, tenderName: tender.title, companyInfo: profile ? { name: profile.company_name, address: profile.company_address, phone: profile.company_phone, email: profile.company_email, website: profile.company_website, refNumber: profile.company_ref_prefix ? `${profile.company_ref_prefix}-${new Date().getFullYear()}-001` : undefined, bio: profile.company_bio, requiredDocuments: profile.required_documents, formerClients: profile.former_clients } : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setProposal(data.proposal);
      } else setError(data.error || 'Failed.');
    } catch { setError('Error.'); } finally { setGenerating(false); }
  };

  const sendChatUpdate = async () => {
    if (!chatInput.trim() || !proposal) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/adjust-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal, instruction: chatInput }) });
      const data = await res.json();
      if (data.success) { setProposal(data.proposal); setChatInput(''); }
      else setError(data.error || 'Failed to update proposal.');
    } catch { setError('Network error. Please try again.'); }
    finally { setChatLoading(false); }
  };

  const generateCustomProposal = async () => {
    if (!customText.trim()) return;
    setCustomGenerating(true); setCustomProposal(''); setError('');
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers,
        body: JSON.stringify({ tenderDetails: customText, requirements: customText, tenderName: 'Custom Proposal' }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomProposal(data.proposal);
      } else setError(data.error || 'Failed.');
    } catch { setError('Error generating proposal.'); } finally { setCustomGenerating(false); }
  };

  const open = tenders.filter(t => !t.deadline?.toLowerCase().includes('closed'));
  const closed = tenders.filter(t => t.deadline?.toLowerCase().includes('closed'));

  if (customMode) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => { setCustomMode(false); setCustomProposal(''); setCustomText(''); window.history.replaceState({}, '', '/dashboard'); fetchTenders(''); }}
          className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1">← Back</button>
        <h1 className="text-sm font-bold text-gray-800">Custom Proposal Generator</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paste or type your tender details</label>
          <textarea value={customText} onChange={e => setCustomText(e.target.value)}
            placeholder="Paste the full tender description, requirements, scope of work, deadlines, etc..."
            className="flex-1 min-h-64 w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 resize-none" />
          <button onClick={generateCustomProposal} disabled={customGenerating || !customText.trim()}
            className="py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {customGenerating ? 'Generating...' : 'Generate Proposal'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        {(customGenerating || customProposal) && (
          <div className="flex-1 flex flex-col gap-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Generated Proposal</label>
            {customGenerating
              ? <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent" /></div>
              : (
                <div className="flex flex-col gap-3">
                  <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-700 overflow-y-auto max-h-[60vh]">
                    <ProposalRenderer content={customProposal} />
                  </div>
                  <div className="flex gap-2 p-2 border border-gray-200 rounded-lg">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { if (!chatInput.trim() || !customProposal) return; setChatLoading(true); fetch('/api/adjust-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal: customProposal, instruction: chatInput }) }).then(r => r.json()).then(d => { if (d.success) { setCustomProposal(d.proposal); setChatInput(''); } }).finally(() => setChatLoading(false)); } }}
                      placeholder="Refine proposal..." disabled={chatLoading}
                      className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    <button disabled={chatLoading || !chatInput.trim()} onClick={() => { if (!chatInput.trim() || !customProposal) return; setChatLoading(true); fetch('/api/adjust-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal: customProposal, instruction: chatInput }) }).then(r => r.json()).then(d => { if (d.success) { setCustomProposal(d.proposal); setChatInput(''); } }).finally(() => setChatLoading(false)); }}
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">{chatLoading ? '...' : 'Send'}</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(customProposal)} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">Copy</button>
                    <button onClick={() => downloadDocx(customProposal, 'Custom_Proposal')} className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Download DOCX</button>
                  </div>
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex-1 relative max-w-md">
          <input type="text" placeholder="Search tenders..." value={searchInput}
            data-tour="tender-search"
            onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTenders(searchInput)}
            className="w-full pl-4 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => fetchTenders(searchInput)} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Search'}
        </button>
        <span className="ml-auto px-2.5 py-1 bg-blue-600 text-white rounded-md text-sm font-semibold">{tenders.length} tenders</span>
      </header>
      <div className="flex-1 overflow-hidden flex relative">
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          {paymentStatus === 'success' && (
            <div className="mb-4 px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center justify-between">
              <span>🎉 Payment successful! Your subscription is now active.</span>
              <button onClick={() => setPaymentStatus(null)} className="text-white opacity-70 hover:opacity-100">✕</button>
            </div>
          )}
          {paymentStatus === 'failed' && (
            <div className="mb-4 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center justify-between">
              <span>❌ Payment failed. Please try again.</span>
              <button onClick={() => setPaymentStatus(null)} className="text-white opacity-70 hover:opacity-100">✕</button>
            </div>
          )}
          {error && <div className="mb-4 px-4 py-3 bg-orange-500 text-white rounded-lg text-sm">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
            </div>
          ) : (
            <>
              {open.length > 0 && (
                <section className="mb-8" data-tour="tender-list">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Open</span>
                    <span className="text-xs font-bold text-gray-400">{open.length}</span>
                  </div>
                  <div className="space-y-2">
                    {open.map(t => <TenderCard key={t.id} tender={t} selected={selectedTender?.id === t.id} generating={generating && selectedTender?.id === t.id} hasProposal={!!(selectedTender?.id === t.id && proposal)} onClick={() => generateProposal(t)} />)}
                  </div>
                </section>
              )}
              {closed.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Closed</span>
                  </div>
                  <div className="space-y-2">
                    {closed.map(t => <TenderCard key={t.id} tender={t} selected={selectedTender?.id === t.id} generating={generating && selectedTender?.id === t.id} hasProposal={!!(selectedTender?.id === t.id && proposal)} onClick={() => generateProposal(t)} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        {/* Desktop proposal panel */}
        <aside data-tour="proposal-panel" style={{ width: selectedTender ? panelWidth : 420 }} className="hidden md:flex shrink-0 bg-white border-l border-gray-100 flex-col overflow-hidden relative">
          <div onMouseDown={startResize} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-10" />
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Generated Proposal</h2>
            {selectedTender && <button onClick={() => { setSelectedTender(null); setProposal(''); }} className="text-gray-400 hover:text-gray-600 text-lg">x</button>}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedTender && <div className="flex items-center justify-center h-full"><p className="text-sm text-gray-400">Click a tender to generate a proposal</p></div>}
            {selectedTender && generating && <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div></div>}
            {selectedTender && !generating && proposal && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800">{selectedTender.title}</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 max-h-96 overflow-y-auto prose prose-sm max-w-none">
                  <ProposalRenderer content={proposal} />
                </div>
                <div className="flex gap-2 pt-2 border border-gray-200 rounded-lg p-2">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatUpdate()}
                    placeholder="Update proposal..." disabled={chatLoading}
                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  <button onClick={sendChatUpdate} disabled={chatLoading || !chatInput.trim()} className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {chatLoading ? '...' : 'Send'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(proposal)} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">Copy</button>
                  <button onClick={() => downloadDocx(proposal, selectedTender.title)} className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Download DOCX</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile proposal sheet */}
        {selectedTender && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setSelectedTender(null); setProposal(''); }} />
            <div className="relative bg-white rounded-t-2xl flex flex-col max-h-[85vh] z-10">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800">Generated Proposal</h2>
                <button onClick={() => { setSelectedTender(null); setProposal(''); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {generating && <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div></div>}
                {!generating && proposal && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800">{selectedTender.title}</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 max-h-64 overflow-y-auto">
                      <ProposalRenderer content={proposal} />
                    </div>
                    <div className="flex gap-2 p-2 border border-gray-200 rounded-lg">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatUpdate()}
                        placeholder="Update proposal..." disabled={chatLoading}
                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      <button onClick={sendChatUpdate} disabled={chatLoading || !chatInput.trim()} className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {chatLoading ? '...' : 'Send'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(proposal)} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">Copy</button>
                      <button onClick={() => downloadDocx(proposal, selectedTender.title)} className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Download DOCX</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
