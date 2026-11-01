/**
 * GET /api/indexnow-key
 *
 * Serves the IndexNow key verification file at the path /{key}.txt
 * as required by the IndexNow specification.
 *
 * The actual key file must be placed at:
 *   public/{INDEXNOW_KEY}.txt
 * with content equal to just the key string (no newline needed).
 *
 * This route is a fallback that serves the key dynamically if the static file
 * hasn't been created yet.
 *
 * Search engines verify key ownership by fetching:
 *   https://your-domain.com/{key}.txt
 * The response must be plain text containing exactly the key value.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new NextResponse('IndexNow key not configured', { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
