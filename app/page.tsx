'use client';
import Image from 'next/image';
import Link from 'next/link';

const SAMPLE_TENDERS = [
  { id: 1, title: 'Supply of ICT Equipment for Ministry of Education', org: 'Ministry of Education', deadline: '2025-08-15', cat: 'IT', source: 'Umucyo Gov' },
  { id: 2, title: 'Construction of District Hospital – Phase 2', org: 'Rwanda Health Board', deadline: '2025-08-20', cat: 'Construction', source: 'Umucyo Gov' },
  { id: 3, title: 'Consultancy for Strategic Plan Development', org: 'RURA', deadline: '2025-08-10', cat: 'Consultancy', source: 'Job in Rwanda' },
  { id: 4, title: 'Supply of Medical Consumables and Pharmaceuticals', org: 'RNPHR', deadline: '2025-08-25', cat: 'Medical', source: 'Umucyo Gov' },
  { id: 5, title: 'Provision of Security Services – Kigali Office', org: 'BNR', deadline: '2025-09-01', cat: 'Services', source: 'Job in Rwanda' },
  { id: 6, title: 'Supply of Office Furniture and Equipment', org: 'RDB', deadline: '2025-08-30', cat: 'Goods', source: 'Umucyo Gov' },
];

const CAT_COLORS: Record<string, string> = {
  IT: 'bg-blue-600 text-white',
  Construction: 'bg-orange-500 text-white',
  Medical: 'bg-red-600 text-white',
  Consultancy: 'bg-purple-600 text-white',
  Goods: 'bg-green-600 text-white',
  Services: 'bg-yellow-500 text-white',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900">

      {/* Nav */}
      <nav className="bg-[#f5f5f5] px-8 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Image src="/logo.png" alt="PryroTender" width={130} height={40} style={{ height: 'auto' }} className="object-contain" priority />
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition">Features</a>
          <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
          <a href="#tenders" className="hover:text-gray-900 transition">Tenders</a>
          <a href="mailto:abdousentore@gmail.com" className="hover:text-gray-900 transition">Contact</a>
        </div>
        <Link href="/register"
          className="text-sm font-semibold px-5 py-2.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:bg-gray-50 transition">
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-14 pb-0 text-center">
        {/* Social proof badge */}
        <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm mb-8">
          <span className="text-sm text-gray-600 font-medium">Trusted by 200+ Rwanda companies</span>
        </div>

        {/* Two-tone heading */}
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-4">
          <span className="text-gray-900">Find tenders. Win contracts.</span>
          <br />
          <span className="text-gray-400">Powered by AI.</span>
        </h1>

        <p className="text-base text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Access every Rwanda government and private tender in one place.<br />
          Generate professional proposals in seconds.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 mb-16">
          <Link href="/register"
            className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-700 transition text-sm shadow-sm">
            Start for Free
          </Link>
          <Link href="#pricing"
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition text-sm shadow-sm">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Mockup on gradient background */}
      <section className="relative mx-4 md:mx-12 rounded-[4px] overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a6fd4 0%, #4fa3e0 40%, #7ec8a0 70%, #a8d8a8 100%)', minHeight: 480 }}>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 flex items-start justify-center gap-4 px-6 pt-12 pb-0 max-w-5xl mx-auto">
          {/* Left — stacked tender cards */}
          <div className="w-96 shrink-0 space-y-2" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
            {/* Card 1 — selected */}
            <div className="bg-white rounded-lg shadow-lg px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-700 text-white">Tender</span></div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Tender Notice for Supply of Three (3) Interactive Smart Screen to BRD</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold">Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">29-10-2026</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-600 text-white">Job in Rwanda</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-pink-600 text-white">BRD</span>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-lg shadow-sm px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-700 text-white">Tender</span></div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Tender Notice for Supply of Audio-Visual Equipment</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold">Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">09-11-2026</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-600 text-white">Job in Rwanda</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-pink-600 text-white">Irembo Ltd</span>
                </div>
              </div>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-lg shadow-sm px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-700 text-white">Tender</span></div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">Request for Proposals – Framework Supply of IT Infrastructure</p>
                </div>
                <span className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold">Generate</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">09-11-2026</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-600 text-white">Job in Rwanda</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-pink-600 text-white">Irembo Ltd</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Generated Proposal panel */}
          <div className="bg-white rounded-lg shadow-2xl w-[480px] shrink-0 overflow-hidden" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">Generated Proposal</h2>
              <span className="text-gray-300 text-base">✕</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-800 mb-3">Tender Notice for Supply of Three (3) Interactive Smart Screen to BRD Head Office</p>
              <div className="border border-gray-200 rounded-md p-3 space-y-2">
                <p className="text-xs font-bold text-gray-900">TECHNICAL AND FINANCIAL PROPOSAL</p>
                <div className="space-y-1 text-xs text-gray-700">
                  <p><span className="font-semibold">Tender Reference:</span> Tender Notice for Supply of Three (3) Interactive Smart Screen to BRD Head Office</p>
                  <p><span className="font-semibold">Proposal Reference:</span> REF-2026-001</p>
                  <p><span className="font-semibold">Submission Date:</span> 28 October 2026</p>
                  <p><span className="font-semibold">Submitted By:</span> [Your Organization Name]</p>
                  <p><span className="font-semibold">Address:</span> [Street Address, Kigali, Rwanda]</p>
                  <p><span className="font-semibold">Telephone:</span> [+250 XXX XXX XXX]</p>
                  <p><span className="font-semibold">Email:</span> [company@email.com]</p>
                  <p><span className="font-semibold">Website:</span> [www.yourcompany.rw]</p>
                </div>
                <p className="text-xs font-bold text-gray-900 pt-1">1. EXECUTIVE SUMMARY</p>
                <p className="text-xs text-gray-600">We are pleased to submit this comprehensive proposal in response to the tender...</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md">Copy</button>
                <button className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md">Download DOCX</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-12 mt-16">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          {[['500+', 'Active Tenders'], ['50+', 'Organizations'], ['AI-Powered', 'Proposals']].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-blue-600">{val}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sample Tenders */}
      <section id="tenders" className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Tenders Preview</h2>
            <p className="text-gray-500 text-sm">Sign up to access all tenders and generate proposals.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {SAMPLE_TENDERS.map(t => (
              <div key={t.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[t.cat] || 'bg-gray-100 text-gray-600'}`}>{t.cat}</span>
                    <span className="text-xs font-semibold text-gray-900">{t.org}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.source === 'Umucyo Gov' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'}`}>{t.source}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">{t.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Deadline: {t.deadline}</span>
                  <Link href="/register" className="text-xs font-semibold text-blue-600 hover:underline">Generate Proposal →</Link>
                </div>
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                  <Link href="/register" className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-full shadow">Sign up to access</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/register" className="inline-block px-6 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-700 transition text-sm">
              View All Tenders →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#f5f5f5] py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-2">Simple Pricing</h2>
          <p className="text-center text-gray-500 text-sm mb-10">Cancel anytime. No hidden fees.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition">
              <div className="text-sm font-semibold text-gray-500 mb-1">Monthly</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">$29 <span className="text-base font-normal text-gray-400">/mo</span></div>
              <p className="text-xs text-gray-400 mb-5">Billed monthly</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {['All tenders access', 'Unlimited AI proposals', 'Email notifications', 'Word export', 'Company branding'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/register?plan=monthly" className="block text-center py-2.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-700 transition text-sm">Get Started</Link>
            </div>
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-6 relative shadow-md">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">Best Value</span>
              <div className="text-sm font-semibold text-gray-900 mb-1">Annual</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">$249 <span className="text-base font-normal text-gray-400">/yr</span></div>
              <p className="text-xs text-gray-400 mb-5">Save $99 vs monthly</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {['All tenders access', 'Unlimited AI proposals', 'Email notifications', 'Word export', 'Company branding', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/register?plan=annual" className="block text-center py-2.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-700 transition text-sm">Get Started</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p suppressHydrationWarning>© {new Date().getFullYear()} PryroTender. All rights reserved.</p>
        <p className="mt-1">Contact: <a href="mailto:abdousentore@gmail.com" className="hover:text-gray-600">abdousentore@gmail.com</a></p>
      </footer>
    </div>
  );
}
