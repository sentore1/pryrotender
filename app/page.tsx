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
      <nav className="bg-white px-5 md:px-8 py-4 flex items-center justify-between w-full">
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
              {/* Scroll container — fixed height, tall document inside scrolls */}
              <div className="overflow-y-auto bg-white" style={{height:'600px', fontFamily:'"Times New Roman", Times, serif'}}>

                {/* ── PAGE 1 — Cover & Submission Details ── */}
                <div style={{minHeight:'1000px', paddingBottom:'48px'}}>
                  <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                    <Image src="/logo.png" alt="PryroTender" width={100} height={34} style={{height:'auto'}} className="object-contain" />
                    <div className="text-right">
                      <p className="text-xs text-black">REF-2026-001</p>
                      <p className="text-xs text-black">28 October 2026</p>
                    </div>
                  </div>
                  <div className="px-6 py-6 space-y-4">
                    <p className="text-sm font-bold text-black text-center tracking-widest uppercase">Technical and Financial Proposal</p>
                    <p className="text-xs text-black text-center">Tender Notice for Supply of Three (3) Interactive Smart Screens — BRD Head Office</p>
                    <div className="space-y-1.5 text-xs text-black mt-2">
                      <p><span className="font-bold">Submitted By:</span> Tech Supplies Rwanda Ltd</p>
                      <p><span className="font-bold">Address:</span> KG 7 Ave, Kigali, Rwanda</p>
                      <p><span className="font-bold">Email:</span> info@techsupplies.rw</p>
                      <p><span className="font-bold">Tel:</span> +250 788 000 000</p>
                      <p><span className="font-bold">Website:</span> www.techsupplies.rw</p>
                      <p><span className="font-bold">Tax ID:</span> 102000012345</p>
                      <p><span className="font-bold">Proposal Reference:</span> REF-2026-001</p>
                      <p><span className="font-bold">Submission Date:</span> 28 October 2026</p>
                      <p><span className="font-bold">Validity Period:</span> 90 days from submission date</p>
                      <p><span className="font-bold">Prepared By:</span> Jean-Pierre Ndayisaba, Proposals Manager</p>
                    </div>
                    <p className="text-xs text-black leading-relaxed pt-2">
                      This proposal has been prepared exclusively in response to the Rwanda Development Bank (BRD) tender notice dated 10 October 2026 and contains proprietary and confidential information. Any unauthorised disclosure or reproduction is strictly prohibited under the laws of Rwanda.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      Tech Supplies Rwanda Ltd confirms full compliance with all tender requirements as specified in the tender document issued by BRD. We commit to the delivery timeline, warranty obligations, and after-sales support described herein.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      Our organisation has thoroughly reviewed the tender requirements and is fully capable of supplying, installing, and commissioning the three (3) Interactive Smart Screens at BRD Head Office, KN 4 Ave, Kigali, within the timeframe specified. We confirm that all proposed equipment is brand new, unused, and sourced directly from the original manufacturer&apos;s authorised distributor.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      We further confirm that Tech Supplies Rwanda Ltd is not under any sanction, debarment, or litigation that would prevent us from fulfilling this contract. All company documents, including our trading licence, tax clearance certificate, and RDB registration, are current and valid.
                    </p>
                    <div style={{marginTop:'60px', paddingTop:'16px'}}>
                      <p className="text-xs font-bold text-black">Authorised Signatory</p>
                      <div style={{marginTop:'40px', borderBottom:'1px solid #000', width:'200px'}} />
                      <p className="text-xs text-black mt-1">Director / CEO — Tech Supplies Rwanda Ltd</p>
                      <div style={{marginTop:'32px', borderBottom:'1px solid #000', width:'200px'}} />
                      <p className="text-xs text-black mt-1">Company Stamp</p>
                      <div style={{marginTop:'32px', borderBottom:'1px solid #000', width:'200px'}} />
                      <p className="text-xs text-black mt-1">Date</p>
                    </div>
                  </div>
                </div>

                {/* ── PAGE 2 — Executive Summary & Company Profile ── */}
                <div style={{minHeight:'1000px', paddingBottom:'48px'}}>
                  <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                    <p className="text-[10px] text-black">REF-2026-001 · BRD Smart Screens Proposal</p>
                    <p className="text-[10px] text-black">Page 2 of 5</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-xs font-bold text-black uppercase tracking-wide">1. Executive Summary</p>
                    <p className="text-xs text-black leading-relaxed">
                      Tech Supplies Rwanda Ltd is pleased to submit this Technical and Financial Proposal in response to the Rwanda Development Bank (BRD) tender for the supply of three (3) Interactive Smart Screens to BRD Head Office, Kigali. With over eight years of proven experience delivering ICT equipment and enterprise solutions to government institutions, NGOs, and private sector organisations across Rwanda, we are uniquely positioned to meet BRD&apos;s requirements.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      Our proposed solution fully meets all stated technical specifications. We place particular emphasis on product quality, long-term reliability, and comprehensive after-sales support. Our three-year on-site warranty and dedicated local support team ensure BRD&apos;s investment is protected throughout the product lifecycle.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      We are committed to completing delivery and installation within 18 working days of contract signing, with minimal disruption to BRD&apos;s operations. Our project manager will be on-site throughout the installation phase and will provide weekly progress reports to BRD&apos;s designated contact person.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      Our financial proposal represents the best value for money available in the Rwandan market. We have negotiated preferential pricing with our manufacturer partner to ensure a competitive total cost while maintaining the highest quality standards. Post-warranty maintenance packages are also available at competitive rates.
                    </p>
                    <p className="text-xs font-bold text-black uppercase tracking-wide pt-2">2. Company Profile</p>
                    <p className="text-xs text-black leading-relaxed">
                      Incorporated in 2016 under RDB registration No. 100012345, Tech Supplies Rwanda Ltd specialises in the supply, installation, and maintenance of interactive display solutions, networking infrastructure, and enterprise ICT hardware. Our team of 24 certified engineers has executed over 47 contracts with institutions including RDB, RURA, RBC, Equity Bank Rwanda, and numerous private firms.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      We hold an ISO 9001:2015 quality management certification and are a registered supplier on the Rwanda Public Procurement Authority (RPPA) portal. All products supplied carry manufacturer warranties and are sourced from authorised distributors. Our head office is located at KG 7 Ave, Kimihurura, Kigali, with a fully-equipped service centre and spare parts warehouse on the same premises.
                    </p>
                    <p className="text-xs text-black leading-relaxed">
                      Our technical team includes five (5) engineers holding Samsung Interactive Display certifications, four (4) Microsoft-certified professionals, and three (3) Cisco-certified network engineers. This breadth of expertise allows us to handle all aspects of the installation, configuration, and ongoing support in-house without subcontracting.
                    </p>
                    {/* Company stats table — expanded */}
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px', marginTop:'8px'}}>
                      <thead>
                        <tr>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Attribute</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Details</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Attribute</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Year Established','2016','Registered Staff','24 Engineers'],
                          ['RDB Registration','No. 100012345','RPPA Portal Status','Active Supplier'],
                          ['Contracts Completed','47 (2016–2026)','Ongoing Contracts','6 Active'],
                          ['ISO Certification','ISO 9001:2015','Tax Clearance','Valid to Dec 2026'],
                          ['Service Centre','KG 7 Ave, Kigali','Spare Parts Stock','On-site warehouse'],
                          ['Manufacturer Partner','Samsung / ViewSonic','Authorised Reseller','Since 2018'],
                          ['Annual Turnover','RWF 2.4 Billion','Bank','Equity Bank Rwanda'],
                          ['Insurance Cover','RWF 500M liability','Legal Status','No pending cases'],
                        ].map(([k1,v1,k2,v2]) => (
                          <tr key={k1}>
                            <td style={{border:'1px solid #000', padding:'6px 10px', fontWeight:'600'}}>{k1}</td>
                            <td style={{border:'1px solid #000', padding:'6px 10px'}}>{v1}</td>
                            <td style={{border:'1px solid #000', padding:'6px 10px', fontWeight:'600'}}>{k2}</td>
                            <td style={{border:'1px solid #000', padding:'6px 10px'}}>{v2}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── PAGE 3 — Technical Specifications ── */}
                <div style={{minHeight:'1000px', paddingBottom:'48px'}}>
                  <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                    <p className="text-[10px] text-black">REF-2026-001 · BRD Smart Screens Proposal</p>
                    <p className="text-[10px] text-black">Page 3 of 5</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-xs font-bold text-black uppercase tracking-wide">3. Technical Specifications</p>
                    <p className="text-xs text-black leading-relaxed">The following table details the full technical specifications of the proposed Interactive Smart Screens. All specifications meet or exceed the minimum requirements stated in the BRD tender document. Where the tender specified a minimum, our proposed value is shown alongside the minimum for direct comparison.</p>
                    <p className="text-xs text-black leading-relaxed">The proposed model is the ViewSonic IFP7552-1A 75-inch Interactive Flat Panel Display, manufactured in 2026 and supplied with a full manufacturer warranty backed by ViewSonic&apos;s East Africa regional service centre located in Nairobi, Kenya, with a local service partner in Kigali.</p>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px'}}>
                      <thead>
                        <tr>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left', width:'35%'}}>Specification</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left', width:'35%'}}>Proposed Value</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Tender Minimum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Display Size','75 inches (diagonal)','≥ 70 inches'],
                          ['Resolution','4K UHD (3840 × 2160)','≥ Full HD (1920×1080)'],
                          ['Panel Type','IPS LED, anti-glare','IPS or equivalent'],
                          ['Brightness','400 cd/m²','≥ 350 cd/m²'],
                          ['Contrast Ratio','1200:1','≥ 1000:1'],
                          ['Touch Technology','Infrared, 20-point multi-touch','≥ 10-point touch'],
                          ['Response Time','≤ 8 ms','≤ 10 ms'],
                          ['Operating System','Android 13 (upgradable)','Android 11 or higher'],
                          ['Processor','Octa-core 2.0 GHz','≥ Quad-core 1.6 GHz'],
                          ['RAM','4 GB LPDDR4X','≥ 4 GB'],
                          ['Storage','64 GB eMMC','≥ 32 GB'],
                          ['HDMI Ports','3 × HDMI 2.0 (in) + 1 (out)','≥ 2 × HDMI'],
                          ['USB Ports','4 × USB-A 3.0 + 1 × USB-C','≥ 2 × USB'],
                          ['Network','RJ45 Gigabit + Wi-Fi 6 + BT 5.0','Wired LAN required'],
                          ['Audio Output','2 × 20W built-in speakers','≥ 2 × 15W'],
                          ['Viewing Angle','178° (H) / 178° (V)','≥ 170°'],
                          ['Power Consumption','≤ 320W operating / ≤ 0.5W standby','≤ 350W'],
                          ['Mounting','VESA 600 × 400 mm + mobile stand (optional)','VESA compatible'],
                          ['Certifications','CE, FCC, RoHS, Energy Star','CE or equivalent'],
                          ['Warranty','3 years on-site — full parts & labour','≥ 1 year'],
                        ].map(([spec, proposed, min]) => (
                          <tr key={spec}>
                            <td style={{border:'1px solid #000', padding:'5px 10px', fontWeight:'600'}}>{spec}</td>
                            <td style={{border:'1px solid #000', padding:'5px 10px'}}>{proposed}</td>
                            <td style={{border:'1px solid #000', padding:'5px 10px'}}>{min}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs font-bold text-black pt-3">Installation &amp; Commissioning Scope</p>
                    <ul className="text-xs text-black space-y-1.5 pl-4 list-disc leading-relaxed">
                      <li>Site survey and wall-load assessment prior to installation date</li>
                      <li>Wall mounting using heavy-duty VESA bracket rated to 80kg (included in price)</li>
                      <li>Full cable management with conduit and in-wall routing where structurally feasible</li>
                      <li>Network (LAN/Wi-Fi) integration, static IP assignment, and connectivity testing</li>
                      <li>Android OS configuration, firmware update, and app installation per BRD requirements</li>
                      <li>Integration with BRD&apos;s existing Microsoft Teams Rooms environment</li>
                      <li>Staff training — one full-day session, up to 15 participants, with training manual</li>
                      <li>Handover report, serial numbers register, and acceptance testing sign-off documentation</li>
                    </ul>
                  </div>
                </div>

                {/* ── PAGE 4 — Financial Proposal ── */}
                <div style={{minHeight:'1000px', paddingBottom:'48px'}}>
                  <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                    <p className="text-[10px] text-black">REF-2026-001 · BRD Smart Screens Proposal</p>
                    <p className="text-[10px] text-black">Page 4 of 5</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-xs font-bold text-black uppercase tracking-wide">4. Financial Proposal</p>
                    <p className="text-xs text-black leading-relaxed">All amounts are stated in Rwandan Francs (RWF). Prices are inclusive of delivery to BRD Head Office, Kigali, and all applicable taxes. The table below provides a full itemised breakdown of all costs associated with this proposal.</p>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px'}}>
                      <thead>
                        <tr>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>No.</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>Item Description</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>Brand / Model</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'center'}}>Qty</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'right'}}>Unit (RWF)</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'right'}}>Total (RWF)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['1','Interactive Smart Screen 75" — 4K UHD, Android 13, 20-touch','ViewSonic IFP7552-1A','3','4,500,000','13,500,000'],
                          ['2','Heavy-duty VESA Wall Mounting Bracket (600×400, 80kg rated)','Chief LCM1U','3','120,000','360,000'],
                          ['3','HDMI 2.0 Active Cable 10m (screen to source)','Belkin AV10175','6','18,000','108,000'],
                          ['4','USB-C to HDMI Adapter (laptop connectivity)','Anker A83480A1','3','12,000','36,000'],
                          ['5','Installation, Cable Conduit & In-wall Routing','Tech Supplies RW','3','150,000','450,000'],
                          ['6','Network Integration, IP Config & Wi-Fi Testing','Tech Supplies RW','3','50,000','150,000'],
                          ['7','Android OS Config, Firmware Update & App Setup','Tech Supplies RW','3','40,000','120,000'],
                          ['8','MS Teams Rooms Integration & Testing','Tech Supplies RW','1','150,000','150,000'],
                          ['9','Staff Training — 1 full day, up to 15 participants','Tech Supplies RW','1','200,000','200,000'],
                          ['10','Training Manual (printed, A4, spiral-bound)','Tech Supplies RW','15','5,000','75,000'],
                          ['11','Site Survey & Pre-installation Assessment','Tech Supplies RW','1','50,000','50,000'],
                          ['12','Handover Documentation & Serial Number Register','Tech Supplies RW','1','30,000','30,000'],
                          ['13','3-Year On-site Warranty — parts & labour (Year 1)','ViewSonic / TSR','3','Included','Included'],
                          ['14','3-Year On-site Warranty — parts & labour (Year 2–3)','ViewSonic / TSR','3','Included','Included'],
                          ['15','Project Management & Site Supervision (18 days)','Tech Supplies RW','1','180,000','180,000'],
                        ].map(([no,desc,brand,qty,unit,total]) => (
                          <tr key={no}>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{no}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{desc}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{brand}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px', textAlign:'center'}}>{qty}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px', textAlign:'right'}}>{unit}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px', textAlign:'right'}}>{total}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={5} style={{border:'1px solid #000', padding:'6px 8px', textAlign:'right'}}>Sub-total (excl. VAT 18%)</td>
                          <td style={{border:'1px solid #000', padding:'6px 8px', textAlign:'right'}}>15,409,000</td>
                        </tr>
                        <tr>
                          <td colSpan={5} style={{border:'1px solid #000', padding:'6px 8px', textAlign:'right'}}>VAT (18%)</td>
                          <td style={{border:'1px solid #000', padding:'6px 8px', textAlign:'right'}}>2,773,620</td>
                        </tr>
                        <tr>
                          <td colSpan={5} style={{border:'1px solid #000', padding:'7px 8px', textAlign:'right', fontWeight:'bold'}}>GRAND TOTAL (VAT inclusive)</td>
                          <td style={{border:'1px solid #000', padding:'7px 8px', textAlign:'right', fontWeight:'bold'}}>18,182,620</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs font-bold text-black pt-3">Payment Terms</p>
                    <ul className="text-xs text-black space-y-1 pl-4 list-disc">
                      <li>50% advance payment upon signing of contract — RWF 9,091,310</li>
                      <li>50% balance upon delivery, installation, and written acceptance by BRD — RWF 9,091,310</li>
                      <li>Payment via bank transfer — Equity Bank Rwanda, Acc. No. 4000XXXXXXX</li>
                      <li>Invoice currency: Rwandan Francs (RWF); foreign currency invoices not accepted</li>
                      <li>Withholding tax (5%) deducted at source by BRD per Rwanda tax regulations</li>
                    </ul>
                    <p className="text-xs font-bold text-black pt-3">Price Validity</p>
                    <p className="text-xs text-black leading-relaxed">Prices quoted in this proposal are firm and valid for 90 days from the submission date of 28 October 2026. Any extension beyond this period is subject to mutual written agreement. Prices may be subject to adjustment only in the event of significant foreign exchange fluctuation exceeding 10% as published by the National Bank of Rwanda.</p>
                  </div>
                </div>

                {/* ── PAGE 5 — Delivery Schedule, References & Declaration ── */}
                <div style={{minHeight:'1000px', paddingBottom:'60px'}}>
                  <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                    <p className="text-[10px] text-black">REF-2026-001 · BRD Smart Screens Proposal</p>
                    <p className="text-[10px] text-black">Page 5 of 5</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-xs font-bold text-black uppercase tracking-wide">5. Delivery &amp; Implementation Schedule</p>
                    <p className="text-xs text-black leading-relaxed">The table below outlines the detailed project milestones. All dates are calculated from Day 0 (contract signing date). Tech Supplies Rwanda Ltd commits to this schedule and will notify BRD in writing within 24 hours if any milestone is at risk of delay.</p>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px'}}>
                      <thead>
                        <tr>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>No.</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Milestone</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'center'}}>Timeline</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Responsible</th>
                          <th style={{border:'1px solid #000', padding:'7px 10px', textAlign:'left'}}>Deliverable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['1','Contract Signing & Advance Payment','Day 0','Both Parties','Signed contract + payment receipt'],
                          ['2','Site Survey & Wall Assessment','Day 1–2','Tech Supplies RW','Survey report'],
                          ['3','Equipment Order Placement','Day 1','Tech Supplies RW','Purchase order copy'],
                          ['4','Import Clearance & Customs','Days 3–10','Tech Supplies RW','Customs clearance certificate'],
                          ['5','Equipment Delivery to BRD','Day 12','Tech Supplies RW','Delivery note + packing list'],
                          ['6','Inspection & Acceptance of Goods','Day 12','BRD + Tech Supplies','Goods receipt note'],
                          ['7','Wall Mounting & Cable Routing','Days 13–14','Tech Supplies RW','Installation report'],
                          ['8','Network Integration & IP Config','Day 14–15','Tech Supplies RW','Network config sheet'],
                          ['9','OS Config, Firmware & App Setup','Day 15','Tech Supplies RW','Software checklist'],
                          ['10','MS Teams Rooms Integration','Day 16','Tech Supplies RW','Integration test report'],
                          ['11','Full System Testing & QA','Day 16–17','Tech Supplies RW','QA test report'],
                          ['12','Staff Training Session','Day 17','Tech Supplies RW','Attendance register'],
                          ['13','Acceptance Testing by BRD','Day 18','BRD','Signed acceptance certificate'],
                          ['14','Handover of Warranty Documents','Day 18','Tech Supplies RW','Warranty cards + manuals'],
                          ['15','Final Balance Payment','Day 18–21','BRD','Payment confirmation'],
                        ].map(([no,m,t,r,d]) => (
                          <tr key={no}>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{no}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{m}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px', textAlign:'center'}}>{t}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{r}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{d}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <p className="text-xs font-bold text-black pt-3">6. Past Experience &amp; References</p>
                    <p className="text-xs text-black leading-relaxed">The following table lists our most relevant recent contracts. Full reference letters and contract completion certificates are available upon request.</p>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px'}}>
                      <thead>
                        <tr>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>Client</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>Scope of Work</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>Value (RWF)</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'center'}}>Year</th>
                          <th style={{border:'1px solid #000', padding:'7px 8px', textAlign:'left'}}>Contact Person</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Rwanda Development Board (RDB)','Supply & installation of 10 × 75" interactive displays — Boardrooms 1–4','48,500,000','2024','Pierre Habimana — ICT Director, info@rdb.rw'],
                          ['Rwanda Utilities Reg. Authority (RURA)','ICT equipment supply — 6 smart screens, networking & full installation','29,200,000','2023','Marie Uwase — Procurement, info@rura.rw'],
                          ['Equity Bank Rwanda Ltd','Conference room AV upgrade — 4 screens, MS Teams integration','21,800,000','2025','Jean Kayiranga — IT Manager, kigali@equitybank.rw'],
                          ['Ministry of ICT & Innovation','Supply of display & video conferencing systems — 3 meeting rooms','35,600,000','2024','Alice Mukabaramba — Procurement, minict.rw'],
                          ['Kigali Heights Office Park','Lobby & co-working space digital display installation — 8 units','42,100,000','2025','Patrick Nkurunziza — Facilities Manager'],
                          ['Bank of Kigali HQ','Executive boardroom AV & smart display upgrade — 2 rooms','18,750,000','2023','Eric Nshimiyimana — IT, bk@bk.rw'],
                          ['Rwanda Social Security Board (RSSB)','Smart display & projector supply for training centre — 12 units','56,400,000','2024','Claudine Ingabire — Procurement, info@rssb.rw'],
                          ['University of Rwanda (UR)','Interactive smart screens for 10 lecture theatres — Huye Campus','61,000,000','2022','Dr. Samuel Rutayisire — ICT, ur.ac.rw'],
                          ['Irembo Ltd','Boardroom & customer centre display systems — 5 locations','27,300,000','2025','Diane Mutoni — IT Lead, info@irembo.rw'],
                        ].map(([org,desc,val,yr,ct]) => (
                          <tr key={org}>
                            <td style={{border:'1px solid #000', padding:'5px 8px', fontWeight:'600'}}>{org}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{desc}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{val}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px', textAlign:'center'}}>{yr}</td>
                            <td style={{border:'1px solid #000', padding:'5px 8px'}}>{ct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{marginTop:'32px', paddingTop:'16px'}}>
                      <p className="text-xs font-bold text-black">7. Declaration</p>
                      <p className="text-xs text-black leading-relaxed mt-2">We, the undersigned, hereby declare that all information provided in this proposal is accurate, complete, and truthful to the best of our knowledge. We confirm that Tech Supplies Rwanda Ltd is legally authorised to submit this bid, that we have no conflict of interest with BRD or any of its officers, that we have not colluded with any other bidder, and that we will honour all commitments stated herein if awarded this contract. We acknowledge that any misrepresentation may result in disqualification and legal consequences under the laws of Rwanda.</p>
                      <div className="flex justify-between" style={{marginTop:'48px'}}>
                        <div>
                          <div style={{borderBottom:'1px solid #000', width:'180px', marginBottom:'4px'}} />
                          <p className="text-[10px] text-black">Authorised Signature</p>
                          <div style={{borderBottom:'1px solid #000', width:'180px', marginBottom:'4px', marginTop:'28px'}} />
                          <p className="text-[10px] text-black">Name &amp; Title</p>
                          <div style={{borderBottom:'1px solid #000', width:'180px', marginBottom:'4px', marginTop:'28px'}} />
                          <p className="text-[10px] text-black">Date</p>
                        </div>
                        <div>
                          <div style={{borderBottom:'1px solid #000', width:'160px', marginBottom:'4px'}} />
                          <p className="text-[10px] text-black">Company Stamp</p>
                          <div style={{borderBottom:'1px solid #000', width:'160px', marginBottom:'4px', marginTop:'28px'}} />
                          <p className="text-[10px] text-black">Witness Signature</p>
                          <div style={{borderBottom:'1px solid #000', width:'160px', marginBottom:'4px', marginTop:'28px'}} />
                          <p className="text-[10px] text-black">Witness Name</p>
                        </div>
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

      {/* Live Tenders — client-side filterable, no redirect */}
      <section id="tenders" className="bg-white">
        <LandingTendersBrowser />
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10 px-5 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-8">
          {/* Left — pryro */}
          <div className="flex flex-col gap-3">
            <span className="font-black text-gray-200 leading-none tracking-tight select-none"
              style={{ fontSize: 'clamp(6rem, 22vw, 18rem)' }}>
              pryro
            </span>
          </div>
          {/* Right — links + copyright */}
          <div className="flex flex-col gap-2 text-xs text-gray-400 sm:text-right justify-end self-start sm:self-end mb-0 sm:mb-8">
            <Link href="/tenders" className="hover:text-gray-600 transition">All Tenders</Link>
            <Link href="/tenders/category/government" className="hover:text-gray-600 transition">Government Tenders</Link>
            <Link href="/tenders/category/ict-software" className="hover:text-gray-600 transition">ICT Tenders</Link>
            <Link href="/register" className="hover:text-gray-600 transition">Register</Link>
            <a href="mailto:hello@pryro.com" className="hover:text-gray-600 transition">Contact</a>
            <a href="https://pryro.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition">Terms of Service</a>
            <a href="https://pryro.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition">Privacy Policy</a>
            <p className="text-xs text-gray-400 mt-2" suppressHydrationWarning>© {new Date().getFullYear()} PryroTender. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
