/**
 * robots.ts — Next.js App Router robots.txt generator.
 *
 * Allows all crawlers on public pages.
 * Blocks crawlers from all protected, private, and utility routes.
 */

import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tenders', '/tenders/'],
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/admin',
          '/admin/',
          '/settings',
          '/settings/',
          '/login',
          '/register',
          '/reset-password',
          '/api/',
          '/_next/',
          '/12000',   // leftover file in the project root
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
