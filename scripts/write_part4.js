const fs = require('fs');
const part4 = `
  const renderMarkdown = (text: string) => {
    const lines = text.split('\\n');
    const output: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Markdown table
      if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|---')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
        const parseRow = (r: string) => r.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2);
        output.push(
          <div key={i + '-tbl'} style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Times New Roman, serif' }}>
              <thead>
                <tr>{headers.map((h, hi) => <th key={hi} style={{ background: '#1a3a6b', color: '#fff', padding: '7px 10px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #c0cfe8' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f0f4fa' }}>
                    {parseRow(row).map((cell, ci) => <td key={ci} style={{ padding: '6px 10px', border: '1px solid #c0cfe8', verticalAlign: 'top' }}>{parseBold(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
      if (/^[-*_]{3,}\\s*$/.test(line.trim())) {
        output.push(<hr key={i} style={{ border: 'none', borderTop: '2px solid #1a3a6b', margin: '14px 0' }} />);
      } else if (line.startsWith('## ')) {
        output.push(<p key={i} style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a3a6b', margin: '14px 0 6px', borderBottom: '1px solid #c0cfe8', paddingBottom: '3px' }}>{parseBold(line.slice(3))}</p>);
      } else if (line.startsWith('### ')) {
        output.push(<p key={i} style={{ fontWeight: 'bold', fontSize: '13px', color: '#2c5282', margin: '10px 0 4px' }}>{parseBold(line.slice(4))}</p>);
      } else if (line.startsWith('# ')) {
        output.push(<p key={i} style={{ fontWeight: 'bold', fontSize: '15px', color: '#1a3a6b', margin: '14px 0 6px' }}>{parseBold(line.slice(2))}</p>);
      } else if (/^[-*] /.test(line)) {
        output.push(<p key={i} style={{ margin: '3px 0', paddingLeft: '18px' }}>{'• '}{parseBold(line.slice(2))}</p>);
      } else if (!line.trim()) {
        output.push(<p key={i} style={{ margin: 0, minHeight: '0.7em' }}>&nbsp;</p>);
      } else {
        output.push(<p key={i} style={{ margin: '3px 0' }}>{parseBold(line)}</p>);
      }
      i++;
    }
    return output;
  };

  const parseBold = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\\*\\*[^*]+\\*\\*)/g);
    return parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p);
  };

  const openTenders = tenders.filter(t => !t.deadline?.toLowerCase().includes('closed'));
  const closedTenders = tenders.filter(t => t.deadline?.toLowerCase().includes('closed'));

  return (
    <div className="flex h-screen bg-[#f4f5f7] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white flex flex-col border-r border-gray-100 shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <Image src="/logo.png" alt="PryroTender" width={130} height={40} className="object-contain" priority />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.cat} onClick={() => handleNavClick(item.cat)}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors \${activeNav === item.cat ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}\`}>
              <span className="text-base leading-none">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500"><span>⚙</span> Settings</div>
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500"><span>?</span> Help & Support</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1 relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search tenders..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
          </div>
          <button onClick={handleSearch} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Loading...' : 'Search'}
          </button>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">{tenders.length} tenders</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-0">
          {/* Tender list */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-gray-500">Loading tenders...</p>
              </div>
            ) : (
              <>
                {openTenders.length > 0 && (
                  <section className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Open</span>
                      <span className="text-xs font-bold text-gray-400">{openTenders.length}</span>
                    </div>
                    <div className="space-y-2">
                      {openTenders.map(tender => <TenderCard key={tender.id} tender={tender} selected={selectedTender?.id === tender.id} generating={generating && selectedTender?.id === tender.id} onClick={() => generateProposal(tender)} />)}
                    </div>
                  </section>
                )}
                {closedTenders.length > 0 && (
                  <section className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Closed</span>
                      <span className="text-xs font-bold text-gray-400">{closedTenders.length}</span>
                    </div>
                    <div className="space-y-2">
                      {closedTenders.map(tender => <TenderCard key={tender.id} tender={tender} selected={selectedTender?.id === tender.id} generating={generating && selectedTender?.id === tender.id} onClick={() => generateProposal(tender)} />)}
                    </div>
                  </section>
                )}
                {!openTenders.length && !closedTenders.length && !error && (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="text-sm">No tenders found</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Proposal panel */}
          <aside style={{ width: selectedTender ? panelWidth : 420 }} className="shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden relative">
            <div onMouseDown={startResize} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 transition-colors z-10" title="Drag to resize" />
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">Generated Proposal</h2>
              {selectedTender && <button onClick={() => { setSelectedTender(null); setProposal(''); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!selectedTender && (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm text-gray-400">Click a tender to generate a proposal</p>
                </div>
              )}
              {selectedTender && generating && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="text-sm text-gray-500">Generating AI proposal...</p>
                </div>
              )}
              {selectedTender && !generating && error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

              {selectedTender && !generating && proposal && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 leading-snug">{selectedTender.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  {/* Company Info Form */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <button onClick={() => setShowCompanyForm(v => !v)} className="w-full flex items-center justify-between text-xs font-semibold text-blue-700">
                      <span>Company Details {companyInfo.name ? '— ' + companyInfo.name : '(fill for cover page)'}</span>
                      <span>{showCompanyForm ? '▲' : '▼'}</span>
                    </button>
                    {showCompanyForm && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {([['name','Company Name'],['address','Address'],['phone','Phone'],['email','Email'],['website','Website'],['refNumber','Ref Number']] as [keyof CompanyInfo, string][]).map(([field, label]) => (
                          <div key={field} className={field === 'address' ? 'col-span-2' : ''}>
                            <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
                            <input type="text" value={companyInfo[field]} onChange={e => setCompanyInfo(prev => ({ ...prev, [field]: e.target.value }))}
                              className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder={label} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Branding */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <p className="text-xs font-semibold text-gray-600">Branding (optional)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Logo</label>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-xs text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                        {companyLogo && <div className="mt-1 flex items-center gap-1"><img src={companyLogo} className="h-8 object-contain" alt="logo" /><button onClick={() => setCompanyLogo(null)} className="text-xs text-red-500">✕</button></div>}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Stamp / Seal</label>
                        <input type="file" accept="image/*" onChange={handleStampUpload} className="block w-full text-xs text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                        {companyStamp && <div className="mt-1 flex items-center gap-1"><img src={companyStamp} className="h-8 object-contain" alt="stamp" /><button onClick={() => setCompanyStamp(null)} className="text-xs text-red-500">✕</button></div>}
                      </div>
                    </div>
                  </div>

                  {/* Paper preview */}
                  <div className="overflow-y-auto rounded-lg shadow-md" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                    <div className="bg-white border border-gray-300 px-10 py-8" style={{ fontFamily: 'Times New Roman, serif', fontSize: '13px', lineHeight: '1.8', color: '#111' }}>
                      {/* Cover page preview */}
                      <div style={{ borderBottom: '3px solid #1a3a6b', marginBottom: '24px', paddingBottom: '20px', textAlign: 'center' }}>
                        {companyLogo && <div style={{ marginBottom: '12px' }}><img src={companyLogo} style={{ maxHeight: '80px', maxWidth: '260px', display: 'inline-block', objectFit: 'contain' }} alt="logo" /></div>}
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a3a6b', marginBottom: '6px' }}>TECHNICAL AND FINANCIAL PROPOSAL</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>{selectedTender.title}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Ref: {companyInfo.refNumber || 'REF-' + new Date().getFullYear() + '-001'}</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
                        <tbody>
                          {[['Submitted By', companyInfo.name || '[Organization Name]'],['Address', companyInfo.address || '[Address, Kigali, Rwanda]'],['Telephone', companyInfo.phone || '[+250 XXX XXX XXX]'],['Email', companyInfo.email || '[email@company.rw]'],['Website', companyInfo.website || '[www.company.rw]'],['Date', new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })]].map(([k, v]) => (
                            <tr key={k}><td style={{ background: '#e8edf5', fontWeight: 'bold', padding: '5px 10px', border: '1px solid #c0cfe8', width: '30%' }}>{k}</td><td style={{ padding: '5px 10px', border: '1px solid #c0cfe8' }}>{v}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      <hr style={{ border: 'none', borderTop: '2px solid #1a3a6b', marginBottom: '20px' }} />
                      {renderMarkdown(proposal)}
                      {/* Signature */}
                      <div style={{ marginTop: '40px', borderTop: '2px solid #1a3a6b', paddingTop: '20px' }}>
                        <p style={{ fontWeight: 'bold', color: '#1a3a6b', marginBottom: '16px' }}>AUTHORIZED SIGNATORY</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <tbody>
                            {[['Name',''],['Title/Position',''],['Signature',''],['Date', new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })]].map(([k, v]) => (
                              <tr key={k}><td style={{ background: '#e8edf5', fontWeight: 'bold', padding: '5px 10px', border: '1px solid #c0cfe8', width: '25%' }}>{k}</td><td style={{ padding: '5px 10px', border: '1px solid #c0cfe8' }}>{v || '_______________________________'}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        {companyStamp && <div style={{ textAlign: 'right', marginTop: '16px' }}><img src={companyStamp} style={{ maxHeight: '100px', maxWidth: '160px', objectFit: 'contain' }} alt="stamp" /></div>}
                      </div>
                    </div>
                  </div>

                  {/* Chat update */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">Update proposal via chat</div>
                    <div className="flex gap-2 p-2">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatUpdate()}
                        placeholder="e.g. Make it more formal, add a budget section..." disabled={chatLoading}
                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={sendChatUpdate} disabled={chatLoading || !chatInput.trim()} className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                        {chatLoading ? '...' : 'Send'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={downloadWord} className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">⬇ Download Word</button>
                    <button onClick={copyToClipboard} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition">Copy</button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TenderCard({ tender, selected, generating, onClick }: { tender: Tender; selected: boolean; generating: boolean; onClick: () => void; }) {
  const categoryColors: Record<string, string> = {
    'IT': 'bg-blue-100 text-blue-700', 'Construction': 'bg-orange-100 text-orange-700',
    'Medical': 'bg-red-100 text-red-700', 'Consultancy': 'bg-purple-100 text-purple-700', 'Goods': 'bg-green-100 text-green-700',
  };
  const tag = Object.keys(categoryColors).find(k => tender.title?.toLowerCase().includes(k.toLowerCase()) || tender.description?.toLowerCase().includes(k.toLowerCase()));
  const tagColor = tag ? categoryColors[tag] : 'bg-gray-100 text-gray-600';
  const tagLabel = tag || 'Tender';
  return (
    <div onClick={onClick} className={\`bg-white rounded-xl px-4 py-3.5 cursor-pointer transition-all \${selected ? 'shadow-lg ring-2 ring-blue-100' : 'shadow-sm hover:shadow-md'}\`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={\`text-xs font-semibold px-2 py-0.5 rounded-full \${tagColor}\`}>{tagLabel}</span>
            {tender.source && <span className={\`text-xs font-bold px-2 py-0.5 rounded-full \${tender.source === 'Umucyo (Gov)' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'}\`}>{tender.source === 'Umucyo (Gov)' ? 'Umucyo Gov' : 'Job in Rwanda'}</span>}
            {tender.organization && tender.organization !== 'Not specified' && <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{tender.organization}</span>}
            {tender.location && <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{tender.location}</span>}
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{tender.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{tender.description}</p>
        </div>
        {generating ? (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating
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
fs.appendFileSync('app/page.tsx', part4);
console.log('part4 done');
