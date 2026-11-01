import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import LandingTendersBrowser from '@/components/LandingTendersBrowser';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

export const metadata: Metadata = {
  title: 'PryroTender – Rwanda Tenders & AI Proposal Generator',
  description:
    'Access every Rwanda government and private tender in one place. Generate professional proposals with AI in seconds. Trusted by Rwandan businesses.',
  alternates: { canonical: APP_URL },
  openGraph: {
    title: 'PryroTender – Rwanda Tenders & AI Proposal Generator',
    description: 'Find and win Rwanda tenders faster with AI-powered proposal generation.',
    url: APP_URL,
    siteName: 'PryroTender',
    type: 'website',
  },
};

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Nav */}
      <nav className="bg-white px-5 md:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Image src="/logo.png" alt="PryroTender" width={60} height={20} style={{ height: 'auto' }} className="object-contain" priority />
        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <Link href="/tenders" className="hover:text-gray-900 transition">Tenders</Link>
            <a href="mailto:hello@pryro.com" className="hover:text-gray-900 transition">Contact</a>
          </div>
          <Link href="/register"
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition" style={{borderRadius:'4px'}}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-0 text-center bg-white">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-4">
          <span className="text-gray-900">Find tenders. Win contracts.</span>
          <br />
          <span className="text-gray-900">Powered by AI.</span>
        </h1>
        <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto mb-8 md:mb-10 leading-relaxed">
          Access every Rwanda government and private tender in one place.<br />
          Generate professional proposals in seconds.
        </p>
        <div className="flex items-center justify-center gap-1 mb-10 md:mb-16">
          <div className="flex bg-gray-100 p-1 gap-1" style={{borderRadius:'4px'}}>
            <Link href="/register" className="px-3 py-1.5 bg-white text-gray-900 font-semibold shadow text-xs" style={{borderRadius:'4px'}}>Start for Free</Link>
            <Link href="/tenders" className="px-3 py-1.5 text-gray-500 font-semibold hover:text-gray-700 transition text-xs" style={{borderRadius:'4px'}}>Browse Tenders</Link>
          </div>
        </div>
      </section>

      {/* Mockup on gradient background */}
      <section className="relative mx-2 md:mx-12 rounded-[4px] overflow-hidden" style={{ background: 'linear-gradient(to bottom, #1a6fd4 0%, #ffffff 100%)', minHeight: 480 }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 flex flex-col md:flex-row items-start justify-center gap-4 px-4 md:px-6 pt-8 md:pt-12 pb-0 max-w-6xl mx-auto">
          {/* Left — stacked tender cards */}
          <div className="w-full md:w-[320px] md:shrink-0 space-y-2" style={{fontFamily:'Inter,system-ui,sans-serif', background:'rgba(255,255,255,0.18)', borderRadius:'4px', padding:'12px', backdropFilter:'blur(2px)'}}>
            {/* Card 1 — selected */}
            <div className="bg-white shadow-lg px-4 py-3.5" style={{borderRadius:'4px'}}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-700 text-white" style={{borderRadius:'4px'}}>Tender</span>
                    <span className="text-xs font-bold text-gray-900">BRD</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Tender Notice for Supply of Three (3) Interactive Smart Screen to BRD</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:'4px'}}>Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">29-10-2026</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Job in Rwanda</span>
              </div>
            </div>
            {/* Card 2 */}
            <div className="bg-white shadow-sm px-4 py-3.5" style={{borderRadius:'4px'}}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-700 text-white" style={{borderRadius:'4px'}}>Tender</span>
                    <span className="text-xs font-bold text-gray-900">Irembo Ltd</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Tender Notice for Supply of Audio-Visual Equipment</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:'4px'}}>Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">09-11-2026</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Job in Rwanda</span>
              </div>
            </div>
            {/* Card 3 */}
            <div className="bg-white shadow-sm px-4 py-3.5" style={{borderRadius:'4px'}}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-700 text-white" style={{borderRadius:'4px'}}>Tender</span>
                    <span className="text-xs font-bold text-gray-900">RURA</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Procurement of Consultancy Services for ICT Strategy Development</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:'4px'}}>Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">15-12-2026</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Umucyo Gov</span>
              </div>
            </div>
            {/* Card 4 */}
            <div className="bg-white shadow-sm px-4 py-3.5" style={{borderRadius:'4px'}}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-700 text-white" style={{borderRadius:'4px'}}>Tender</span>
                    <span className="text-xs font-bold text-gray-900">Irembo Ltd</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Request for Proposals – Framework Supply of IT Infrastructure</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold" style={{borderRadius:'4px'}}>Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">09-11-2026</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Job in Rwanda</span>
              </div>
            </div>
          </div>

          {/* Right — Generated Proposal panel */}
          <div className="hidden md:block" style={{background:'rgba(255,255,255,0.18)', borderRadius:'4px', padding:'12px', backdropFilter:'blur(2px)'}}>
          <div className="bg-white shadow-2xl w-[780px] shrink-0 overflow-hidden" style={{fontFamily:'Inter,system-ui,sans-serif', borderRadius:'4px'}}>
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">Generated Proposal</h2>
              <span className="text-gray-600 text-base">✕</span>
            </div>
            <div className="px-5 py-4 bg-gray-100">
              <p className="text-xs font-semibold text-gray-800 mb-3">Tender Notice for Supply of Three (3) Interactive Smart Screen to BRD Head Office</p>
              <div className="border border-gray-200 overflow-y-auto bg-white" style={{borderRadius:'4px', maxHeight:'450px', fontFamily:'"Times New Roman", Times, serif'}}>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                  <Image src="/logo.png" alt="PryroTender" width={90} height={30} style={{height:'auto'}} className="object-contain" />
                  <div className="text-right">
                    <p className="text-xs text-gray-500">REF-2026-001</p>
                    <p className="text-xs text-gray-500">28 October 2026</p>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-bold text-gray-900 text-center tracking-wide mb-1">TECHNICAL AND FINANCIAL PROPOSAL</p>
                  <p className="text-xs text-gray-500 text-center mb-3">Tender Notice for Supply of Three (3) Interactive Smart Screens — BRD Head Office</p>
                  <div className="space-y-1 text-xs text-gray-700 border border-gray-100 p-3" style={{borderRadius:'4px'}}>
                    <p><span className="font-bold">Submitted By:</span> [Your Organization Name]</p>
                    <p><span className="font-bold">Proposal Reference:</span> REF-2026-001</p>
                    <p><span className="font-bold">Submission Date:</span> 28 October 2026</p>
                  </div>
                  <p className="text-xs font-bold text-gray-900 pt-3">1. EXECUTIVE SUMMARY</p>
                  <p className="text-xs text-gray-600 leading-relaxed">We are pleased to submit this proposal in response to BRD&apos;s tender for interactive smart screens. Our organization has extensive experience supplying ICT equipment to government and private institutions across Rwanda.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">2. TECHNICAL SPECIFICATIONS</p>
                  <ul className="text-xs text-gray-600 space-y-0.5 pl-4 list-disc">
                    <li>Screen Size: 75 inches · Resolution: 4K UHD</li>
                    <li>Touch Points: 20-point multi-touch</li>
                    <li>Connectivity: HDMI, USB-C, Wi-Fi 6</li>
                    <li>Warranty: 3 years on-site</li>
                  </ul>
                  <p className="text-xs font-bold text-gray-900 pt-3">3. FINANCIAL PROPOSAL</p>
                  <div className="border border-gray-200 text-xs text-gray-700 mt-1" style={{borderRadius:'4px'}}>
                    <div className="grid grid-cols-3 px-3 py-1.5 font-bold border-b border-gray-100"><span>Item</span><span className="text-center">Qty</span><span className="text-right">Unit (RWF)</span></div>
                    <div className="grid grid-cols-3 px-3 py-1.5"><span>Smart Screen 75&quot;</span><span className="text-center">3</span><span className="text-right">4,500,000</span></div>
                    <div className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100 font-bold"><span className="col-span-2">Total (VAT inclusive)</span><span className="text-right">13,950,000</span></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-semibold" style={{borderRadius:'4px'}}>Copy</button>
                <button className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5" style={{borderRadius:'4px'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download DOCX
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Live Tenders — client-side filterable, no redirect */}
      <section id="tenders" className="bg-white">
        <LandingTendersBrowser />
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10 px-5 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-8">
          {/* Left — logo + copyright */}
          <div className="flex flex-col gap-3">
            <span className="font-black text-gray-200 leading-none tracking-tight select-none" style={{fontSize:'12rem'}}>pryro</span>
            <p className="text-xs text-gray-400 mt-6" suppressHydrationWarning>© {new Date().getFullYear()} PryroTender. All rights reserved.</p>
          </div>
          {/* Right — links */}
          <div className="flex flex-col gap-2 text-xs text-gray-400 text-right justify-end self-end mb-8">
            <Link href="/tenders" className="hover:text-gray-600 transition">All Tenders</Link>
            <Link href="/tenders/category/government" className="hover:text-gray-600 transition">Government Tenders</Link>
            <Link href="/tenders/category/ict-software" className="hover:text-gray-600 transition">ICT Tenders</Link>
            <Link href="/register" className="hover:text-gray-600 transition">Register</Link>
            <a href="mailto:hello@pryro.com" className="hover:text-gray-600 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
