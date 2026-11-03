'use client';
import React from 'react';
import Link from 'next/link';
import { PRICES } from '@/lib/pricing';

const FEATURES_MONTHLY = [
  'All tenders access',
  'AI proposal generation',
  'Analyse tender (PDF/DOC upload)',
  'Form Filler AI',
  'Custom proposal generator',
  'Proposal refinement via chat',
  'DOCX export',
  'Company branding (logo & stamp)',
  'Saved proposals history',
  'Email notifications',
];

const FEATURES_ANNUAL = [...FEATURES_MONTHLY, 'Priority support'];


export default function PricingSection() {
  const [currency, setCurrency] = React.useState<'RWF' | 'USDT'>('RWF');
  const prices = PRICES[currency];

  return (
    <section id="pricing" className="bg-white py-10 md:py-16">
      <div className="w-full px-5 md:px-8 lg:px-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Our Pricing</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Cancel anytime. No hidden fees.</p>
        <div className="flex items-center justify-center mb-10">
          <div className="flex bg-gray-100 p-1 gap-1" style={{borderRadius:'4px'}}>
            <button onClick={() => setCurrency('RWF')} className={`px-4 py-1.5 text-sm font-semibold transition ${currency === 'RWF' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} style={{borderRadius:'4px'}}>RWF</button>
            <button onClick={() => setCurrency('USDT')} className={`px-4 py-1.5 text-sm font-semibold transition ${currency === 'USDT' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} style={{borderRadius:'4px'}}>USDT</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-white p-6 shadow-lg hover:shadow-xl transition" style={{borderRadius:'4px'}}>
            <div className="text-sm font-semibold text-gray-500 mb-1">Monthly</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{prices.monthly} <span className="text-base font-normal text-gray-400">/mo</span></div>
            <p className="text-xs text-gray-400 mb-5">Billed monthly</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              {FEATURES_MONTHLY.map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-gray-900">✓</span>{f}</li>
              ))}
            </ul>
            <Link href={`/register?plan=monthly&currency=${currency}`} className="block text-center py-2.5 font-semibold hover:opacity-90 transition text-sm text-white" style={{borderRadius:'4px', backgroundColor:'#3A86FF'}}>Get Started</Link>
          </div>
          <div className="bg-white p-6 relative shadow-xl" style={{borderRadius:'4px'}}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full" style={{backgroundColor:'#22C55E'}}>Best Value</span>
            <div className="text-sm font-semibold text-gray-900 mb-1">Annual</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{prices.annual} <span className="text-base font-normal text-gray-400">/yr</span></div>
            <p className="text-xs text-gray-400 mb-5">{prices.save}</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              {FEATURES_ANNUAL.map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-gray-900">✓</span>{f}</li>
              ))}
            </ul>
            <Link href={`/register?plan=annual&currency=${currency}`} className="block text-center py-2.5 font-semibold hover:opacity-90 transition text-sm text-white" style={{borderRadius:'4px', backgroundColor:'#3A86FF'}}>Get Started</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
