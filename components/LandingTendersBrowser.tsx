'use client';

/**
 * LandingTendersBrowser
 * Client-side tender browser for the landing page.
 * Category clicks and search filter results in-place — no redirect to /tenders.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getTenderStatus, formatDeadline } from '@/lib/seo';
import SidebarPricing from '@/components/SidebarPricing';

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

// ─── Source config ────────────────────────────────────────────────────────────

const SOURCES: { key: string; label: string }[] = [
  { key: 'Job in Rwanda',  label: 'Job in Rwanda'  },
  { key: 'Umucyo (Gov)',   label: 'Umucyo (Gov)'   },
  { key: 'New Times Jobs', label: 'New Times Jobs' },
  { key: 'ImvahoNshya',   label: 'ImvahoNshya'    },
];

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'ict-software',    label: 'Software'      },
  { slug: 'construction',    label: 'Construction'  },
  { slug: 'consultancy',     label: 'Consultancy'   },
  { slug: 'goods-supply',    label: 'Goods'         },
  { slug: 'medical-health',  label: 'Medical'       },
  { slug: 'ngo-development', label: 'NGO'           },
  { slug: 'government',      label: 'Government'    },
  { slug: 'private-sector',  label: 'Private'       },
];

// ─── TenderCard ───────────────────────────────────────────────────────────────

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
        <span className="text-xs font-semibold text-blue-600">
          Generate proposal
        </span>
      </div>
    </div>
  );

  return <Link href="/dashboard" className="block">{card}</Link>;
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 flex flex-col gap-2.5 animate-pulse"
          style={{ boxShadow: '0 -4px 8px -2px rgba(0,0,0,0.06), 4px 0 8px -2px rgba(0,0,0,0.06), -4px 0 8px -2px rgba(0,0,0,0.06)' }}>
          <div className="h-4 w-16 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded mt-auto" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingTendersBrowser() {
  const [source, setSource] = useState('');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [rows, setRows] = useState<TenderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Close sources dropdown when clicking outside
  useEffect(() => {
    if (!sourcesOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sources-dropdown]')) setSourcesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sourcesOpen]);

  const PAGE_SIZE = 24;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchTenders = useCallback(async (cat: string, q: string, pg: number, src: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      if (src) params.set('source', src);
      if (pg > 1) params.set('page', String(pg));

      const res = await fetch(`/api/tenders/browse?${params.toString()}`, { signal: ctrl.signal });
      const data = await res.json();

      // Only update state if this request wasn't superseded
      if (!ctrl.signal.aborted && data.success) {
        setRows(data.rows);
        setTotal(data.total);
        setLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return; // superseded, ignore
      console.error(err);
      setLoading(false);
    }
  }, []);

  // Fetch whenever source, category, query, or page changes (also covers initial mount)
  useEffect(() => {
    fetchTenders(category, query, page, source);
  }, [source, category, query, page, fetchTenders]);

  const allSourcesSelected = source === '';

  function toggleSource(key: string) {
    setSource(prev => prev === key ? '' : key);
    setPage(1);
  }

  function selectAllSources() {
    setSource('');
    setPage(1);
  }

  function handleCategoryClick(slug: string) {
    const next = slug === category ? '' : slug; // toggle off if same
    setCategory(next);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(inputValue);
    setPage(1);
  }

  return (
    <div className="w-full px-5 md:px-8 lg:px-12 py-8 flex flex-col lg:flex-row gap-8">
      {/* ── Sidebar ── */}
      <aside className="lg:w-56 shrink-0 flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        {/* Search */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search</p>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. ICT, construction…"
              className="w-full px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-gray-100"
              style={{ borderRadius: 6 }}
            />
            <button
              type="submit"
              className="mt-2 w-full py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              style={{ borderRadius: 0 }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Source / Magazine dropdown — same pattern as dashboard sidebar */}
        <div className="relative" data-sources-dropdown>
          <button
            onClick={() => setSourcesOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="truncate">
              {allSourcesSelected ? 'All sources' : source}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`ml-1 shrink-0 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {sourcesOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {/* All option */}
              <button
                onClick={() => { selectAllSources(); setSourcesOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${allSourcesSelected ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${allSourcesSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {allSourcesSelected && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                All sources
              </button>
              <div className="border-t border-gray-100" />
              {SOURCES.map(src => {
                const isActive = source === src.key;
                return (
                  <button
                    key={src.key}
                    onClick={() => { toggleSource(src.key); setSourcesOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {isActive && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span className="truncate">{src.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category filter */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
          <nav className="space-y-1 border-l-2 border-gray-200 pl-3">
            <button
              onClick={() => handleCategoryClick('')}
              className={`block w-full text-left text-sm py-1 transition ${!category ? 'text-blue-600 font-semibold border-l-2 border-blue-600 -ml-[14px] pl-3' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All Tenders
            </button>
            {CATEGORIES.map(({ slug, label }) => (
              <button
                key={slug}
                onClick={() => handleCategoryClick(slug)}
                className={`block w-full text-left text-sm py-1 transition ${category === slug ? 'text-blue-600 font-semibold border-l-2 border-blue-600 -ml-[14px] pl-3' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {label}
              </button>
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
        {/* Active filters bar */}
        {(query || category || source) && (
          <p className="text-sm text-gray-500 mb-4">
            {total} result{total !== 1 ? 's' : ''}
            {query ? ` for "${query}"` : ''}
            {category ? ` in ${CATEGORIES.find(c => c.slug === category)?.label ?? category}` : ''}
            {source ? ` · ${source}` : ''}
            {' · '}
            <button
              onClick={() => { setSource(''); setCategory(''); setQuery(''); setInputValue(''); setPage(1); }}
              className="text-blue-600 hover:underline"
            >
              Clear
            </button>
          </p>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-semibold mb-2">No tenders found</p>
            <p className="text-sm">Try a different search term or browse all categories.</p>
            <button
              onClick={() => { setSource(''); setCategory(''); setQuery(''); setInputValue(''); setPage(1); }}
              className="mt-4 inline-block text-blue-600 text-sm hover:underline"
            >
              Clear filters →
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((row) => (
                <TenderCard key={row.id} row={row} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
                {page > 1 && (
                  <button
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition"
                  >
                    ← Previous
                  </button>
                )}
                <span className="text-sm text-gray-500 px-2">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition"
                  >
                    Next →
                  </button>
                )}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
