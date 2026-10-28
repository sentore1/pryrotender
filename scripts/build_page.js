const fs = require('fs');

const imports = `'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import Image from 'next/image';
import { Tender } from '@/lib/scraper';

const NAV_ITEMS = [
  { label: 'All Tenders', icon: '\u25a6', cat: '' },
  { label: 'IT & Technology', icon: '\u2b21', cat: 'IT Technology Software' },
  { label: 'Construction', icon: '\u2b22', cat: 'Construction Infrastructure Building' },
  { label: 'Medical', icon: '\u2b21', cat: 'Medical Healthcare Hospital' },
  { label: 'Consultancy', icon: '\u2b21', cat: 'Consultancy Consulting Services' },
  { label: 'Goods & Supply', icon: '\u2b21', cat: 'Goods Supply Equipment' },
];

type CompanyInfo = {
  name: string; address: string; phone: string; email: string; website: string; refNumber: string;
};
const DEFAULT_COMPANY: CompanyInfo = { name: '', address: '', phone: '', email: '', website: '', refNumber: '' };

export default function Home() {
  const [category, setCategory] = useState('');
  const [activeNav, setActiveNav] = useState('');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [proposal, setProposal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyStamp, setCompanyStamp] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(640);
  const isResizing = React.useRef(false);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startW = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      setPanelWidth(Math.max(380, Math.min(960, startW + (startX - ev.clientX))));
    };
    const onUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => { fetchTenders(''); }, []);

  const fetchTenders = async (cat: string) => {
    setLoading(true); setError(''); setSelectedTender(null); setProposal('');
    try {
      const res = await fetch('/api/tenders?category=' + encodeURIComponent(cat));
      const data = await res.json();
      if (data.success) {
        setTenders(data.tenders);
        if (!data.tenders.length) setError(cat ? 'No tenders found for "' + cat + '".' : 'No tenders available.');
      } else { setError(data.error || 'Failed to fetch tenders.'); setTenders([]); }
    } catch { setError('Network error. Please try again.'); setTenders([]); }
    finally { setLoading(false); }
  };

  const handleNavClick = (cat: string) => { setActiveNav(cat); setCategory(cat); setSearchInput(''); fetchTenders(cat); };
  const handleSearch = () => { setActiveNav(''); setCategory(searchInput); fetchTenders(searchInput); };

  const generateProposal = async (tender: Tender) => {
    setSelectedTender(tender); setGenerating(true); setProposal(''); setError('');
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderDetails: tender.title + '\\n\\n' + tender.description, requirements: tender.requirements, companyInfo }),
      });
      const data = await res.json();
      if (data.success) setProposal(data.proposal);
      else setError(data.error || 'Failed to generate proposal.');
    } catch { setError('Error generating proposal.'); }
    finally { setGenerating(false); }
  };

  const copyToClipboard = () => navigator.clipboard.writeText(proposal).catch(() => alert('Failed to copy'));

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
    } catch { setError('Error updating proposal.'); }
    finally { setChatLoading(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setCompanyLogo(r.result as string); r.readAsDataURL(file); }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setCompanyStamp(r.result as string); r.readAsDataURL(file); }
  };
`;

fs.writeFileSync('app/page.tsx', imports);
console.log('A done, lines:', imports.split('\n').length);
