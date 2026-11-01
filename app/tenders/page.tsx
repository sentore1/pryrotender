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
import { supabaseAdmin } from '@/lib/supabase';
import {
  getTenderStatus,
  formatDeadline,
  normaliseCategorySlug,
  CATEGORY_LABELS,
  CATEGORY_SLUGS,
} from '@/lib/seo';
import { scrapeTenders, Tender } from '@/lib/scraper';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';
const PAGE_SIZE = 24;

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenderRow {
  id: string;
  slug: string | null;
  title: string;
  organization: string | null;
  category: string | null;
  location: string | null;
  deadline: string | null;
  source: string | null;
  first_seen_at: string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStoredTenders(page: number, query: string, category: string): Promise<{ rows: TenderRow[]; total: number }> {
  const db = supabaseAdmin();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = db
    .from('seen_tenders')
    .select('id, slug, title, organization, category, location, deadline, source, first_seen_at', { count: 'exact' })
    .not('slug', 'is', null)
    .order('first_seen_at', { ascending: false })
    .range(from, to);

  if (query.trim()) {
    q = q.ilike('title', `%${query.trim()}%`);
  }
  if (category.trim()) {
    q = q.ilike('category', `%${category.trim()}%`);
  }

  const { data, count, error } = await q;
  if (error) console.error('[tenders page] DB error:', error.message);
  return { rows: (data ?? []) as TenderRow[], total: count ?? 0 };
}

/** Convert a live-scraped Tender into a TenderRow shape for display when DB is empty. */
function liveToRow(t: Tender): TenderRow {
  return {
    id: t.id,
    slug: null,
    title: t.title,
    organization: t.organization ?? null,
    category: t.category,
    location: t.location ?? null,
    deadline: t.deadline,
    source: t.source,
    first_seen_at: new Date().toISOString(),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TenderCard({ row }: { row: TenderRow }) {
  const status = getTenderStatus(row.deadline ?? '');
  const isExpired = status === 'expired';
  const isClosingSoon = status === 'closing_soon';
  const catSlug = row.category ? normaliseCategorySlug(row.category) : null;

  const card = (
    <div className={`bg-white border rounded-lg p-4 flex flex-col gap-2.5 hover:shadow-md transition ${isExpired ? 'border-gray-100 opacity-70' : 'border-gray-200 hover:border-blue-200'}`}>
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        {isExpired ? (
          <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded">CLOSED</span>
        ) : isClosingSoon ? (
          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded animate-pulse">CLOSING SOON</span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded">OPEN</span>
        )}
        {row.category && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{row.category}</span>
        )}
        {row.source && (
          <span className="text-xs text-gray-400 ml-auto">{row.source}</span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 leading-snug">{row.title}</p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
        {row.organization && row.organization !== 'Not specified' && (
          <span className="font-medium text-gray-600">{row.organization}</span>
        )}
        {row.location && <span>{row.location}</span>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-auto">
        <span className={`text-xs ${isExpired ? 'text-red-500' : isClosingSoon ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
          {isExpired ? 'Closed: ' : 'Deadline: '}{formatDeadline(row.deadline ?? 'Not specified')}
        </span>
        {row.slug ? (
          <span className="text-xs font-semibold text-blue-600">View details →</span>
        ) : (
          <span className="text-xs font-semibold text-blue-600">Generate proposal →</span>
        )}
      </div>
    </div>
  );

  if (row.slug) {
    return (
      <Link href={`/tenders/${row.slug}`} className="block">
        {card}
      </Link>
    );
  }

  // No slug yet (live scrape fallback) — link to register
  return (
    <Link href="/register" className="block">
      {card}
    </Link>
  );
}

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

  // 1. Try stored tenders from DB
  let rows: TenderRow[] = [];
  let total = 0;
  let usingLiveFallback = false;

  ({ rows, total } = await getStoredTenders(page, query, category));

  // 2. If DB has nothing yet, fall back to a live scrape (shows something on day 1)
  if (rows.length === 0 && page === 1 && !query && !category) {
    try {
      const live = await scrapeTenders('');
      rows = live.map(liveToRow);
      total = rows.length;
      usingLiveFallback = true;
    } catch { /* silently degrade */ }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build category filter links
  const categoryLinks = Object.entries(CATEGORY_SLUGS).map(([slug]) => ({
    slug,
    label: CATEGORY_LABELS[slug],
  }));

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
        <nav className="bg-white border-b border-gray-100 px-5 md:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
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

        {/* ── Hero ── */}
        <header className="bg-gray-50 border-b border-gray-100 py-10 px-5 md:px-8 text-center">
          <nav aria-label="Breadcrumb" className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mb-4">
            <Link href="/" className="hover:text-gray-600 transition">Home</Link>
            <span>/</span>
            <span className="text-gray-600">Tenders</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Rwanda Tenders
          </h1>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Current government and private sector procurement opportunities in Rwanda.
            Updated automatically from official sources.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {usingLiveFallback ? rows.length : total} tenders listed
          </p>
        </header>

        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar filters ── */}
          <aside className="lg:w-56 shrink-0 space-y-5">
            {/* Search */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search</p>
              <form method="GET">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="e.g. ICT, construction…"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
                />
                {category && <input type="hidden" name="category" value={category} />}
                <button type="submit" className="mt-2 w-full py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition">
                  Search
                </button>
              </form>
            </div>

            {/* Category filter */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
              <nav className="space-y-1">
                <Link
                  href="/tenders"
                  className={`block text-sm px-2 py-1.5 rounded transition ${!category ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  All Tenders
                </Link>
                {categoryLinks.map(({ slug, label }) => (
                  <Link
                    key={slug}
                    href={`/tenders/category/${slug}`}
                    className="block text-sm px-2 py-1.5 rounded text-gray-600 hover:bg-gray-50 transition"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* CTA */}
            <div className="bg-blue-600 rounded-xl p-4 text-white text-center space-y-2">
              <p className="text-sm font-bold">Win with AI</p>
              <p className="text-xs text-blue-100">Generate professional proposals for any tender in seconds.</p>
              <Link
                href="/register"
                className="block py-2 bg-white text-blue-700 text-xs font-semibold rounded hover:bg-blue-50 transition"
              >
                Start Free →
              </Link>
            </div>
          </aside>

          {/* ── Grid ── */}
          <main className="flex-1 min-w-0">
            {rows.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-semibold mb-2">No tenders found</p>
                <p className="text-sm">Try a different search term or browse all categories.</p>
                <Link href="/tenders" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
                  Clear filters →
                </Link>
              </div>
            ) : (
              <>
                {(query || category) && (
                  <p className="text-sm text-gray-500 mb-4">
                    {total} result{total !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}{category ? ` in ${category}` : ''}
                    {' · '}
                    <Link href="/tenders" className="text-blue-600 hover:underline">Clear</Link>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {rows.map((row) => (
                    <TenderCard key={row.id} row={row} />
                  ))}
                </div>

                {/* Pagination */}
                {!usingLiveFallback && totalPages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
                    {page > 1 && (
                      <Link
                        href={{ pathname: '/tenders', query: { ...(query ? { q: query } : {}), ...(category ? { category } : {}), page: page - 1 } }}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition"
                      >
                        ← Previous
                      </Link>
                    )}
                    <span className="text-sm text-gray-500 px-2">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link
                        href={{ pathname: '/tenders', query: { ...(query ? { q: query } : {}), ...(category ? { category } : {}), page: page + 1 } }}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition"
                      >
                        Next →
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </main>
        </div>

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
