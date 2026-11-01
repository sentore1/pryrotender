'use client';

import Link from 'next/link';
import { useState } from 'react';

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

const PLANS = {
  monthly: {
    label: 'Monthly',
    rwf: '12,000 RWF',
    usd: '$10',
    period: '/mo',
    sub: 'Billed monthly',
    save: null,
    href: '/register?plan=monthly',
  },
  annual: {
    label: 'Annual',
    rwf: '100,000 RWF',
    usd: '$99',
    period: '/yr',
    sub: 'Billed once a year',
    save: 'Save ~17% vs monthly',
    href: '/register?plan=annual',
  },
} as const;

type Tab = keyof typeof PLANS;
type Currency = 'RWF' | 'USD';

export default function SidebarPricing() {
  const [tab, setTab] = useState<Tab>('monthly');
  const [currency, setCurrency] = useState<Currency>('RWF');
  const plan = PLANS[tab];
  const price = currency === 'RWF' ? plan.rwf : plan.usd;

  return (
    <div className="overflow-hidden shadow-md border border-gray-100" style={{ borderRadius: 4 }}>
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-4 pb-3">
        <p className="text-xs font-bold text-white text-center tracking-wide uppercase mb-3">
          Pricing
        </p>

        {/* Plan tabs */}
        <div className="flex bg-blue-700 p-0.5 gap-0.5" style={{ borderRadius: 4 }}>
          {(Object.keys(PLANS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
                tab === t
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-blue-200 hover:text-white'
              }`}
              style={{ borderRadius: 4 }}
            >
              {PLANS[t].label}
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
          {(['RWF', 'USD'] as Currency[]).map((c) => (
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
            <span className="text-xs text-gray-400 mb-0.5">{plan.period}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{plan.sub}</p>
          {plan.save && (
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 bg-green-600 text-white rounded-full">
              {plan.save}
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
          href={plan.href}
          className="block text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
          style={{ borderRadius: 4 }}
        >
          Get Started →
        </Link>
        <p className="text-center text-xs text-gray-400 mt-2">No credit card required</p>
      </div>
    </div>
  );
}
