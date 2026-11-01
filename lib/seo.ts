/**
 * SEO utilities — slug generation, metadata helpers, structured data builders.
 *
 * Rules:
 * - Slugs are derived from the tender title + a short year suffix.
 * - The same title must always produce the same slug (deterministic), so
 *   existing indexed URLs are never broken by a re-scrape.
 * - Collisions (two different titles yielding the same base slug) are resolved
 *   by appending the first 6 chars of the tender's stable ID.
 */

import crypto from 'crypto';

// ─── Slug generation ─────────────────────────────────────────────────────────

/**
 * Convert a tender title + optional year into a clean, stable URL slug.
 *
 * Examples:
 *   "Tender Notice for Supply of 3 Interactive Smart Screens – BRD" → "brd-interactive-smart-screens-2026"
 *   "Procurement of Consultancy Services for ICT Strategy – RURA"   → "rura-ict-strategy-consultancy-2026"
 */
export function generateTenderSlug(title: string, year?: number | string): string {
  const y = year ?? new Date().getFullYear();

  // 1. Lower-case, remove punctuation, collapse whitespace
  let slug = title
    .toLowerCase()
    // remove common prefixes that add no keyword value
    .replace(/^(tender notice for|request for (proposals?|quotations?|bids?)|procurement of|supply of|provision of|consultancy services for|rfp[:\-–—]?|rfq[:\-–—]?)\s+/i, '')
    // strip parenthetical counts like "(3)" or "(no. 4)"
    .replace(/\([^)]{0,20}\)/g, ' ')
    // strip special chars except hyphens and spaces
    .replace(/[^a-z0-9\s-]/g, ' ')
    // collapse multiple spaces / hyphens
    .replace(/[\s-]+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');

  // 2. Trim to at most 60 chars, cutting at a word boundary
  if (slug.length > 60) {
    slug = slug.slice(0, 60).replace(/-[^-]*$/, '');
  }

  // 3. Append year
  slug = `${slug}-${y}`;

  return slug;
}

/**
 * Generate a collision-resistant slug by appending the tender's stable ID
 * suffix when two titles would otherwise produce the same base slug.
 */
export function generateUniqueSlug(title: string, stableId: string, year?: number | string): string {
  const base = generateTenderSlug(title, year);
  // use 6-char suffix from the stable ID for uniqueness
  return `${base}-${stableId.slice(0, 6)}`;
}

// ─── Deadline / status helpers ────────────────────────────────────────────────

export type TenderStatus = 'active' | 'closing_soon' | 'expired' | 'unknown';

/**
 * Parse a deadline string scraped from source sites.
 * Accepts formats: "dd-mm-yyyy", "yyyy-mm-dd", "dd/mm/yyyy", ISO strings,
 * "Month dd, yyyy", and returns a Date or null.
 */
export function parseDeadline(deadline: string): Date | null {
  if (!deadline || deadline === 'Not specified') return null;

  // dd-mm-yyyy  or  dd/mm/yyyy
  const dmy = deadline.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T23:59:59+02:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // yyyy-mm-dd
  const ymd = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const d = new Date(`${deadline}T23:59:59+02:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: native parse (handles ISO strings and "Month dd, yyyy")
  const fallback = new Date(deadline);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Determine whether a tender is active, closing soon, or expired.
 * "closing_soon" = deadline within the next 3 days.
 */
export function getTenderStatus(deadline: string): TenderStatus {
  const d = parseDeadline(deadline);
  if (!d) return 'unknown';

  const now = Date.now();
  const ms = d.getTime() - now;
  const days = ms / (1000 * 60 * 60 * 24);

  if (days < 0) return 'expired';
  if (days <= 3) return 'closing_soon';
  return 'active';
}

/**
 * Format a deadline for display, e.g. "29 October 2026 (EAT)".
 * Returns the raw string if unparseable.
 */
export function formatDeadline(deadline: string): string {
  const d = parseDeadline(deadline);
  if (!d) return deadline;
  return d.toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Kigali',
  }) + ' (EAT)';
}

// ─── Category normalisation ───────────────────────────────────────────────────

/**
 * Canonical category slugs used in landing pages and sitemap.
 * Maps display names → URL-safe slugs.
 */
export const CATEGORY_SLUGS: Record<string, string> = {
  'ict-software': 'ict-software',
  'construction': 'construction',
  'consultancy': 'consultancy',
  'goods-supply': 'goods-supply',
  'medical-health': 'medical-health',
  'ngo-development': 'ngo-development',
  'government': 'government',
  'private-sector': 'private-sector',
};

export const CATEGORY_LABELS: Record<string, string> = {
  'ict-software': 'Software',
  'construction': 'Construction',
  'consultancy': 'Consultancy',
  'goods-supply': 'Goods',
  'medical-health': 'Medical',
  'ngo-development': 'NGO',
  'government': 'Government',
  'private-sector': 'Private',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'ict-software':
    'ICT, software development, system integration, network infrastructure, and technology consultancy tenders in Rwanda. Includes opportunities from government ministries, state-owned enterprises, and private organisations.',
  'construction':
    'Civil engineering, building construction, road works, water and sanitation infrastructure tenders across Rwanda from public and private procuring entities.',
  'consultancy':
    'Management consultancy, research, auditing, legal, environmental impact assessment, and advisory service tenders in Rwanda.',
  'goods-supply':
    'Supply of goods, office equipment, vehicles, furniture, and general procurement tenders from Rwandan government bodies and private companies.',
  'medical-health':
    'Medical equipment supply, pharmaceutical procurement, health system consultancy, and hospital infrastructure tenders in Rwanda.',
  'ngo-development':
    'NGO, INGO, and development organisation tenders covering community development, capacity building, M&E, and humanitarian programmes in Rwanda.',
  'government':
    'All tenders published by the Government of Rwanda, its ministries, agencies, and state-owned enterprises — sourced from official procurement portals including Umucyo.',
  'private-sector':
    'Tenders from private companies, banks, telecoms, and non-state organisations in Rwanda seeking goods, services, and consultancy.',
};

/**
 * Map a raw category string from the scraper to the nearest canonical slug.
 * Returns null if no match is found.
 */
export function normaliseCategorySlug(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (/\b(ict|software|tech|it|digital|network|system|data|web|cyber)\b/.test(lower)) return 'ict-software';
  if (/\b(construct|civil|build|road|infra|water|sanitation|drainage)\b/.test(lower)) return 'construction';
  if (/\b(consult|advisory|research|audit|legal|assessment|feasibility|study)\b/.test(lower)) return 'consultancy';
  if (/\b(supply|goods|equipment|vehicle|furniture|office|material|stationary)\b/.test(lower)) return 'goods-supply';
  if (/\b(medical|health|pharma|hospital|clinic|drug|medicine|lab)\b/.test(lower)) return 'medical-health';
  if (/\b(ngo|development|humanitarian|capacity|community|donor|ingo|project)\b/.test(lower)) return 'ngo-development';
  if (/\b(government|ministry|district|sector|rdb|rra|minict|reb|mineduc|rema|rbc)\b/.test(lower)) return 'government';
  return null;
}

// ─── Structured data builders ─────────────────────────────────────────────────

export interface TenderJsonLdProps {
  title: string;
  description: string;
  organization: string;
  category: string;
  location: string;
  deadline: string;
  datePublished: string;
  sourceUrl: string;
  pageUrl: string;
}

/**
 * Build a schema.org Article JSON-LD object for a public tender page.
 * We use Article (not JobPosting) because procurement notices are not job listings.
 */
export function buildTenderJsonLd(props: TenderJsonLdProps): object {
  const {
    title, description, organization, category,
    location, deadline, datePublished, sourceUrl, pageUrl,
  } = props;

  const deadlineDate = parseDeadline(deadline);
  const publishedDate = parseDeadline(datePublished) ?? new Date(datePublished);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Organization',
      name: organization || 'PryroTender',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PryroTender',
      url: 'https://tender.pryro.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tender.pryro.com/logo.png',
      },
    },
    datePublished: publishedDate.toISOString(),
    dateModified: new Date().toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    about: {
      '@type': 'Thing',
      name: `${category} tender in ${location}`,
    },
    keywords: [category, location, organization, 'Rwanda tender', 'procurement'].filter(Boolean).join(', '),
    ...(deadlineDate ? { expires: deadlineDate.toISOString() } : {}),
    url: pageUrl,
    sameAs: sourceUrl,
  };
}

/**
 * Build a BreadcrumbList JSON-LD for a tender detail page.
 */
export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Build Organization + WebSite JSON-LD for the root layout.
 */
export function buildSiteJsonLd(appUrl: string): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'PryroTender',
      url: appUrl,
      logo: `${appUrl}/logo.png`,
      description:
        'PryroTender aggregates Rwanda government and private tenders and helps businesses generate winning proposals using AI.',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'hello@pryro.com',
        contactType: 'customer support',
      },
      sameAs: ['https://tender.pryro.com'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PryroTender',
      url: appUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${appUrl}/tenders?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

// ─── Meta description helper ──────────────────────────────────────────────────

/**
 * Generate a unique meta description for a tender page, capped at 160 chars.
 */
export function buildTenderMetaDescription(
  title: string,
  organization: string,
  deadline: string,
  category: string,
): string {
  const org = organization && organization !== 'Not specified' ? organization : 'Rwanda';
  const dl = formatDeadline(deadline);
  const cat = category && category !== 'Tender' ? ` ${category}` : '';
  const raw = `${org}${cat} tender: ${title}. Deadline: ${dl}. Use PryroTender's AI to generate a winning proposal.`;
  return raw.length <= 160 ? raw : raw.slice(0, 157) + '…';
}

// ─── IndexNow helper ──────────────────────────────────────────────────────────

export const INDEXNOW_ENGINES = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * Submit a batch of URLs to IndexNow engines with one retry on 5xx.
 * Never throws — errors are logged and returned.
 */
export async function submitIndexNow(
  urls: string[],
  appUrl: string,
  apiKey: string,
): Promise<{ engine: string; ok: boolean; status?: number; error?: string }[]> {
  if (!urls.length || !apiKey) return [];

  const host = new URL(appUrl).hostname;
  const payload: IndexNowPayload = {
    host,
    key: apiKey,
    keyLocation: `${appUrl}/${apiKey}.txt`,
    urlList: urls.slice(0, 10_000), // IndexNow limit per batch
  };

  const results: { engine: string; ok: boolean; status?: number; error?: string }[] = [];

  for (const engine of INDEXNOW_ENGINES) {
    let attempt = 0;
    while (attempt < 2) {
      attempt++;
      try {
        const res = await fetch(engine, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok || res.status === 202) {
          results.push({ engine, ok: true, status: res.status });
          break;
        }
        if (res.status >= 400 && res.status < 500) {
          // Client error — no point retrying
          results.push({ engine, ok: false, status: res.status });
          break;
        }
        // 5xx — retry once
        if (attempt >= 2) results.push({ engine, ok: false, status: res.status });
      } catch (err) {
        if (attempt >= 2) {
          results.push({ engine, ok: false, error: String(err) });
        }
      }
    }
  }

  return results;
}
