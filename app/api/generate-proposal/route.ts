import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenderDetails, requirements, companyInfo } = body;

    if (!tenderDetails || !requirements) {
      return NextResponse.json(
        { success: false, error: 'Missing tender details or requirements' },
        { status: 400 }
      );
    }

    const proposal = await generateProposal(tenderDetails, requirements, companyInfo);

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate proposal' },
      { status: 500 }
    );
  }
}
