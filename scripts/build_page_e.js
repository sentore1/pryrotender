const fs = require('fs');

const tenderCard = `
function TenderCard({ tender, selected, generating, onClick }: {
  tender: Tender; selected: boolean; generating: boolean; onClick: () => void;
}) {
  const categoryColors: Record<string, string> = {
    'IT': 'bg-blue-100 text-blue-700',
    'Construction': 'bg-orange-100 text-orange-700',
    'Medical': 'bg-red-100 text-red-700',
    'Consultancy': 'bg-purple-100 text-purple-700',
    'Goods': 'bg-green-100 text-green-700',
  };
  const tag = Object.keys(categoryColors).find(k =>
    tender.title?.toLowerCase().includes(k.toLowerCase()) || tender.description?.toLowerCase().includes(k.toLowerCase())
  );
  const tagColor = tag ? categoryColors[tag] : 'bg-gray-100 text-gray-600';
  const tagLabel = tag || 'Tender';

  return (
    <div onClick={onClick} className={\`bg-white rounded-xl px-4 py-3.5 cursor-pointer transition-all \${selected ? 'shadow-lg ring-2 ring-blue-100' : 'shadow-sm hover:shadow-md'}\`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={\`text-xs font-semibold px-2 py-0.5 rounded-full \${tagColor}\`}>{tagLabel}</span>
            {tender.source && (
              <span className={\`text-xs font-bold px-2 py-0.5 rounded-full \${tender.source === 'Umucyo (Gov)' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'}\`}>
                {tender.source === 'Umucyo (Gov)' ? 'Umucyo Gov' : 'Job in Rwanda'}
              </span>
            )}
            {tender.organization && tender.organization !== 'Not specified' && (
              <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{tender.organization}</span>
            )}
            {tender.location && <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{tender.location}</span>}
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{tender.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{tender.description}</p>
        </div>
        {generating ? (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Generating
          </div>
        ) : selected ? (
          <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Selected</span>
        ) : (
          <span className="shrink-0 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">Generate</span>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {tender.deadline}
        </span>
      </div>
    </div>
  );
}
`;

fs.appendFileSync('app/page.tsx', tenderCard);
console.log('E done');
