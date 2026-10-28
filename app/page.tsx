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
  IT: 'bg-blue-100 text-blue-700',
  Construction: 'bg-orange-100 text-orange-700',
  Medical: 'bg-red-100 text-red-700',
  Consultancy: 'bg-purple-100 text-purple-700',
  Goods: 'bg-green-100 text-green-700',
  Services: 'bg-yellow-100 text-yellow-700',
};

const WORKFLOW_STEPS = [
  { color: 'bg-red-500', label: 'Tender published', sub: 'New government procurement posted', time: '09:41 AM', done: true },
  { color: 'bg-blue-500', label: 'AI analyzing tender', sub: 'Extracting requirements & scope', time: '09:41 AM', done: true },
  { color: 'bg-green-500', label: 'Proposal generated', sub: 'Technical & financial sections drafted', time: '09:42 AM', done: true },
  { color: 'bg-purple-500', label: 'Notification sent', sub: 'Email alert dispatched to your inbox', time: '09:42 AM', done: true },
  { color: 'bg-orange-400', label: 'Document exported', sub: 'Word file ready for submission', time: '09:42 AM', done: false },
];

const CHAT_MSGS = [
  { from: 'user', text: 'A new ICT tender has been posted by Ministry of Education.' },
  { from: 'ai', text: "I've analyzed the requirements. It covers supply of 500 laptops and networking equipment." },
  { from: 'ai', text: 'Generating a full technical & financial proposal now...' },
  { from: 'ai', text: 'Proposal ready. Deadline is Aug 15 — 3 weeks away. Download your Word document.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900">

      {/* Nav */}
      <nav className="bg-[#f5f5f5] px-8 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Image src="/logo.png" alt="PryroTender" width={130} height={40} className="object-contain" priority />
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
        <div className="inline-flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm mb-8">
          <div className="flex -space-x-1.5">
            {['RW','CO','BU','MD'].map((e, i) => (
              <span key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-bold text-blue-600">{e}</span>
            ))}
          </div>
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
            className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-700 transition text-sm shadow-sm">
            Start for Free
          </Link>
          <Link href="#pricing"
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-full border border-gray-200 hover:bg-gray-50 transition text-sm shadow-sm">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Mockup on gradient background */}
      <section className="relative mx-4 md:mx-12 rounded-[4px] overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a6fd4 0%, #4fa3e0 40%, #7ec8a0 70%, #a8d8a8 100%)', minHeight: 480 }}>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 flex items-start justify-center gap-4 px-6 pt-12 pb-0 max-w-5xl mx-auto">
          {/* Left card — Workflow */}
          <div className="bg-white rounded-[4px] shadow-2xl w-80 shrink-0 overflow-hidden" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-[4px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800" style={{fontFamily:'Inter,system-ui,sans-serif'}}>New Tender Detected</p>
                <p className="text-xs text-gray-400" style={{fontFamily:'Inter,system-ui,sans-serif'}}>Ref #TND-2025-0847 · 2 min ago</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Workflow Progress</p>
              <div className="space-y-3">
                {WORKFLOW_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${step.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700">{step.label}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{step.time} {step.done && '✓'}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-blue-600 text-sm">✓</span>
                <span className="text-sm font-semibold text-blue-600">Proposal completed</span>
                <span className="ml-auto text-xs text-gray-400">09:42 AM</span>
              </div>
            </div>
          </div>

          {/* Right card — AI Chat */}
          <div className="bg-white rounded-[4px] shadow-2xl w-80 shrink-0 overflow-hidden" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-[4px] flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">AI Agent</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">PryroTender AI</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-gray-300 inline-block" />)}
              </div>
            </div>
            <div className="px-4 py-4 space-y-3 min-h-64">
              {CHAT_MSGS.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {msg.from === 'ai' && (
                    <div className="w-6 h-6 rounded-[4px] bg-blue-600 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-[4px] text-xs leading-relaxed ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
              <input readOnly value="Ask anything or type a command..." className="flex-1 text-xs text-gray-400 bg-transparent outline-none cursor-default" />
              <button className="w-7 h-7 bg-blue-600 rounded-[4px] flex items-center justify-center text-white text-xs shrink-0">→</button>
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
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[t.cat] || 'bg-gray-100 text-gray-600'}`}>{t.cat}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.source === 'Umucyo Gov' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white'}`}>{t.source}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">{t.title}</p>
                <p className="text-xs text-pink-600 font-medium mb-2">{t.org}</p>
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
        <p>© {new Date().getFullYear()} PryroTender. All rights reserved.</p>
        <p className="mt-1">Contact: <a href="mailto:abdousentore@gmail.com" className="hover:text-gray-600">abdousentore@gmail.com</a></p>
      </footer>
    </div>
  );
}
