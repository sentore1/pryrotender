import { NextRequest, NextResponse } from 'next/server';
import { scrapeTenders } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || '';
    
    const tenders = await scrapeTenders(category);
    
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
