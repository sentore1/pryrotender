import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateProposal, extractMissingItems } from '@/lib/groq';

function supabaseWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name === 'sb-access-token' || cookie.name.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (parsed?.access_token) return parsed.access_token;
      } catch {
        if (cookie.value && cookie.value.length > 20) return cookie.value;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenderDetails, requirements, companyInfo, tenderName } = body;

    if (!tenderDetails || !requirements) {
      return NextResponse.json(
        { success: false, error: 'Missing tender details or requirements' },
        { status: 400 }
      );
    }

    // Try to get authenticated user — optional, used to enrich profile + save
    const token = extractToken(request);
    let userId: string | null = null;
    let enrichedCompanyInfo = companyInfo || {};

    if (token) {
      try {
        const client = supabaseWithToken(token);
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          userId = user.id;

          // If no companyInfo passed, pull from profile
          if (!companyInfo) {
            const { data: profile } = await client
              .from('profiles')
              .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients')
              .eq('id', user.id)
              .single();

            if (profile) {
              // Fetch pricing items to inject into the proposal
              const { data: priceItems } = await client
                .from('pricing_items')
                .select('name,description,unit,unit_price,currency,category,margin_pct')
                .eq('user_id', user.id);

              enrichedCompanyInfo = {
                name: profile.company_name,
                address: profile.company_address,
                phone: profile.company_phone,
                email: profile.company_email,
                website: profile.company_website,
                refNumber: profile.company_ref_prefix
                  ? `${profile.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
                  : undefined,
                bio: profile.company_bio,
                requiredDocuments: profile.required_documents,
                formerClients: profile.former_clients,
                pricingItems: priceItems || [],
              };
            }
          }
        }
      } catch { /* continue without auth enrichment */ }
    }

    const proposal = await generateProposal(tenderDetails, requirements, enrichedCompanyInfo);

    // Detect items in the tender that aren't in the user's pricing catalogue
    let missingItems: { name: string; description?: string; unit?: string; estimated_qty?: number }[] = [];
    if (userId && token) {
      try {
        const client = supabaseWithToken(token);
        const { data: existingItems } = await client
          .from('pricing_items')
          .select('name,category')
          .eq('user_id', userId);
        missingItems = await extractMissingItems(tenderDetails, existingItems || []);
      } catch (e) {
        console.error('Failed to extract missing items:', e);
      }
    }

    // Save to proposals table if we have a user
    if (userId && token) {
      try {
        const client = supabaseWithToken(token);
        const name = tenderName || tenderDetails.split('\n')[0].slice(0, 120) || 'Untitled Tender';
        await client.from('proposals').insert({
          user_id: userId,
          tender_name: name,
          content: proposal,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to save proposal:', e);
      }
    }

    return NextResponse.json({ success: true, proposal, missingItems });
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate proposal' },
      { status: 500 }
    );
  }
}
