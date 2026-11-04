import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateProposal, extractMissingItems } from '@/lib/groq';

// Helper: build a per-request Supabase client that forwards the user's auth token
function supabaseWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

// Extract the bearer token from either the Authorization header or Supabase cookie variants
function extractToken(request: NextRequest): string | null {
  // 1. Standard Authorization header (most reliable)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  // 2. Supabase v2 cookie: sb-<project>-auth-token or sb-access-token
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name === 'sb-access-token' || cookie.name.endsWith('-auth-token')) {
      try {
        // v2 stores JSON: { access_token, refresh_token, ... }
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (parsed?.access_token) return parsed.access_token;
      } catch {
        // plain token string (v1 style)
        if (cookie.value && cookie.value.length > 20) return cookie.value;
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = supabaseWithToken(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { analysis, tenderName } = await request.json();
    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Missing analysis' }, { status: 400 });
    }

    const { data: profile } = await client
      .from('profiles')
      .select('company_name,company_address,company_phone,company_email,company_website,company_ref_prefix,company_bio,required_documents,former_clients,logo_url,signature_url')
      .eq('id', user.id)
      .single();

    const { data: notif } = await client
      .from('notification_preferences')
      .select('categories')
      .eq('user_id', user.id)
      .single();

    // Fetch pricing items to inject into the proposal
    const { data: priceItems } = await client
      .from('pricing_items')
      .select('name,description,unit,unit_price,currency,category,margin_pct')
      .eq('user_id', user.id);

    const refNumber = profile?.company_ref_prefix
      ? `${profile.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
      : undefined;

    const companyInfo = {
      name: profile?.company_name,
      address: profile?.company_address,
      phone: profile?.company_phone,
      email: profile?.company_email,
      website: profile?.company_website,
      refNumber,
      bio: profile?.company_bio,
      requiredDocuments: profile?.required_documents,
      formerClients: profile?.former_clients,
      pricingItems: priceItems || [],
    };

    const tenderDetails = `Tender: ${tenderName || 'Tender'}\n\nAnalysis Summary:\n${analysis}`;
    const requirements = notif?.categories?.length
      ? `Expertise areas: ${notif.categories.join(', ')}`
      : 'General requirements as per tender analysis above';

    const proposalContent = await generateProposal(tenderDetails, requirements, companyInfo);

    // Detect items in the tender that aren't in the user's pricing catalogue
    const missingItems = await extractMissingItems(
      tenderDetails,
      (priceItems || []).map((i: any) => ({ name: i.name, category: i.category }))
    );

    const { data: saved, error: saveErr } = await client
      .from('proposals')
      .insert({
        user_id: user.id,
        tender_name: tenderName || 'Untitled Tender',
        analysis,
        content: proposalContent,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saveErr) console.error('Save proposal error:', saveErr);

    return NextResponse.json({
      success: true,
      proposal: proposalContent,
      proposalId: saved?.id,
      missingItems,
      profile: {
        logoUrl: profile?.logo_url,
        signatureUrl: profile?.signature_url,
        companyName: profile?.company_name,
        companyAddress: profile?.company_address,
        companyPhone: profile?.company_phone,
        companyEmail: profile?.company_email,
        companyWebsite: profile?.company_website,
        refNumber,
      },
    });
  } catch (error) {
    console.error('Generate proposal from analysis error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate proposal' }, { status: 500 });
  }
}
