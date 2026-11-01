/**
 * POST /api/indexnow
 *
 * Internal endpoint called by the cron job after new tenders are stored.
 * Submits a batch of URLs to IndexNow-compatible engines (Bing, IndexNow API).
 *
 * Security:
 *   - Requires the same CRON_SECRET header as other cron routes.
 *   - The INDEXNOW_KEY is read only from env — never echoed in responses.
 *
 * Body: { urls: string[] }
 *
 * GET /api/indexnow
 *   Health-check: confirms the key file URL is correct. No sensitive data returned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitIndexNow } from '@/lib/seo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

function isAuthorised(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.NODE_ENV !== 'production') return true; // skip auth in dev
  return secret === process.env.CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const apiKey = process.env.INDEXNOW_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'INDEXNOW_KEY not configured' }, { status: 500 });
  }

  let body: { urls?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json({ error: 'urls must be a non-empty array' }, { status: 400 });
  }

  // Validate that URLs belong to our own host
  const safeUrls: string[] = (body.urls as unknown[])
    .filter((u): u is string => typeof u === 'string')
    .filter((u) => {
      try {
        return new URL(u).hostname === new URL(APP_URL).hostname;
      } catch {
        return false;
      }
    })
    .slice(0, 10_000);

  if (!safeUrls.length) {
    return NextResponse.json({ error: 'No valid URLs for this host' }, { status: 400 });
  }

  const results = await submitIndexNow(safeUrls, APP_URL, apiKey);
  const allOk = results.every((r) => r.ok);

  return NextResponse.json({
    submitted: safeUrls.length,
    results,
    success: allOk,
  }, { status: allOk ? 200 : 207 });
}

export async function GET() {
  const apiKey = process.env.INDEXNOW_KEY;
  return NextResponse.json({
    keyFileUrl: apiKey ? `${APP_URL}/${apiKey}.txt` : null,
    configured: !!apiKey,
  });
}
