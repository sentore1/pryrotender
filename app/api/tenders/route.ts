import { NextRequest, NextResponse } from 'next/server';
import { scrapeTenders, searchTenders } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || '';

    // When a search term is provided, use searchTenders() which calls
    // Umucyo's built-in search API (?tendNm=<keyword>) to find tenders
    // across ALL pages — not just the latest 4 pages that scrapeTenders
    // grabs. This ensures older tenders (like one published a week ago
    // that has been pushed off page 4) are still findable.
    const tenders = category.trim()
      ? await searchTenders(category)
      : await scrapeTenders('');

    return NextResponse.json({
      success: true,
      tenders,
      count: tenders.length
    });
  } catch (error) {
    console.error('Error in tenders API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenders' },
      { status: 500 }
    );
  }
}
