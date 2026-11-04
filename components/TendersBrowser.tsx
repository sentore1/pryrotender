/**
 * TendersBrowser — shared server component rendering the public tenders
 * browse UI: hero header, sidebar (search + category filters + CTA),
 * the tender cards grid, and pagination.
 *
 * Used by both the landing page (page = 1, no filters, links resolve to /tenders)
 * and the dedicated /tenders page (driven by searchParams).
 */

import Link from 'next/link';
import SidebarPricing from '@/components/SidebarPricing';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getTenderStatus,
  formatDeadline,
  CATEGORY_LABELS,
  CATEGORY_SLUGS,
} from '@/lib/seo';
import { scrapeTenders, searchTenders, Tender } from '@/lib/scraper';

const PAGE_SIZE = 24;

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

async function getStoredTenders(
  page: number,
  query: string,
  category: string,
): Promise<{ rows: TenderRow[]; total: number }> {
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
    // Search across title, description, and organization so users can find
    // tenders by any of those fields, not just the title.
    // Commas are stripped because PostgREST's "or" syntax uses commas as
    // condition separators.
    const term = query.trim().replace(/,/g, ' ');
    q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,organization.ilike.%${term}%`);
  }
  if (category.trim()) {
    q = q.ilike('category', `%${category.trim()}%`);
  }

  const { data, count, error } = await q;
  if (error) console.error('[TendersBrowser] DB error:', error.message);
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

  const card = (
    <div
      className={`bg-white rounded-lg p-4 flex flex-col gap-2.5 transition ${isExpired ? 'opacity-70' : ''}`}
      style={{ boxShadow: '0 -4px 8px -2px rgba(0,0,0,0.08), 4px 0 8px -2px rgba(0,0,0,0.08), -4px 0 8px -2px rgba(0,0,0,0.08)' }}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        {isExpired ? (
          <span className="text-xs font-semibold px-2 py-0.5 bg-red-600 text-white rounded">CLOSED</span>
        ) : isClosingSoon ? (
          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500 text-white rounded animate-pulse">CLOSING SOON</span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 bg-green-600 text-white rounded">OPEN</span>
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
        <span className={`text-xs flex flex-col ${isExpired ? 'text-red-500' : isClosingSoon ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
          <span>{isExpired ? 'Closed:' : 'Deadline:'}</span>
          <span>{formatDeadline(row.deadline ?? 'Not specified')}</span>
        </span>
        <span className="text-xs font-semibold text-blue-600">Generate proposal</span>
      </div>
    </div>
  );

  return (
    <Link href="/dashboard" className="block">
      {card}
    </Link>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export interface TendersBrowserProps {
  page: number;
  query: string;
  category: string;
  /** Base path used for search/filter/pagination links. Defaults to '/tenders'. */
  basePath?: string;
  /** Render the "Rwanda Tenders" hero header. Defaults to true. */
  showHeader?: boolean;
}

export async function TendersBrowser({
  page,
  query,
  category,
  basePath = '/tenders',
  showHeader = true,
}: TendersBrowserProps) {
  // 1. Try stored tenders from DB
  let rows: TenderRow[] = [];
  let total = 0;
  let usingLiveFallback = false;

  ({ rows, total } = await getStoredTenders(page, query, category));

  // 2. If DB has nothing, fall back to a live scrape.
  //    This covers two cases:
  //      a) Day-1 deployment with an empty DB (no query, no category)
  //      b) A search that doesn't match anything in the DB yet — the tender
  //         may exist on Umucyo but hasn't been ingested by the cron job.
  //    In case (b) we use searchTenders() which calls Umucyo's built-in search
  //    API (?tendNm=<keyword>) so we can find tenders that are too old to
  //    appear in the default 4-page scrape.
  if (rows.length === 0 && page === 1) {
    try {
      let live: Tender[];

      if (query.trim()) {
        // Use the search API to find tenders matching the query across ALL
        // of Umucyo (not just the latest pages), plus filtered results from
        // other sources.
        live = await searchTenders(query);
      } else {
        // No query — just scrape the latest tenders from all sources
        live = await scrapeTenders('');
      }

      let liveRows = live.map(liveToRow);

      // Filter by category if specified (applies to both paths)
      if (category.trim()) {
        const cat = category.trim().toLowerCase();
        liveRows = liveRows.filter(r => (r.category ?? '').toLowerCase().includes(cat));
      }

      rows = liveRows;
      total = rows.length;
      usingLiveFallback = true;
    } catch {
      /* silently degrade */
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build category filter links
  const categoryLinks = Object.entries(CATEGORY_SLUGS).map(([slug]) => ({
    slug,
    label: CATEGORY_LABELS[slug],
  }));

  return (
    <>
      {showHeader && (
        <header className="bg-white border-b border-gray-100 py-10 px-5 md:px-8 lg:px-12 text-center">
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
      )}

      <div className="w-full px-5 md:px-8 lg:px-12 py-8 flex flex-col lg:flex-row gap-8">
        {/* ── Sidebar filters ── */}
        <aside className="lg:w-56 shrink-0 space-y-5">
          {/* Search */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search</p>
            <form method="GET" action={basePath}>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="e.g. ICT, construction…"
                className="w-full border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 bg-gray-100"
                style={{ borderRadius: 6 }}
              />
              {category && <input type="hidden" name="category" value={category} />}
              <button type="submit" className="mt-2 w-full py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition" style={{ borderRadius: 0 }}>
                Search
              </button>
            </form>
          </div>

          {/* Category filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
            <nav className="space-y-1 border-l-2 border-gray-200 pl-3">
              <Link
                href={basePath}
                className={`block text-sm py-1 transition ${!category ? 'text-blue-600 font-semibold border-l-2 border-blue-600 -ml-[14px] pl-3' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All Tenders
              </Link>
              {categoryLinks.map(({ slug, label }) => (
                <Link
                  key={slug}
                  href={`${basePath}/category/${slug}`}
                  className="block text-sm py-1 text-gray-600 hover:text-gray-900 transition"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* CTA */}
          <div className="bg-blue-600 p-4 text-white text-center space-y-2" style={{ borderRadius: 6 }}>
            <p className="text-sm font-bold">Win with AI</p>
            <p className="text-xs text-blue-100">Generate professional proposals for any tender in seconds.</p>
            <Link
              href="/register"
              className="block py-2 bg-white text-blue-700 text-xs font-semibold hover:bg-blue-50 transition"
              style={{ borderRadius: 6 }}
            >
              Start Free →
            </Link>
          </div>

          {/* Pricing widget */}
          <SidebarPricing />
        </aside>

        {/* ── Grid ── */}
        <main className="flex-1 min-w-0">
          {rows.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-semibold mb-2">No tenders found</p>
              <p className="text-sm">Try a different search term or browse all categories.</p>
              <Link href={basePath} className="mt-4 inline-block text-blue-600 text-sm hover:underline">
                Clear filters →
              </Link>
            </div>
          ) : (
            <>
              {(query || category) && (
                <p className="text-sm text-gray-500 mb-4">
                  {total} result{total !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}{category ? ` in ${category}` : ''}
                  {' · '}
                  <Link href={basePath} className="text-blue-600 hover:underline">Clear</Link>
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
                      href={{ pathname: basePath, query: { ...(query ? { q: query } : {}), ...(category ? { category } : {}), page: page - 1 } }}
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
                      href={{ pathname: basePath, query: { ...(query ? { q: query } : {}), ...(category ? { category } : {}), page: page + 1 } }}
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
    </>
  );
}

// ─── Skeleton (Suspense fallback) ──────────────────────────────────────────────

export function TendersBrowserSkeleton() {
  return (
    <>
      <div className="bg-white border-b border-gray-100 py-10 px-5 md:px-8 text-center">
        <div className="h-7 w-44 bg-gray-100 rounded mx-auto mb-3 animate-pulse" />
        <div className="h-3 w-72 bg-gray-100 rounded mx-auto animate-pulse" />
      </div>
      <div className="w-full px-5 md:px-8 lg:px-12 py-8 flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0 space-y-5">
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        </aside>
        <main className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col gap-2.5 animate-pulse">
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-2/3 bg-gray-100 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded mt-auto" />
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
