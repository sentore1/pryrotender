/**
 * GET /api/tenders/browse
 * Query params: q, category, page (default 1)
 * Returns tenders from DB, falling back to live scrape when DB is empty.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scrapeTenders, Tender } from '@/lib/scraper';

const PAGE_SIZE = 24;

// Maps category slugs to keywords used to filter scraped results
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ict-software':    ['ict', 'software', 'it ', 'digital', 'network', 'system', 'computer', 'tech', 'laptop', 'tablet', 'server', 'data', 'cyber', 'cloud'],
  'construction':    ['construction', 'civil', 'build', 'road', 'bridge', 'infrastructure', 'contractor', 'works', 'renovation', 'architect'],
  'consultancy':     ['consult', 'advisory', 'audit', 'research', 'assessment', 'feasibility', 'study', 'evaluation', 'legal', 'expert'],
  'goods-supply':    ['supply', 'goods', 'equipment', 'furniture', 'vehicle', 'material', 'procurement', 'purchase', 'delivery'],
  'medical-health':  ['medical', 'health', 'hospital', 'pharmaceutical', 'drug', 'medicine', 'clinical', 'lab', 'ppe', 'sanitary'],
  'ngo-development': ['ngo', 'ingo', 'development', 'humanitarian', 'community', 'capacity', 'monitoring', 'evaluation', 'programme', 'project'],
  'government':      ['government', 'rwanda', 'ministry', 'district', 'sector', 'public', 'state', 'umucyo', 'reb', 'rura', 'rdb'],
  'private-sector':  ['private', 'company', 'ltd', 'limited', 'hotel', 'bank', 'telecom', 'industry'],
};

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

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const query = sp.get('q') ?? '';
    const category = sp.get('category') ?? '';
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));

    const db = supabaseAdmin();
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = db
      .from('seen_tenders')
      .select(
        'id, slug, title, organization, category, location, deadline, source, first_seen_at',
        { count: 'exact' },
      )
      .not('slug', 'is', null)
      .order('first_seen_at', { ascending: false })
      .range(from, to);

    if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
    if (category.trim()) q = q.ilike('category', `%${category.trim()}%`);

    const { data, count, error } = await q;

    if (error) {
      console.error('[browse API] DB error:', error.message);
    }

    let rows: TenderRow[] = (data ?? []) as TenderRow[];
    let total = count ?? 0;

    // Fallback to live scrape when DB is empty (day-1 deployment)
    if (rows.length === 0) {
      try {
        // Scrape everything, then filter + paginate client-side
        const live = await scrapeTenders('');
        let scraped = live.map(liveToRow);

        // Filter by category using keyword mapping
        if (category.trim()) {
          const keywords = CATEGORY_KEYWORDS[category.trim()] ?? [category.trim()];
          scraped = scraped.filter(r => {
            const haystack = `${r.title} ${r.category} ${r.organization ?? ''} ${r.location ?? ''}`.toLowerCase();
            return keywords.some(kw => haystack.includes(kw));
          });
        }

        // Apply text search
        if (query.trim()) {
          const q2 = query.trim().toLowerCase();
          scraped = scraped.filter(r => r.title.toLowerCase().includes(q2));
        }

        total = scraped.length;
        rows = scraped.slice(from, to + 1);
      } catch {
        /* degrade silently */
      }
    }

    return NextResponse.json({
      success: true,
      rows,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error('[browse API] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch tenders' }, { status: 500 });
  }
}
