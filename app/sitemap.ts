/**
 * Dynamic XML sitemap — Next.js App Router convention.
 *
 * Generates a merged sitemap containing:
 *   1. Static pages (home, /tenders, category landing pages).
 *   2. Individual tender pages from seen_tenders, in batches of 49,990.
 *      (Google's limit is 50,000 URLs per sitemap file.)
 *
 * Only includes:
 *   - Public, canonically accessible pages.
 *   - Tenders with a non-null slug.
 *
 * Excludes:
 *   - /login, /register, /dashboard, /admin, /settings, /api/*, /reset-password
 *   - Private or unpublished tenders (those without a slug).
 *
 * Caching: Next.js revalidates this route every 30 minutes on the server,
 * so a full DB scan does not happen on every crawler request.
 */

import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORY_SLUGS } from '@/lib/seo';

export const revalidate = 1800; // 30 minutes

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // ── 1. Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/tenders`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    ...Object.keys(CATEGORY_SLUGS).map((slug) => ({
      url: `${APP_URL}/tenders/category/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];

  // ── 2. Individual tender pages ───────────────────────────────────────────────
  const db = supabaseAdmin();

  // Fetch slugs + last_modified in pages of 1 000 to stay memory-efficient.
  // We use first_seen_at as the lastmod proxy; if the tender has been updated
  // the cron will refresh the row and bump updated_at (added in migration).
  const BATCH = 1000;
  const tenderEntries: MetadataRoute.Sitemap = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await db
      .from('seen_tenders')
      .select('slug, first_seen_at, updated_at')
      .not('slug', 'is', null)
      .order('first_seen_at', { ascending: false })
      .range(from, from + BATCH - 1);

    if (error) {
      console.error('[sitemap] DB error:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data as { slug: string; first_seen_at: string; updated_at: string | null }[]) {
      tenderEntries.push({
        url: `${APP_URL}/tenders/${row.slug}`,
        lastModified: row.updated_at ?? row.first_seen_at,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    if (data.length < BATCH) {
      keepFetching = false;
    } else {
      from += BATCH;
    }

    // Hard cap at 49,990 tender entries per sitemap file
    if (tenderEntries.length >= 49_990) break;
  }

  return [...staticPages, ...tenderEntries];
}
