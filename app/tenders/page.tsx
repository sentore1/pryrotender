/**
 * /tenders — Public tender listing page.
 *
 * - Server-rendered for SEO.
 * - Shows all tenders from seen_tenders DB with pagination.
 * - Supports ?q= text search and ?category= filter via URL params.
 * - Falls back to a live scrape when the DB is empty (early deployment).
 * - Internal links to individual /tenders/[slug] pages for crawler discovery.
 * - Internal links to category pages for category link juice.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TendersBrowser } from '@/components/TendersBrowser';
import { CATEGORY_LABELS } from '@/lib/seo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Rwanda Tenders 2026 – Government & Private Procurement | PryroTender',
  description:
    'Browse all current Rwanda government and private sector tenders. Filter by category — ICT, construction, consultancy, goods supply and more. Generate winning proposals with AI.',
  alternates: { canonical: `${APP_URL}/tenders` },
  openGraph: {
    title: 'Rwanda Tenders 2026 | PryroTender',
    description:
      'All current Rwanda government and private sector procurement tenders, updated daily. AI-powered proposal generation.',
    url: `${APP_URL}/tenders`,
    siteName: 'PryroTender',
    type: 'website',
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q ?? '';
  const category = sp.category ?? '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Tenders', item: `${APP_URL}/tenders` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen bg-white text-gray-900">
        {/* ── Nav ── */}
        <nav className="bg-white border-b border-gray-100 px-5 md:px-8 lg:px-12 py-4 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PryroTender" height={20} style={{ height: '20px', width: 'auto' }} />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-800 transition hidden sm:inline">Home</Link>
            <Link
              href="/register"
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* ── Browse UI (hero + sidebar + grid + pagination) ── */}
        <TendersBrowser page={page} query={query} category={category} basePath="/tenders" />

        {/* ── Footer ── */}
        <footer className="border-t border-gray-100 mt-8 py-8 text-center text-xs text-gray-400">
          <p suppressHydrationWarning>© {new Date().getFullYear()} PryroTender · Rwanda Tender Aggregator & AI Proposal Generator</p>
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
              <Link key={slug} href={`/tenders/category/${slug}`} className="hover:text-gray-600 transition">
                {label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
