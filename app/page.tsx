import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { scrapeTenders, Tender } from '@/lib/scraper';
import PricingSection from './PricingSection';

async function TendersGrid() {
  let tenders: Tender[] = [];
  try {
    const all = await scrapeTenders('');
    tenders = all.slice(0, 6);
  } catch {
    tenders = [];
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tenders.length === 0 ? (
        <p className="text-sm text-gray-400 col-span-2 text-center">No tenders available right now. Check back soon.</p>
      ) : tenders.map((t, i) => (
        <div key={i} className="bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden group flex flex-col gap-3" style={{borderRadius:'8px'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 text-white bg-blue-600" style={{borderRadius:'4px'}}>{t.category || 'Tender'}</span>
              <span className="text-xs font-semibold text-gray-500">{t.organization && t.organization !== 'Not specified' ? t.organization : ''}</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 text-gray-500 bg-gray-100" style={{borderRadius:'4px'}}>{t.source}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{t.title}</p>
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span className="text-xs text-gray-400">Deadline: <span className="font-medium text-gray-600">{t.deadline}</span></span>
            </div>
            <Link href="/register" className="text-xs font-semibold px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 transition" style={{borderRadius:'4px'}}>Generate Proposal →</Link>
          </div>
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{borderRadius:'8px'}}>
            <Link href="/register" className="px-5 py-2 bg-gray-900 text-white text-xs font-semibold shadow-md" style={{borderRadius:'4px'}}>Sign up to access</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function TendersSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 p-5 shadow-sm flex flex-col gap-3 animate-pulse" style={{borderRadius:'8px'}}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div className="h-3 w-28 bg-gray-100 rounded" />
            <div className="h-6 w-28 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Nav */}
      <nav className="bg-white px-5 md:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Image src="/logo.png" alt="PryroTender" width={60} height={20} style={{ height: 'auto' }} className="object-contain" priority />
        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
            <a href="#tenders" className="hover:text-gray-900 transition">Tenders</a>
            <a href="mailto:abdousentore@gmail.com" className="hover:text-gray-900 transition">Contact</a>
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
            <Link href="#pricing" className="px-3 py-1.5 text-gray-500 font-semibold hover:text-gray-700 transition text-xs" style={{borderRadius:'4px'}}>View Pricing</Link>
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Job in Rwanda</span>
                </div>
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Job in Rwanda</span>
                </div>
              </div>
            </div>
            {/* Card 3 */}
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Job in Rwanda</span>
                </div>
              </div>
            </div>
            {/* Card 4 */}
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500" style={{borderRadius:'4px'}}>Umucyo Gov</span>
                </div>
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
              {/* Scrollable document — 3 pages separated by dividers */}
              <div className="border border-gray-200 overflow-y-auto bg-white" style={{borderRadius:'4px', maxHeight:'450px', fontFamily:'"Times New Roman", Times, serif'}}>
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                  <Image src="/logo.png" alt="PryroTender" width={90} height={30} style={{height:'auto'}} className="object-contain" />
                  <div className="text-right">
                    <p className="text-xs text-gray-500">REF-2026-001</p>
                    <p className="text-xs text-gray-500">28 October 2026</p>
                  </div>
                </div>
                {/* Page 1 */}
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-bold text-gray-900 text-center tracking-wide mb-1">TECHNICAL AND FINANCIAL PROPOSAL</p>
                  <p className="text-xs text-gray-500 text-center mb-3">Tender Notice for Supply of Three (3) Interactive Smart Screens — BRD Head Office</p>
                  <div className="space-y-1 text-xs text-gray-700 border border-gray-100 p-3" style={{borderRadius:'4px'}}>
                    <p><span className="font-bold">Tender Reference:</span> Tender Notice for Supply of Three (3) Interactive Smart Screen to BRD Head Office</p>
                    <p><span className="font-bold">Proposal Reference:</span> REF-2026-001</p>
                    <p><span className="font-bold">Submission Date:</span> 28 October 2026</p>
                    <p><span className="font-bold">Submitted By:</span> [Your Organization Name]</p>
                    <p><span className="font-bold">Address:</span> [Street Address, Kigali, Rwanda]</p>
                    <p><span className="font-bold">Telephone:</span> [+250 XXX XXX XXX]</p>
                    <p><span className="font-bold">Email:</span> [company@email.com]</p>
                    <p><span className="font-bold">Website:</span> [www.yourcompany.rw]</p>
                  </div>
                  <p className="text-xs font-bold text-gray-900 pt-3">1. EXECUTIVE SUMMARY</p>
                  <p className="text-xs text-gray-600 leading-relaxed">We are pleased to submit this comprehensive Technical and Financial Proposal in response to the tender notice issued by the Development Bank of Rwanda (BRD). Our organization has extensive experience supplying high-quality interactive smart screens and AV equipment to government institutions, schools, and corporate entities across Rwanda and the East African region.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">2. COMPANY PROFILE</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Founded in 2015, [Your Organization Name] is a registered Rwandan company specializing in ICT equipment supply, installation, and maintenance. We hold valid trading licenses, tax clearance certificates, and have successfully delivered over 50 government contracts to date.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">3. TECHNICAL SPECIFICATIONS</p>
                  <p className="text-xs text-gray-600 leading-relaxed mb-1">We propose to supply three (3) Interactive Smart Screens with the following minimum specifications:</p>
                  <ul className="text-xs text-gray-600 space-y-0.5 pl-4 list-disc">
                    <li>Screen Size: 75 inches (or as specified)</li>
                    <li>Resolution: 4K UHD (3840 × 2160)</li>
                    <li>Touch Points: 20-point multi-touch</li>
                    <li>Operating System: Android 11 or Windows 11</li>
                    <li>Connectivity: HDMI, USB-C, Wi-Fi 6, Bluetooth 5.0</li>
                    <li>Built-in speakers: 2 × 20W</li>
                    <li>Warranty: 3 years on-site</li>
                  </ul>
                </div>
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-bold text-gray-900">4. IMPLEMENTATION PLAN</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Delivery and installation will be completed within 14 working days of contract signing. Our team will handle site assessment, wall mounting, cable management, network integration, and full commissioning. A 2-day staff training session will be provided at no additional cost.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">5. FINANCIAL PROPOSAL</p>
                  <div className="border border-gray-200 text-xs text-gray-700 mt-1" style={{borderRadius:'4px'}}>
                    <div className="grid grid-cols-3 px-3 py-1.5 font-bold border-b border-gray-100"><span>Item</span><span className="text-center">Qty</span><span className="text-right">Unit Price (RWF)</span></div>
                    <div className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100"><span>Interactive Smart Screen 75&quot;</span><span className="text-center">3</span><span className="text-right">4,500,000</span></div>
                    <div className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100"><span>Installation &amp; Mounting</span><span className="text-center">3</span><span className="text-right">150,000</span></div>
                    <div className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100"><span>Staff Training (2 days)</span><span className="text-center">1</span><span className="text-right">0</span></div>
                    <div className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100 font-bold"><span className="col-span-2">Total (VAT inclusive)</span><span className="text-right">13,950,000</span></div>
                  </div>
                  <p className="text-xs font-bold text-gray-900 pt-3">6. COMPLIANCE &amp; CERTIFICATIONS</p>
                  <p className="text-xs text-gray-600 leading-relaxed">All supplied equipment complies with Rwanda Standards Board (RSB) requirements and international CE/FCC certifications. Copies of all relevant certificates, company registration documents, and tax clearance are attached as annexes to this proposal.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">7. AFTER-SALES SUPPORT</p>
                  <p className="text-xs text-gray-600 leading-relaxed">We provide a dedicated support hotline available Monday–Friday, 8am–6pm. On-site response time is guaranteed within 24 hours for critical issues. Preventive maintenance visits are scheduled quarterly throughout the warranty period.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">8. REFERENCES</p>
                  <ul className="text-xs text-gray-600 space-y-0.5 pl-4 list-disc">
                    <li>Rwanda Education Board (REB) — Supply of 20 Smart Screens, 2024</li>
                    <li>University of Rwanda — AV Equipment Supply &amp; Installation, 2023</li>
                    <li>Ministry of ICT — Interactive Display Systems, 2023</li>
                  </ul>
                  <p className="text-xs font-bold text-gray-900 pt-3">9. DELIVERY SCHEDULE</p>
                  <div className="border border-gray-200 text-xs text-gray-700 mt-1" style={{borderRadius:'4px'}}>
                    <div className="grid grid-cols-2 px-3 py-1.5 font-bold border-b border-gray-100"><span>Milestone</span><span className="text-right">Timeline</span></div>
                    <div className="grid grid-cols-2 px-3 py-1.5 border-t border-gray-100"><span>Contract Signing</span><span className="text-right">Day 0</span></div>
                    <div className="grid grid-cols-2 px-3 py-1.5 border-t border-gray-100"><span>Site Assessment</span><span className="text-right">Day 2</span></div>
                    <div className="grid grid-cols-2 px-3 py-1.5 border-t border-gray-100"><span>Equipment Delivery</span><span className="text-right">Day 10</span></div>
                    <div className="grid grid-cols-2 px-3 py-1.5 border-t border-gray-100"><span>Installation &amp; Commissioning</span><span className="text-right">Day 14</span></div>
                    <div className="grid grid-cols-2 px-3 py-1.5 border-t border-gray-100"><span>Staff Training</span><span className="text-right">Day 15–16</span></div>
                  </div>
                </div>
                {/* Page 3 */}
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-bold text-gray-900">10. WARRANTY &amp; MAINTENANCE TERMS</p>
                  <p className="text-xs text-gray-600 leading-relaxed">All three interactive smart screens come with a 3-year on-site warranty covering parts and labor. In the event of hardware failure, replacement units will be provided within 5 business days. Annual preventive maintenance is included at no extra charge for the duration of the warranty period.</p>
                  <p className="text-xs font-bold text-gray-900 pt-3">11. ANNEXES</p>
                  <ul className="text-xs text-gray-600 space-y-0.5 pl-4 list-disc">
                    <li>Annex A: Certificate of Incorporation</li>
                    <li>Annex B: Valid Trading License</li>
                    <li>Annex C: Tax Clearance Certificate</li>
                    <li>Annex D: Technical Datasheets of Proposed Screens</li>
                    <li>Annex E: Previous Contract Completion Certificates</li>
                    <li>Annex F: CVs of Key Technical Personnel</li>
                  </ul>
                  <p className="text-xs font-bold text-gray-900 pt-3">12. TERMS &amp; CONDITIONS</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Payment terms: 30% advance upon contract signing, 70% upon successful delivery and commissioning. All prices are inclusive of VAT and delivery to BRD Head Office, Kigali. This proposal is valid for 90 days from the submission date.</p>
                  <div className="mt-6 pt-5 border-t-2 border-gray-300">
                    <p className="text-xs font-bold text-gray-900 mb-4 text-center tracking-wide">DECLARATION &amp; AUTHORIZED SIGNATURE</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-5">I, the undersigned, hereby declare that the information provided in this proposal is accurate and complete, and that our organization is fully committed to delivering the goods and services as described herein.</p>
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div><div className="border-b border-gray-400" style={{height:'36px'}}></div><p className="text-xs text-gray-500 mt-1">Signature</p></div>
                        <div><div className="border-b border-gray-400" style={{height:'20px'}}></div><p className="text-xs text-gray-500 mt-1">Full Name</p></div>
                        <div><div className="border-b border-gray-400" style={{height:'20px'}}></div><p className="text-xs text-gray-500 mt-1">Title / Position</p></div>
                        <div><div className="border-b border-gray-400" style={{height:'20px'}}></div><p className="text-xs text-gray-500 mt-1">Date</p></div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-28 h-28 border-2 border-dashed border-gray-300 flex items-center justify-center" style={{borderRadius:'50%'}}>
                          <p className="text-xs text-gray-300 text-center leading-tight">Official<br/>Company<br/>Stamp</p>
                        </div>
                        <p className="text-xs text-gray-400">Company Seal</p>
                      </div>
                    </div>
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

      {/* Sample Tenders */}
      <section id="tenders" className="bg-white py-10 md:py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Live Tenders Preview</h2>
            <p className="text-gray-500 text-sm">Sign up to access all tenders and generate proposals.</p>
          </div>
          <Suspense fallback={<TendersSkeleton />}>
            <TendersGrid />
          </Suspense>
          <div className="text-center mt-8">
            <Link href="/register" className="inline-block px-6 py-3 text-white font-semibold hover:opacity-90 transition text-sm" style={{borderRadius:'4px', backgroundColor:'#3A86FF'}}>
              View All Tenders →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p suppressHydrationWarning>© {new Date().getFullYear()} PryroTender. All rights reserved.</p>
        <p className="mt-1">Contact: <a href="mailto:info@pryro.com" className="hover:text-gray-600">hello@pryro.com</a></p>
      </footer>
    </div>
  );
}
