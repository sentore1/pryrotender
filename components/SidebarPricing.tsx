'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PRICES } from '@/lib/pricing';

const FEATURES = [
  'All tenders access',
  'AI proposal generation',
  'Analyse tender (PDF/DOC)',
  'Form Filler AI',
  'Custom proposal generator',
  'Proposal refinement via chat',
  'DOCX export',
  'Company branding',
  'Saved proposals history',
  'Email notifications',
];

type Tab = 'monthly' | 'annual';
type Currency = 'RWF' | 'USDT';

export default function SidebarPricing() {
  const [tab, setTab] = useState<Tab>('monthly');
  const [currency, setCurrency] = useState<Currency>('RWF');
  const prices = PRICES[currency];
  const price = tab === 'monthly' ? prices.monthly : prices.annual;
  const period = tab === 'monthly' ? prices.monthlySub : prices.annualSub;
  const save = tab === 'annual' ? prices.save : null;

  return (
    <div className="overflow-hidden shadow-md border border-gray-100" style={{ borderRadius: 4 }}>
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-4 pb-3">
        <p className="text-xs font-bold text-white text-center tracking-wide uppercase mb-3">
          Pricing
        </p>

        {/* Plan tabs */}
        <div className="flex bg-blue-700 p-0.5 gap-0.5" style={{ borderRadius: 4 }}>
          {(['monthly', 'annual'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-semibold transition-all capitalize ${
                tab === t
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-blue-200 hover:text-white'
              }`}
              style={{ borderRadius: 4 }}
            >
              {t}
              {t === 'annual' && (
                <span className="ml-1 text-[10px] font-bold text-green-400">-17%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price block */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        {/* Currency toggle */}
        <div className="flex bg-gray-100 p-0.5 gap-0.5 mb-3 w-fit mx-auto" style={{ borderRadius: 4 }}>
          {(['RWF', 'USDT'] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1 text-xs font-semibold transition-all ${
                currency === c
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ borderRadius: 4 }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="text-center">
          <div className="flex items-end justify-center gap-1">
            <span className="text-2xl font-bold text-gray-900 leading-none">{price}</span>
            <span className="text-xs text-gray-400 mb-0.5">{period}</span>
          </div>
          {save && (
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 bg-green-600 text-white rounded-full">
              {save}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <ul className="space-y-1.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="mt-px text-green-600 font-bold shrink-0">✓</span>
              {f}
            </li>
          ))}
          {tab === 'annual' && (
            <li className="flex items-start gap-2 text-xs font-semibold text-gray-800">
              <span className="mt-px text-green-600 font-bold shrink-0">✓</span>
              Priority support
            </li>
          )}
        </ul>
      </div>

      {/* CTA */}
      <div className="bg-white px-4 py-3">
        <Link
          href={`/register?plan=${tab}&currency=${currency}`}
          className="block text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          style={{ borderRadius: 4 }}
        >
          Get Started →
        </Link>
        <p className="text-center text-xs text-gray-400 mt-2">Cancel anytime. No hidden fees.</p>
      </div>
    </div>
  );
}
