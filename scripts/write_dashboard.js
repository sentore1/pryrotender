const fs = require('fs');
const content = `'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tender } from '@/lib/scraper';

const CAT_COLORS: Record<string, string> = {
  IT: 'bg-blue-100 text-blue-700',
  Construction: 'bg-orange-100 text-orange-700',
  Medical: 'bg-red-100 text-red-700',
  Consultancy: 'bg-purple-100 text-purple-700',
  Goods: 'bg-green-100 text-green-700',
};

function TenderCard({ tender, selected, generating, onClick }: { tender: Tender; selected: boolean; generating: boolean; onClick: () => void }) {
  const tag = Object.keys(CAT_COLORS).find(k =>
    tender.title?.toLowerCase().includes(k.toLowerCase()) || tender.description?.toLowerCase().includes(k.toLowerCase())
  );
  return (
    <div onClick={onClick} className={\`bg-white rounded-xl px-4 py-3.5 cursor-pointer transition-all \${selected ? 'shadow-lg ring-2 ring-blue-100' : 'shadow-sm hover:shadow-md'}\`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={\`text-xs font-semibold px-2 py-0.5 rounded-full \${tag ? CAT_COLORS[tag] : 'bg-gray-100 text-gray-600'}\`}>{tag || 'Tender'}</span>
            {tender.source && <span className={\`text-xs font-bold px-2 py-0.5 rounded-full \${tender.source === 'Umucyo (Gov)' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'}\`}>{tender.source}</span>}
            {tender.organization && tender.organization !== 'Not specified' && <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{tender.organization}</span>}
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{tender.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tender.description}</p>
        </div>
        {generating
          ? <div className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">Generating...</div>
          : selected
            ? <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Selected</span>
            : <span className="shrink-0 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium border border-gray-200">Generate</span>
        }
      </div>
      <div className="mt-2.5 text-xs text-gray-400">{tender.deadline}</div>
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
  const isResizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX; const startW = panelWidth;
    const onMove = (ev: MouseEvent) => { if (!isResizing.current) return; setPanelWidth(Math.max(380, Math.min(960, startW + (startX - ev.clientX)))); };
    const onUp = () => { isResizing.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  useEffect(() => { fetchTenders(params.get('category') || ''); }, []);

  const fetchTenders = async (cat: string) => {
    setLoading(true); setError(''); setSelectedTender(null); setProposal('');
    try {
      const res = await fetch('/api/tenders?category=' + encodeURIComponent(cat));
      const data = await res.json();
      if (data.success) { setTenders(data.tenders); if (!data.tenders.length) setError('No tenders found.'); }
      else { setError(data.error || 'Failed.'); setTenders([]); }
    } catch { setError('Network error.'); setTenders([]); }
    finally { setLoading(false); }
  };

  const generateProposal = async (tender: Tender) => {
    setSelectedTender(tender); setGenerating(true); setProposal(''); setError('');
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderDetails: tender.title + '\\n\\n' + tender.description, requirements: tender.requirements }),
      });
      const data = await res.json();
      if (data.success) setProposal(data.proposal); else setError(data.error || 'Failed.');
    } catch { setError('Error.'); } finally { setGenerating(false); }
  };

  const sendChatUpdate = async () => {
    if (!chatInput.trim() || !proposal) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/adjust-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal, instruction: chatInput }) });
      const data = await res.json();
      if (data.success) { setProposal(data.proposal); setChatInput(''); }
    } catch {} finally { setChatLoading(false); }
  };

  const open = tenders.filter(t => !t.deadline?.toLowerCase().includes('closed'));
  const closed = tenders.filter(t => t.deadline?.toLowerCase().includes('closed'));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex-1 relative max-w-md">
          <input type="text" placeholder="Search tenders..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTenders(searchInput)}
            className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => fetchTenders(searchInput)} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Search'}
        </button>
        <span className="ml-auto px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">{tenders.length} tenders</span>
      </header>
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-gray-500">Loading tenders...</p>
            </div>
          ) : (
            <>
              {open.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Open</span>
                    <span className="text-xs font-bold text-gray-400">{open.length}</span>
                  </div>
                  <div className="space-y-2">
                    {open.map(t => <TenderCard key={t.id} tender={t} selected={selectedTender?.id === t.id} generating={generating && selectedTender?.id === t.id} onClick={() => generateProposal(t)} />)}
                  </div>
                </section>
              )}
              {closed.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Closed</span>
                  </div>
                  <div className="space-y-2">
                    {closed.map(t => <TenderCard key={t.id} tender={t} selected={selectedTender?.id === t.id} generating={generating && selectedTender?.id === t.id} onClick={() => generateProposal(t)} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        <aside style={{ width: selectedTender ? panelWidth : 420 }} className="shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden relative">
          <div onMouseDown={startResize} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-10" />
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Generated Proposal</h2>
            {selectedTender && <button onClick={() => { setSelectedTender(null); setProposal(''); }} className="text-gray-400 hover:text-gray-600 text-lg">x</button>}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedTender && <div className="flex items-center justify-center h-full"><p className="text-sm text-gray-400">Click a tender to generate a proposal</p></div>}
            {selectedTender && generating && <div className="flex flex-col items-center justify-center h-full gap-3"><div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div><p className="text-sm text-gray-500">Generating AI proposal...</p></div>}
            {selectedTender && !generating && proposal && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800">{selectedTender.title}</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-700 max-h-96 overflow-y-auto">{proposal}</div>
                <div className="flex gap-2 p-2 border border-gray-200 rounded-lg">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatUpdate()}
                    placeholder="Update proposal..." disabled={chatLoading}
                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={sendChatUpdate} disabled={chatLoading || !chatInput.trim()} className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {chatLoading ? '...' : 'Send'}
                  </button>
                </div>
                <button onClick={() => navigator.clipboard.writeText(proposal)} className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">Copy Proposal</button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
`;
fs.writeFileSync('app/dashboard/page.tsx', content);
console.log('done');
