'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tender } from '@/lib/scraper';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// ── Markdown → DOCX ──────────────────────────────────────────────────────────
async function downloadDocx(markdown: string, title: string) {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---')) {
      const headers = line.trim().split('|').filter(Boolean).map(s => s.trim());
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').filter(Boolean).map(s => s.trim()));
        i++;
      }
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: headers.map(h => new TableCell({ shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: h.replace(/\*\*/g, '').replace(/\*/g, ''), bold: true, color: '000000', size: 20, font: 'Times New Roman' })] })] })) }),
          ...rows.map(row => new TableRow({ children: row.map(cell => new TableCell({ shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: cell.replace(/\*\*/g, '').replace(/\*/g, ''), size: 20, color: '000000', font: 'Times New Roman' })] })] })) })),
        ],
      }));
      children.push(new Paragraph({ text: '' }));
      continue;
    }
    if (line.startsWith('## ')) { children.push(new Paragraph({ text: line.replace(/^## /, '').replace(/\*\*/g, ''), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } })); }
    else if (line.startsWith('### ')) { children.push(new Paragraph({ text: line.replace(/^### /, '').replace(/\*\*/g, ''), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } })); }
    else if (line.startsWith('# ')) { children.push(new Paragraph({ text: line.replace(/^# /, '').replace(/\*\*/g, ''), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })); }
    else if (line.trim() === '') { children.push(new Paragraph({ text: '' })); }
    else {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const rawText = isBullet ? line.trim().slice(2) : line;
      const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.filter(p => p !== '').map(p =>
        p.startsWith('**') && p.endsWith('**')
          ? new TextRun({ text: p.slice(2, -2), bold: true, size: 22, font: 'Times New Roman' })
          : new TextRun({ text: p.replace(/\*\*/g, '').replace(/\*/g, ''), size: 22, font: 'Times New Roman' })
      );
      children.push(new Paragraph({ bullet: isBullet ? { level: 0 } : undefined, children: runs }));
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

// ── Clean markdown line ───────────────────────────────────────────────────────
function cleanLine(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^-{3,}$/, '')
    .replace(/\*\*/g, '').replace(/##/g, '').replace(/__/g, '')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}]/gu, '')
    .trim();
}

// ── Proposal renderer ─────────────────────────────────────────────────────────
function ProposalRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const raw = lines[i];
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
              <tr>{headers.map((h, j) => <th key={j} className="bg-gray-50 text-gray-800 px-3 py-2 text-left font-semibold border border-gray-200" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="even:bg-gray-50">
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 border border-gray-200 text-gray-700" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{cell}</td>)}
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
      elements.push(<li key={k++} className="ml-4 list-disc text-gray-700">{cleanLine(raw.trim().slice(2))}</li>);
    } else {
      elements.push(<p key={k++} className="leading-relaxed text-gray-700">{line}</p>);
    }
    i++;
  }
  return <div className="space-y-0.5" style={{ fontFamily: '"Times New Roman", Times, serif' }}>{elements}</div>;
}

// ── Category tag colours ──────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  IT:           'bg-gray-100 text-gray-600',
  Construction: 'bg-gray-100 text-gray-600',
  Medical:      'bg-gray-100 text-gray-600',
  Consultancy:  'bg-gray-100 text-gray-600',
  Goods:        'bg-gray-100 text-gray-600',
};

const SOURCE_COLORS: Record<string, string> = {
  'Umucyo (Gov)': 'bg-emerald-100 text-emerald-700',
};

// ── Tender card ───────────────────────────────────────────────────────────────
function TenderCard({
  tender, selected, generating, hasProposal, onClick,
}: {
  tender: Tender; selected: boolean; generating: boolean; hasProposal: boolean; onClick: () => void;
}) {
  const tag = Object.keys(CAT_COLORS).find(k =>
    tender.title?.toLowerCase().includes(k.toLowerCase()) ||
    tender.description?.toLowerCase().includes(k.toLowerCase())
  );
  const proposalReady = selected && hasProposal;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl px-5 py-4 cursor-pointer transition-all border ${
        selected
          ? 'border-transparent shadow-md shadow-blue-50'
          : 'border-transparent shadow-sm hover:shadow-md hover:shadow-blue-50/60'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${tag ? CAT_COLORS[tag] : 'bg-gray-100 text-gray-600'}`}>
              {tag || 'Tender'}
            </span>
            {tender.organization && tender.organization !== 'Not specified' && (
              <span className="text-[11px] font-medium text-gray-500 truncate max-w-[160px]">
                {tender.organization}
              </span>
            )}
          </div>
          {/* Title */}
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{tender.title}</p>
          {/* Description — hide when proposal ready */}
          {!proposalReady && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{tender.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
          {!proposalReady && (
            <a
              href={tender.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-white text-xs font-medium transition-colors rounded-lg hover:bg-blue-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              View
            </a>
          )}
          {generating ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generating...
            </span>
          ) : proposalReady ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Generated
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg group-hover:bg-blue-700 transition-colors">
              Generate
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{tender.deadline}</span>
        <div className="flex items-center gap-1.5">
          {tender.source && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${SOURCE_COLORS[tender.source] ?? 'bg-gray-100 text-gray-500'}`}>
              {tender.source}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sources ───────────────────────────────────────────────────────────────────
const ALL_SOURCES = [
  { key: 'Job in Rwanda',  label: 'Job in Rwanda' },
  { key: 'Umucyo (Gov)',   label: 'Umucyo (Gov)' },
  { key: 'New Times Jobs', label: 'New Times Jobs' },
  { key: 'ImvahoNshya',   label: 'ImvahoNshya' },
];

// ── Floating Action Button ─────────────────────────────────────────────────
function FAB({ hidden }: { hidden?: boolean }) {
  const router = useRouter();

  const actions = [
    {
      label: 'Analyse Tender',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
        </svg>
      ),
      href: '/dashboard/analyse',
    },
    {
      label: 'My Proposals',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
        </svg>
      ),
      href: '/dashboard/proposals',
    },
    {
      label: 'Form Filler',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      ),
      href: '/dashboard/form-filler',
    },
    {
      label: 'Custom Proposal',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
      href: '?custom=1',
    },
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group transition-all duration-300 ${hidden ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
      {/* Action items — visible on group hover */}
      <div className="flex flex-col items-end gap-2 mb-1 pointer-events-none opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-gray-700 text-xs font-semibold rounded-xl shadow-lg hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Main FAB button with text */}
      <button
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-xl hover:bg-blue-700 transition-all"
        aria-label="Quick actions"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Quick Actions
      </button>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────
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
  const [panelWidth, setPanelWidth] = useState(480);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending' | null>(null);
  const [profile, setProfile] = useState<{
    company_name?: string; company_address?: string; company_email?: string; company_bio?: string;
    required_documents?: string[]; former_clients?: { name: string; project: string }[];
    company_phone?: string; company_website?: string; company_ref_prefix?: string;
  } | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customGenerating, setCustomGenerating] = useState(false);
  const [customProposal, setCustomProposal] = useState('');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isResizing = useRef(false);

  const router = useRouter();
  const sourcesParam = params.get('sources') || '';
  const selectedSources = sourcesParam ? sourcesParam.split(',') : [];
  const allSourcesSelected = selectedSources.length === 0;
  const filterBySource = (list: Tender[]) =>
    !selectedSources.length ? list : list.filter(t => selectedSources.includes(t.source));

  useEffect(() => {
    if (!sourcesOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sources-dropdown]')) setSourcesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sourcesOpen]);

  const toggleSource = (key: string) => {
    const url = new URL(window.location.href);
    if (allSourcesSelected) {
      const next = ALL_SOURCES.map(s => s.key).filter(k => k !== key);
      url.searchParams.set('sources', next.join(','));
    } else {
      const current = new Set(selectedSources);
      if (current.has(key)) { current.delete(key); } else { current.add(key); }
      if (current.size === ALL_SOURCES.length || current.size === 0) {
        url.searchParams.delete('sources');
      } else {
        url.searchParams.set('sources', [...current].join(','));
      }
    }
    router.push('/dashboard?' + url.searchParams.toString());
  };

  const selectAllSources = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('sources');
    router.push('/dashboard?' + url.searchParams.toString());
  };

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX; const startW = panelWidth;
    const onMove = (ev: MouseEvent) => { if (!isResizing.current) return; setPanelWidth(Math.max(380, Math.min(960, startW + (startX - ev.clientX)))); };
    const onUp = () => { isResizing.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    const p = params.get('payment');
    if (p === 'success' || p === 'failed' || p === 'pending') {
      setPaymentStatus(p as 'success' | 'failed' | 'pending');
      setTimeout(() => setPaymentStatus(null), 8000);
      window.history.replaceState({}, '', '/dashboard');
    }
    if (params.get('custom') === '1') {
      setCustomMode(true);
    } else {
      fetchTenders(params.get('category') || '');
    }
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) supabase.from('profiles')
          .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients')
          .eq('id', user.id).single()
          .then(({ data }) => { if (data) setProfile(data); });
      });
    });
  }, [params]);

  const fetchTenders = async (cat: string) => {
    setLoading(true); setError(''); setSelectedTender(null); setProposal('');
    try {
      const keywords = cat.trim() ? cat.trim().split(/\s+/) : [];
      const primaryKeyword = keywords[0] ?? '';
      const res = await fetch('/api/tenders?category=' + encodeURIComponent(primaryKeyword));
      const data = await res.json();
      if (data.success) {
        let results = data.tenders;
        if (keywords.length > 1) {
          const extras = await Promise.all(
            keywords.slice(1).map(kw =>
              fetch('/api/tenders?category=' + encodeURIComponent(kw))
                .then(r => r.json()).then(d => d.success ? d.tenders : []).catch(() => [])
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
        body: JSON.stringify({
          tenderDetails: tender.title + '\n\n' + tender.description,
          requirements: tender.requirements,
          tenderName: tender.title,
          companyInfo: profile ? {
            name: profile.company_name, address: profile.company_address, phone: profile.company_phone,
            email: profile.company_email, website: profile.company_website,
            refNumber: profile.company_ref_prefix ? `${profile.company_ref_prefix}-${new Date().getFullYear()}-001` : undefined,
            bio: profile.company_bio, requiredDocuments: profile.required_documents, formerClients: profile.former_clients,
          } : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) { setProposal(data.proposal); } else { setError(data.error || 'Failed.'); }
    } catch { setError('Error.'); } finally { setGenerating(false); }
  };

  const sendChatUpdate = async () => {
    if (!chatInput.trim() || !proposal) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/adjust-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal, instruction: chatInput }),
      });
      const data = await res.json();
      if (data.success) { setProposal(data.proposal); setChatInput(''); }
      else setError(data.error || 'Failed to update proposal.');
    } catch { setError('Network error.'); } finally { setChatLoading(false); }
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
      if (data.success) { setCustomProposal(data.proposal); } else { setError(data.error || 'Failed.'); }
    } catch { setError('Error generating proposal.'); } finally { setCustomGenerating(false); }
  };

  const visibleTenders = filterBySource(tenders);
  const open = visibleTenders.filter(t => !t.deadline?.toLowerCase().includes('closed'));
  const closed = visibleTenders.filter(t => t.deadline?.toLowerCase().includes('closed'));

  // ── Custom proposal mode ────────────────────────────────────────────────────
  if (customMode) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-4 shrink-0 shadow-sm">
        <button
          onClick={() => { setCustomMode(false); setCustomProposal(''); setCustomText(''); window.history.replaceState({}, '', '/dashboard'); fetchTenders(''); }}
          className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <h1 className="text-sm font-semibold text-gray-800">Custom Proposal Generator</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-5">
          {/* Input */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tender Details</p>
              <textarea
                value={customText} onChange={e => setCustomText(e.target.value)}
                placeholder="Paste the full tender description, requirements, scope of work, deadlines, etc..."
                className="min-h-64 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 resize-none"
              />
              <button
                onClick={generateCustomProposal} disabled={customGenerating || !customText.trim()}
                className="self-start flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {customGenerating ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Generate Proposal
                  </>
                )}
              </button>
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
          </div>

          {/* Output */}
          {(customGenerating || customProposal) && (
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Generated Proposal</p>
                {customGenerating ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 overflow-y-auto max-h-[56vh]">
                      <ProposalRenderer content={customProposal} />
                    </div>
                    {/* Chat refine */}
                    <div className="flex gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <input
                        type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { if (!chatInput.trim() || !customProposal) return; setChatLoading(true); fetch('/api/adjust-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal: customProposal, instruction: chatInput }) }).then(r => r.json()).then(d => { if (d.success) { setCustomProposal(d.proposal); setChatInput(''); } }).finally(() => setChatLoading(false)); } }}
                        placeholder="Refine your proposal..." disabled={chatLoading}
                        className="flex-1 text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        disabled={chatLoading || !chatInput.trim()}
                        onClick={() => { if (!chatInput.trim() || !customProposal) return; setChatLoading(true); fetch('/api/adjust-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal: customProposal, instruction: chatInput }) }).then(r => r.json()).then(d => { if (d.success) { setCustomProposal(d.proposal); setChatInput(''); } }).finally(() => setChatLoading(false)); }}
                        className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >{chatLoading ? '...' : 'Send'}</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(customProposal)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Copy</button>
                      <button onClick={() => downloadDocx(customProposal, 'Custom_Proposal')} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">Download DOCX</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Main tenders view ───────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        {/* Sources dropdown */}
        <div className="relative shrink-0" data-sources-dropdown>
          <button
            onClick={() => setSourcesOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-0 bg-white text-xs font-medium text-gray-600 shadow-[0_-1px_4px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_-2px_6px_rgba(0,0,0,0.09),0_2px_6px_rgba(0,0,0,0.09)] transition-shadow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span className="truncate max-w-[90px]">
              {allSourcesSelected ? 'All sources' : selectedSources.length === 1 ? selectedSources[0] : `${selectedSources.length} sources`}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`shrink-0 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {sourcesOpen && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <button onClick={() => { selectAllSources(); setSourcesOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors ${allSourcesSelected ? 'text-white bg-blue-600' : 'text-gray-600'}`}>
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${allSourcesSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {allSourcesSelected && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                All sources
              </button>
              <div className="border-t border-gray-100" />
              {ALL_SOURCES.map(src => {
                const checked = allSourcesSelected || selectedSources.includes(src.key);
                const act = !allSourcesSelected && selectedSources.includes(src.key);
                return (
                  <button key={src.key} onClick={() => toggleSource(src.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors ${act ? 'text-blue-600' : 'text-gray-600'}`}>
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {checked && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span className="truncate">{src.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 relative max-w-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search tenders..."
            value={searchInput}
            data-tour="tender-search"
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchTenders(searchInput)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0 transition"
          />
        </div>
        <button
          onClick={() => fetchTenders(searchInput)} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
        <span className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold shrink-0">
          {visibleTenders.length} tenders
        </span>
      </header>

      <div className="flex-1 overflow-hidden flex relative">
        {/* Tender list */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Payment banners */}
          {paymentStatus === 'success' && (
            <div className="px-4 py-3 bg-emerald-500 text-white rounded-xl text-sm font-medium flex items-center justify-between shadow-sm">
              <span>🎉 Payment successful! Your subscription is now active.</span>
              <button onClick={() => setPaymentStatus(null)} className="opacity-70 hover:opacity-100 ml-3">✕</button>
            </div>
          )}
          {paymentStatus === 'failed' && (
            <div className="px-4 py-3 bg-red-500 text-white rounded-xl text-sm font-medium flex items-center justify-between shadow-sm">
              <span>❌ Payment failed. Please try again.</span>
              <button onClick={() => setPaymentStatus(null)} className="opacity-70 hover:opacity-100 ml-3">✕</button>
            </div>
          )}
          {paymentStatus === 'pending' && (
            <div className="px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-medium flex items-center justify-between shadow-sm">
              <span>⏳ Payment received — awaiting verification. We&apos;ll activate your account once confirmed.</span>
              <button onClick={() => setPaymentStatus(null)} className="opacity-70 hover:opacity-100 ml-3">✕</button>
            </div>
          )}
          {error && (
            <div className="px-4 py-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-gray-400">Loading tenders...</p>
            </div>
          ) : (
            <>
              {/* Open tenders */}
              {open.length > 0 && (
                <section data-tour="tender-list">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Open</span>
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[11px] font-bold rounded-md">{open.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {open.map(t => (
                      <TenderCard
                        key={t.id} tender={t}
                        selected={selectedTender?.id === t.id}
                        generating={generating && selectedTender?.id === t.id}
                        hasProposal={!!(selectedTender?.id === t.id && proposal)}
                        onClick={() => generateProposal(t)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Closed tenders */}
              {closed.length > 0 && (
                <section>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Closed</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-bold rounded-md">{closed.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {closed.map(t => (
                      <TenderCard
                        key={t.id} tender={t}
                        selected={selectedTender?.id === t.id}
                        generating={generating && selectedTender?.id === t.id}
                        hasProposal={!!(selectedTender?.id === t.id && proposal)}
                        onClick={() => generateProposal(t)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* ── Desktop proposal panel ── */}
        <aside
          data-tour="proposal-panel"
          style={{ width: selectedTender ? panelWidth : 420 }}
          className="hidden md:flex shrink-0 bg-white border-l border-gray-100 flex-col overflow-hidden relative shadow-sm"
        >
          {/* Resize handle */}
          <div onMouseDown={startResize} className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-10" />

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
              </svg>
              <h2 className="text-sm font-semibold text-gray-800">Generated Proposal</h2>
            </div>
            {selectedTender && (
              <button onClick={() => { setSelectedTender(null); setProposal(''); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedTender && (
              <div
                className="flex flex-col items-center justify-center h-full gap-3 text-center rounded-xl"
                style={{
                  backgroundImage: 'radial-gradient(circle, #94a3b8 1.2px, transparent 1.2px)',
                  backgroundSize: '22px 22px',
                }}
              >
                <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">Click a tender to generate a proposal</p>
              </div>
            )}

            {selectedTender && generating && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
                <p className="text-xs text-gray-400">Generating your proposal...</p>
              </div>
            )}

            {selectedTender && !generating && proposal && (
              <div className="space-y-4">
                {/* Tender title badge */}
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 line-clamp-2">{selectedTender.title}</p>
                </div>

                {/* Proposal content */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-700 max-h-[50vh] overflow-y-auto">
                  <ProposalRenderer content={proposal} />
                </div>

                {/* Chat refine */}
                <div className="flex gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <input
                    type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChatUpdate()}
                    placeholder="Update proposal..." disabled={chatLoading}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button onClick={sendChatUpdate} disabled={chatLoading || !chatInput.trim()}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {chatLoading ? '...' : 'Send'}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(proposal)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                  </button>
                  <button onClick={() => downloadDocx(proposal, selectedTender.title)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download DOCX
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Mobile proposal sheet ── */}
        {selectedTender && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setSelectedTender(null); setProposal(''); }} />
            <div className="relative bg-white rounded-t-2xl flex flex-col max-h-[85vh] z-10 shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Generated Proposal</h2>
                <button onClick={() => { setSelectedTender(null); setProposal(''); }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {generating && (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
                    <p className="text-xs text-gray-400">Generating...</p>
                  </div>
                )}
                {!generating && proposal && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-semibold text-blue-600 line-clamp-2">{selectedTender.title}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm max-h-64 overflow-y-auto">
                      <ProposalRenderer content={proposal} />
                    </div>
                    <div className="flex gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChatUpdate()}
                        placeholder="Update proposal..." disabled={chatLoading}
                        className="flex-1 text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <button onClick={sendChatUpdate} disabled={chatLoading || !chatInput.trim()}
                        className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {chatLoading ? '...' : 'Send'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(proposal)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">Copy</button>
                      <button onClick={() => downloadDocx(proposal, selectedTender.title)}
                        className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Download DOCX</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <FAB hidden={generating || !!proposal} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
