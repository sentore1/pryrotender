import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/groq';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

    // Fetch profile to enrich AI context
    let enrichedCompanyInfo = companyInfo || {};
    try {
      const token = request.cookies.get('sb-access-token')?.value;
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('company_name,company_address,company_phone,company_website,company_ref_prefix,company_bio,required_documents,former_clients').eq('id', user.id).single();
          if (profile) {
            enrichedCompanyInfo = {
              name: profile.company_name,
              address: profile.company_address,
              phone: profile.company_phone,
              website: profile.company_website,
              refNumber: profile.company_ref_prefix ? `${profile.company_ref_prefix}-${new Date().getFullYear()}-001` : undefined,
              bio: profile.company_bio,
              requiredDocuments: profile.required_documents,
              formerClients: profile.former_clients,
              ...companyInfo,
            };
          }
        }
      }
    } catch { /* continue without profile enrichment */ }

    const proposal = await generateProposal(tenderDetails, requirements, enrichedCompanyInfo);

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate proposal' },
      { status: 500 }
    );
  }
}
