/**
 * /tenders/category/[cat] — Category-specific tender landing page.
 *
 * - Unique content per category (genuine descriptions, not thin duplicates).
 * - Server-rendered, DB-backed tender listing.
 * - Static params generated from the finite set of canonical category slugs.
 * - Returns 404 for unrecognised category slugs.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getTenderStatus,
  formatDeadline,
  normaliseCategorySlug,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_SLUGS,
} from '@/lib/seo';
import { scrapeTenders } from '@/lib/scraper';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';
const PAGE_SIZE = 24;

// ─── Keyword map for DB queries ───────────────────────────────────────────────
// Maps a category slug to the keyword used in an ilike search against the
// 'category' column of seen_tenders.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ict-software':   ['ict', 'software', 'tech', 'it ', 'digital', 'network', 'system', 'data', 'web'],
  'construction':   ['construct', 'civil', 'build', 'road', 'infra', 'water', 'sanitation'],
  'consultancy':    ['consult', 'advisory', 'research', 'audit', 'legal', 'assessment', 'feasibility'],
  'goods-supply':   ['supply', 'goods', 'equipment', 'vehicle', 'furniture', 'office', 'material'],
  'medical-health': ['medical', 'health', 'pharma', 'hospital', 'clinic', 'drug', 'lab'],
  'ngo-development':['ngo', 'development', 'humanitarian', 'capacity', 'community', 'donor'],
  'government':     ['government', 'ministry', 'district', 'sector'],
  'private-sector': ['bank', 'telecom', 'company', 'ltd', 'plc', 'private'],
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

// ─── generateStaticParams ─────────────────────────────────────────────────────

export function generateStaticParams(): { cat: string }[] {
  return Object.keys(CATEGORY_SLUGS).map((slug) => ({ cat: slug }));
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const label = CATEGORY_LABELS[cat];
  if (!label) return { title: 'Not Found', robots: { index: false } };

  const description = CATEGORY_DESCRIPTIONS[cat];
  const canonicalUrl = `${APP_URL}/tenders/category/${cat}`;

  return {
    title: `${label} Tenders in Rwanda 2026 | PryroTender`,
    description: description.slice(0, 160),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${label} Tenders in Rwanda | PryroTender`,
      description: description.slice(0, 160),
      url: canonicalUrl,
      siteName: 'PryroTender',
      type: 'website',
    },
  };
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getTendersForCategory(
  catSlug: string,
  page: number,
): Promise<{ rows: TenderRow[]; total: number }> {
  const db = supabaseAdmin();
  const keywords = CATEGORY_KEYWORDS[catSlug] ?? [];
  if (!keywords.length) return { rows: [], total: 0 };

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Build an OR filter from all keywords
  const orFilter = keywords.map((k) => `category.ilike.%${k}%,title.ilike.%${k}%`).join(',');

  const { data, count, error } = await db
    .from('seen_tenders')
    .select('id, slug, title, organization, category, location, deadline, source, first_seen_at', { count: 'exact' })
    .not('slug', 'is', null)
    .or(orFilter)
    .order('first_seen_at', { ascending: false })
    .range(from, to);

  if (error) console.error('[category page] DB error:', error.message);
  return { rows: (data ?? []) as TenderRow[], total: count ?? 0 };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ cat: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { cat } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  const label = CATEGORY_LABELS[cat];
  if (!label) notFound();

  const description = CATEGORY_DESCRIPTIONS[cat];
  const canonicalUrl = `${APP_URL}/tenders/category/${cat}`;

  let { rows, total } = await getTendersForCategory(cat, page);

  // Day-1 live fallback: if DB is empty, show live-scraped tenders for this category
  if (rows.length === 0 && page === 1) {
    try {
      const keywords = CATEGORY_KEYWORDS[cat] ?? [];
      const keyword = keywords[0] ?? '';
      const live = await scrapeTenders(keyword);
      rows = live
        .filter((t) => {
          const catNorm = normaliseCategorySlug(t.category);
          return catNorm === cat || normaliseCategorySlug(`${t.title} ${t.description}`) === cat;
        })
        .map((t) => ({
          id: t.id,
          slug: null,
          title: t.title,
          organization: t.organization ?? null,
          category: t.category,
          location: t.location ?? null,
          deadline: t.deadline,
          source: t.source,
          first_seen_at: new Date().toISOString(),
        }));
      total = rows.length;
    } catch { /* silently degrade */ }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Tenders', item: `${APP_URL}/tenders` },
      { '@type': 'ListItem', position: 3, name: label, item: canonicalUrl },
    ],
  };

  const otherCategories = Object.entries(CATEGORY_LABELS).filter(([slug]) => slug !== cat);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen bg-white text-gray-900">
        {/* ── Nav ── */}
        <nav className="bg-white border-b border-gray-100 px-5 md:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PryroTender" height={20} style={{ height: '20px', width: 'auto' }} />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/tenders" className="text-gray-500 hover:text-gray-800 transition hidden sm:inline">All Tenders</Link>
            <Link href="/register" className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition">
              Get Started
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <header className="bg-gray-50 border-b border-gray-100 py-10 px-5 md:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
              <Link href="/" className="hover:text-gray-600 transition">Home</Link>
              <span>/</span>
              <Link href="/tenders" className="hover:text-gray-600 transition">Tenders</Link>
              <span>/</span>
              <span className="text-gray-600">{label}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {label} Tenders in Rwanda
            </h1>
            <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
              {description}
            </p>
            <p className="text-gray-400 text-xs mt-3">
              {total} tender{total !== 1 ? 's' : ''} listed
            </p>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar ── */}
          <aside className="lg:w-52 shrink-0 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">All Categories</p>
              <nav className="space-y-1">
                <Link href="/tenders" className="block text-sm px-2 py-1.5 rounded text-gray-600 hover:bg-gray-50 transition">
                  All Tenders
                </Link>
                <Link
                  href={`/tenders/category/${cat}`}
                  className="block text-sm px-2 py-1.5 rounded bg-blue-50 text-blue-700 font-semibold"
                >
                  {label}
                </Link>
                {otherCategories.map(([slug, lbl]) => (
                  <Link
                    key={slug}
                    href={`/tenders/category/${slug}`}
                    className="block text-sm px-2 py-1.5 rounded text-gray-600 hover:bg-gray-50 transition"
                  >
                    {lbl}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="bg-blue-600 rounded-xl p-4 text-white text-center space-y-2">
              <p className="text-sm font-bold">Win with AI</p>
              <p className="text-xs text-blue-100">Generate a winning proposal for any {label} tender.</p>
              <Link href="/register" className="block py-2 bg-white text-blue-700 text-xs font-semibold rounded hover:bg-blue-50 transition">
                Start Free →
              </Link>
            </div>
          </aside>

          {/* ── Tender grid ── */}
          <main className="flex-1 min-w-0">
            {rows.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-semibold mb-2">No {label} tenders at the moment</p>
                <p className="text-sm">New tenders are indexed every day. Check back soon or browse all categories.</p>
                <Link href="/tenders" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
                  View all tenders →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {rows.map((row) => {
                    const status = getTenderStatus(row.deadline ?? '');
                    const isExpired = status === 'expired';
                    const isClosingSoon = status === 'closing_soon';
                    const cardContent = (
                      <div key={row.id} className={`bg-white border rounded-lg p-4 flex flex-col gap-2.5 hover:shadow-md transition ${isExpired ? 'border-gray-100 opacity-70' : 'border-gray-200 hover:border-blue-200'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isExpired ? (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded">CLOSED</span>
                          ) : isClosingSoon ? (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded">CLOSING SOON</span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded">OPEN</span>
                          )}
                          {row.source && <span className="text-xs text-gray-400 ml-auto">{row.source}</span>}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{row.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {row.organization && row.organization !== 'Not specified' && (
                            <span className="font-medium text-gray-600">{row.organization}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-auto">
                          <span className={`text-xs ${isExpired ? 'text-red-500' : isClosingSoon ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                            {isExpired ? 'Closed: ' : 'Deadline: '}{formatDeadline(row.deadline ?? 'Not specified')}
                          </span>
                          <span className="text-xs font-semibold text-blue-600">
                            {row.slug ? 'View →' : 'Propose →'}
                          </span>
                        </div>
                      </div>
                    );

                    return row.slug ? (
                      <Link key={row.id} href={`/tenders/${row.slug}`} className="block">{cardContent}</Link>
                    ) : (
                      <Link key={row.id} href="/register" className="block">{cardContent}</Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
                    {page > 1 && (
                      <Link
                        href={{ pathname: `/tenders/category/${cat}`, query: { page: page - 1 } }}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition"
                      >
                        ← Previous
                      </Link>
                    )}
                    <span className="text-sm text-gray-500 px-2">Page {page} of {totalPages}</span>
                    {page < totalPages && (
                      <Link
                        href={{ pathname: `/tenders/category/${cat}`, query: { page: page + 1 } }}
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

        {/* ── Related categories ── */}
        <section className="bg-gray-50 border-t border-gray-100 py-8 px-5 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">Browse other tender categories</h2>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map(([slug, lbl]) => (
                <Link
                  key={slug}
                  href={`/tenders/category/${slug}`}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-300 hover:text-blue-700 transition"
                >
                  {lbl}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
          <p suppressHydrationWarning>© {new Date().getFullYear()} PryroTender · Rwanda Tender Aggregator & AI Proposal Generator</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link href="/tenders" className="hover:text-gray-600 transition">All Tenders</Link>
            <Link href="/register" className="hover:text-gray-600 transition">Register</Link>
            <a href="mailto:hello@pryro.com" className="hover:text-gray-600 transition">Contact</a>
          </div>
        </footer>
      </div>
    </>
  );
}
