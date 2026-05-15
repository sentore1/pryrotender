'use client';

import { useState, useEffect } from 'react';
import { Tender } from '@/lib/scraper';

export default function Home() {
  const [category, setCategory] = useState('');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [proposal, setProposal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyStamp, setCompanyStamp] = useState<string | null>(null);

  // Load all tenders on initial page load
  useEffect(() => {
    searchTenders();
  }, []);

  const searchTenders = async () => {
    setLoading(true);
    setError('');
    setSelectedTender(null);
    setProposal('');
    
    try {
      const searchCategory = category.trim();
      console.log('Searching for:', searchCategory || 'all tenders');
      
      const response = await fetch(`/api/tenders?category=${encodeURIComponent(searchCategory)}`);
      const data = await response.json();
      
      console.log('API response:', data);
      
      if (data.success) {
        setTenders(data.tenders);
        if (data.tenders.length === 0 && searchCategory) {
          setError(`No tenders found for "${searchCategory}". Try a different search term.`);
        } else if (data.tenders.length === 0) {
          setError('No tenders available at the moment. Please try again later.');
        }
      } else {
        setError(data.error || 'Failed to fetch tenders. Please try again.');
        setTenders([]);
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
      setError('Network error. Please check your connection and try again.');
      setTenders([]);
    } finally {
      setLoading(false);
    }
  };

  const generateProposalForTender = async (tender: Tender) => {
    setSelectedTender(tender);
    setGenerating(true);
    setProposal('');
    setError(''); // Clear any previous errors
    
    try {
      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenderDetails: `${tender.title}\n\n${tender.description}`,
          requirements: tender.requirements
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProposal(data.proposal);
      } else {
        setProposal('');
        setError(data.error || 'Failed to generate proposal. Please try again.');
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      setProposal('');
      setError('Error generating proposal. Please check your API key configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!proposal) return;
    navigator.clipboard.writeText(proposal).then(() => {
      // Show success feedback
      const btn = document.activeElement as HTMLButtonElement;
      const originalText = btn?.textContent;
      if (btn) {
        btn.textContent = '✓ Copied!';
        btn.classList.add('bg-green-600');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('bg-green-600');
        }, 2000);
      }
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyStamp(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadPDF = () => {
    // Create HTML content with logo and stamp
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    .logo-container { text-align: center; margin-bottom: 30px; }
    .logo-container img { max-width: 300px; max-height: 100px; }
    .proposal-content { white-space: pre-wrap; font-size: 12px; }
    .stamp-container { margin-top: 40px; text-align: right; }
    .stamp-container img { max-width: 200px; max-height: 200px; }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
`;

    if (companyLogo) {
      htmlContent += `
  <div class="logo-container">
    <img src="${companyLogo}" alt="Company Logo" />
  </div>
`;
    }

    htmlContent += `
  <div class="proposal-content">${proposal.replace(/\n/g, '<br>')}</div>
`;

    if (companyStamp) {
      htmlContent += `
  <div class="stamp-container">
    <img src="${companyStamp}" alt="Company Stamp" />
  </div>
`;
    }

    htmlContent += `
</body>
</html>
`;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal-${selectedTender?.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PryroTender</h1>
              <p className="text-blue-100 text-sm">AI-Powered Tender Assistant for Rwanda</p>
            </div>
            <div className="hidden md:block">
              <span className="text-sm text-blue-100">Tenders: </span>
              <span className="text-lg font-bold">{tenders.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* API Key Info Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 rounded text-sm">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-gray-800">
                <strong className="text-yellow-800">Live Data:</strong> Fetching real tenders from Job in Rwanda & Umucyo. 
                For AI proposals, add GROQ API key to <code className="bg-yellow-200 px-1 rounded text-xs">env.local</code>
              </p>
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" 
                 className="inline-flex items-center gap-1 mt-1 text-xs text-blue-700 hover:text-blue-900 underline">
                Get free API key
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-lg font-bold text-gray-800">Search Tenders</h2>
          </div>
          
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by keyword, organization, location..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && searchTenders()}
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={searchTenders}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-2 font-medium text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setCategory(''); setTimeout(searchTenders, 100); }}
              className="px-3 py-1 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-full transition"
            >
              All Tenders
            </button>
            <button
              onClick={() => { setCategory('IT Technology Software'); setTimeout(searchTenders, 100); }}
              className="px-3 py-1 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full transition"
            >
              IT & Technology
            </button>
            <button
              onClick={() => { setCategory('Construction Infrastructure Building'); setTimeout(searchTenders, 100); }}
              className="px-3 py-1 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-full transition"
            >
              Construction
            </button>
            <button
              onClick={() => { setCategory('Medical Healthcare Hospital'); setTimeout(searchTenders, 100); }}
              className="px-3 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-full transition"
            >
              Medical & Healthcare
            </button>
            <button
              onClick={() => { setCategory('Consultancy Consulting Services'); setTimeout(searchTenders, 100); }}
              className="px-3 py-1 text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-full transition"
            >
              Consultancy
            </button>
            <button
              onClick={() => { setCategory('Goods Supply Equipment'); setTimeout(searchTenders, 100); }}
              className="px-3 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 text-green-800 rounded-full transition"
            >
              Goods & Supply
            </button>
          </div>
          
          {error && (
            <div className="mt-3 p-2 bg-red-50 border-l-4 border-red-500 text-red-800 rounded flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">Available Tenders</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-sm">
                {tenders.length}
              </span>
            </div>
            {loading ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Loading tenders...</p>
              </div>
            ) : tenders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-sm">No tenders found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tenders.map((tender) => (
                  <div
                    key={tender.id}
                    className={`bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer border p-4 ${
                      selectedTender?.id === tender.id 
                        ? 'border-blue-500 ring-2 ring-blue-100' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => generateProposalForTender(tender)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-800 flex-1 pr-2 leading-tight">
                        {tender.title}
                      </h3>
                      {selectedTender?.id === tender.id && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                          SELECTED
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold">
                        TENDER
                      </span>
                      {tender.organization && tender.organization !== 'Not specified' && (
                        <span className="text-gray-700 font-medium text-xs">
                          {tender.organization}
                        </span>
                      )}
                      {tender.location && (
                        <span className="text-gray-600 text-xs">
                          {tender.location}
                        </span>
                      )}
                      <span className="text-gray-600 text-xs">
                        {tender.deadline}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-2 leading-relaxed">{tender.description}</p>
                    <div className="bg-gray-50 rounded p-2 mb-2 border border-gray-200">
                      <p className="text-xs text-gray-700">
                        <strong className="text-gray-900">Requirements:</strong> {tender.requirements}
                      </p>
                    </div>
                    
                    <button className="w-full mt-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium text-sm">
                      Generate Proposal
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-bold text-gray-800">Generated Proposal</h2>
            </div>
            <div className="bg-white rounded-lg shadow p-4 min-h-[400px] sticky top-4">
              {!selectedTender && !error && (
                <div className="text-center text-gray-400 mt-20">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium">Select a tender to generate a proposal</p>
                </div>
              )}
              
              {error && selectedTender && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-800 rounded text-sm">
                  <strong className="font-bold">Error:</strong> {error}
                </div>
              )}
              
              {selectedTender && generating && (
                <div className="text-center text-gray-500 mt-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm font-semibold text-gray-700">Generating AI proposal...</p>
                </div>
              )}
              
              {selectedTender && !generating && proposal && (
                <div>
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h3 className="text-base font-bold text-gray-800 mb-1">
                      {selectedTender.title}
                    </h3>
                    <p className="text-xs text-gray-600">Generated on {new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  {/* Logo and Stamp Upload Section */}
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Add Your Branding (Optional)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">Company Logo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                        />
                        {companyLogo && (
                          <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-center">
                            <img src={companyLogo} alt="Logo Preview" className="max-h-12 mx-auto" />
                            <button
                              onClick={() => setCompanyLogo(null)}
                              className="text-xs text-red-600 hover:text-red-800 mt-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">Company Stamp/Seal</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStampUpload}
                          className="block w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                        />
                        {companyStamp && (
                          <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-center">
                            <img src={companyStamp} alt="Stamp Preview" className="max-h-12 mx-auto" />
                            <button
                              onClick={() => setCompanyStamp(null)}
                              className="text-xs text-red-600 hover:text-red-800 mt-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-[500px] overflow-y-auto">
                    {companyLogo && (
                      <div className="text-center mb-4 pb-4 border-b border-gray-300">
                        <img src={companyLogo} alt="Company Logo" className="max-h-20 mx-auto" />
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap text-xs text-gray-800 font-sans leading-relaxed">
                      {proposal}
                    </pre>
                    {companyStamp && (
                      <div className="text-right mt-4 pt-4 border-t border-gray-300">
                        <img src={companyStamp} alt="Company Stamp" className="max-h-24 ml-auto" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={downloadPDF}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      Download with Logo & Stamp
                    </button>
                    <button 
                      onClick={copyToClipboard}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      Copy Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
