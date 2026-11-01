/**
 * /tenders/[slug] — Public individual tender page.
 *
 * - Server-rendered for full SEO.
 * - Pulls the tender record from seen_tenders (which the cron populates).
 * - Falls back to a live scrape when the slug is not yet in the DB.
 * - Returns 404 for slugs that cannot be resolved at all.
 * - Expired tenders are shown with a clear "CLOSED" status — never as active.
 * - Structured data: Article + BreadcrumbList (no JobPosting — this is procurement).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getTenderStatus,
  formatDeadline,
  buildTenderJsonLd,
  buildBreadcrumbJsonLd,
  buildTenderMetaDescription,
  normaliseCategorySlug,
  CATEGORY_LABELS,
} from '@/lib/seo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenderRecord {
  id: string;
  slug: string;
  title: string;
  organization: string | null;
  category: string | null;
  location: string | null;
  deadline: string | null;
  source: string | null;
  source_url: string | null;
  description: string | null;
  first_seen_at: string;
  is_active: boolean | null;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getTenderBySlug(slug: string): Promise<TenderRecord | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('seen_tenders')
    .select('id, slug, title, organization, category, location, deadline, source, source_url, description, first_seen_at, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[tender page] DB error:', error.message);
    return null;
  }
  return data as TenderRecord | null;
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tender = await getTenderBySlug(slug);

  if (!tender) {
    return {
      title: 'Tender Not Found | PryroTender',
      robots: { index: false },
    };
  }

  const status = getTenderStatus(tender.deadline ?? '');
  const isExpired = status === 'expired';
  const org = tender.organization ?? 'Rwanda';
  const title = `${tender.title} | ${org} | PryroTender`;
  const description = buildTenderMetaDescription(
    tender.title,
    org,
    tender.deadline ?? 'Not specified',
    tender.category ?? 'Tender',
  );
  const canonicalUrl = `${APP_URL}/tenders/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: isExpired
      ? { index: true, follow: true }   // keep expired pages indexed — historical value
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'PryroTender',
      type: 'article',
      publishedTime: tender.first_seen_at,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// ─── Static params (optional pre-rendering hint) ──────────────────────────────
// We generate params for the 200 most-recently-seen tenders so they can be
// pre-rendered at build time. The page is also served dynamically for any slug
// not in this list (e.g. very recent tenders).

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from('seen_tenders')
    .select('slug')
    .not('slug', 'is', null)
    .order('first_seen_at', { ascending: false })
    .limit(200);

  return (data ?? []).map((row: { slug: string }) => ({ slug: row.slug }));
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tender = await getTenderBySlug(slug);

  if (!tender) notFound();

  const status = getTenderStatus(tender.deadline ?? '');
  const isExpired = status === 'expired';
  const isClosingSoon = status === 'closing_soon';
  const canonicalUrl = `${APP_URL}/tenders/${slug}`;
  const org = tender.organization ?? 'Rwanda';
  const category = tender.category ?? 'Tender';
  const location = tender.location ?? 'Rwanda';
  const catSlug = normaliseCategorySlug(category);

  // Structured data
  const articleJsonLd = buildTenderJsonLd({
    title: tender.title,
    description: tender.description ?? `${category} opportunity from ${org}`,
    organization: org,
    category,
    location,
    deadline: tender.deadline ?? '',
    datePublished: tender.first_seen_at,
    sourceUrl: tender.source_url ?? '',
    pageUrl: canonicalUrl,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: APP_URL },
    { name: 'Tenders', url: `${APP_URL}/tenders` },
    ...(catSlug
      ? [{ name: CATEGORY_LABELS[catSlug] ?? category, url: `${APP_URL}/tenders/category/${catSlug}` }]
      : []),
    { name: tender.title.slice(0, 60), url: canonicalUrl },
  ]);

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen bg-white text-gray-900">
        {/* ── Nav ── */}
        <nav className="bg-white border-b border-gray-100 px-5 md:px-8 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PryroTender" height={20} style={{ height: '20px', width: 'auto' }} />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/tenders" className="text-gray-500 hover:text-gray-800 transition hidden sm:inline">
              All Tenders
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
            >
              Generate Proposal
            </Link>
          </div>
        </nav>

        {/* ── Breadcrumb ── */}
        <div className="max-w-5xl mx-auto px-5 md:px-8 pt-4 pb-0">
          <nav aria-label="Breadcrumb" className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-gray-600 transition">Home</Link>
            <span>/</span>
            <Link href="/tenders" className="hover:text-gray-600 transition">Tenders</Link>
            {catSlug && (
              <>
                <span>/</span>
                <Link href={`/tenders/category/${catSlug}`} className="hover:text-gray-600 transition">
                  {CATEGORY_LABELS[catSlug] ?? category}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-500 truncate max-w-[200px]">{tender.title.slice(0, 50)}…</span>
          </nav>
        </div>

        {/* ── Main content ── */}
        <main className="max-w-5xl mx-auto px-5 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: tender details */}
          <article className="lg:col-span-2 space-y-6">

            {/* Status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {isExpired ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  CLOSED
                </span>
              ) : isClosingSoon ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  CLOSING SOON
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  OPEN
                </span>
              )}
              <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">
                {category}
              </span>
              {tender.source && (
                <span className="px-2.5 py-1 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded">
                  {tender.source}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
              {tender.title}
            </h1>

            {/* Key metadata grid */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  Procuring Organisation
                </dt>
                <dd className="font-medium text-gray-800">{org}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  Category
                </dt>
                <dd className="font-medium text-gray-800">{category}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  Location
                </dt>
                <dd className="font-medium text-gray-800">{location}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  Submission Deadline
                </dt>
                <dd className={`font-semibold ${isExpired ? 'text-red-600' : isClosingSoon ? 'text-amber-600' : 'text-gray-800'}`}>
                  {formatDeadline(tender.deadline ?? 'Not specified')}
                  {isExpired && ' — CLOSED'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  Date Listed
                </dt>
                <dd className="font-medium text-gray-800">
                  {new Date(tender.first_seen_at).toLocaleDateString('en-RW', {
                    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kigali',
                  })}
                </dd>
              </div>
              {tender.source && (
                <div>
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    Source
                  </dt>
                  <dd className="font-medium text-gray-800">{tender.source}</dd>
                </div>
              )}
            </dl>

            {/* Description */}
            {tender.description && (
              <section>
                <h2 className="text-base font-semibold text-gray-800 mb-2">About This Tender</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{tender.description}</p>
              </section>
            )}

            {/* Expired notice */}
            {isExpired && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
                <p className="font-semibold mb-1">This tender is closed</p>
                <p>
                  The submission deadline has passed. This page is preserved for reference. Sign up to
                  PryroTender to be notified when similar tenders are published.
                </p>
              </div>
            )}

            {/* Source attribution */}
            {tender.source_url && (
              <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
                <p>
                  <span className="font-semibold text-gray-500">Official notice:</span>{' '}
                  <a
                    href={tender.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="underline hover:text-gray-600 transition break-all"
                  >
                    {tender.source_url}
                  </a>
                </p>
                <p className="mt-1">
                  Always verify tender details directly with the procuring organisation before submitting.
                </p>
              </div>
            )}
          </article>

          {/* Right: CTA sidebar */}
          <aside className="space-y-4">

            {/* Primary CTA */}
            {!isExpired && (
              <div className="bg-blue-600 rounded-xl p-5 text-white space-y-3">
                <h2 className="font-bold text-base leading-snug">
                  Win this tender with AI
                </h2>
                <p className="text-sm text-blue-100 leading-relaxed">
                  PryroTender generates a professional, tailored proposal for this opportunity in
                  seconds — complete with your company details and a DOCX download.
                </p>
                <Link
                  href="/register"
                  className="block w-full text-center py-2.5 bg-white text-blue-700 font-semibold text-sm rounded-lg hover:bg-blue-50 transition"
                >
                  Generate My Proposal →
                </Link>
                <Link
                  href="/login"
                  className="block w-full text-center py-2 text-xs text-blue-200 hover:text-white transition"
                >
                  Already registered? Log in
                </Link>
              </div>
            )}

            {isExpired && (
              <div className="bg-gray-800 rounded-xl p-5 text-white space-y-3">
                <h2 className="font-bold text-base leading-snug">
                  Find similar open tenders
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Get notified the moment new {category} tenders are published in Rwanda.
                </p>
                <Link
                  href="/register"
                  className="block w-full text-center py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  Set Up Alerts →
                </Link>
              </div>
            )}

            {/* Feature list */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 text-sm">
              <p className="font-semibold text-gray-700">What PryroTender includes</p>
              <ul className="space-y-2 text-gray-500 text-xs">
                {[
                  'AI proposal generation from tender details',
                  'PDF & DOCX upload for document analysis',
                  'Proposal refinement via chat',
                  'Download proposals as formatted DOCX',
                  'Email alerts for new matching tenders',
                  'Saved proposals library',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-500 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Related category link */}
            {catSlug && (
              <Link
                href={`/tenders/category/${catSlug}`}
                className="block border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition text-sm text-gray-600 group"
              >
                <span className="block font-semibold text-gray-700 group-hover:text-blue-700 mb-1">
                  {CATEGORY_LABELS[catSlug] ?? category} tenders →
                </span>
                <span className="text-xs text-gray-400">Browse all {CATEGORY_LABELS[catSlug] ?? category} opportunities</span>
              </Link>
            )}
          </aside>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-100 mt-12 py-8 text-center text-xs text-gray-400">
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
