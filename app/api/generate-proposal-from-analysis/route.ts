import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateProposal } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { analysis, tenderName } = await request.json();
    if (!analysis) return NextResponse.json({ success: false, error: 'Missing analysis' }, { status: 400 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name,company_address,company_phone,company_website,company_ref_prefix,company_bio,required_documents,former_clients,logo_url,signature_url')
      .eq('id', user.id)
      .single();

    const { data: notif } = await supabase
      .from('notification_preferences')
      .select('categories')
      .eq('user_id', user.id)
      .single();

    const companyInfo = {
      name: profile?.company_name,
      address: profile?.company_address,
      phone: profile?.company_phone,
      website: profile?.company_website,
      refNumber: profile?.company_ref_prefix
        ? `${profile.company_ref_prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
        : undefined,
      bio: profile?.company_bio,
      requiredDocuments: profile?.required_documents,
      formerClients: profile?.former_clients,
    };

    const tenderDetails = `Tender: ${tenderName || 'Tender'}\n\nAnalysis Summary:\n${analysis}`;
    const requirements = notif?.categories?.length
      ? `Expertise areas: ${notif.categories.join(', ')}`
      : 'General requirements as per tender analysis above';

    const proposalContent = await generateProposal(tenderDetails, requirements, companyInfo);

    const { data: saved, error: saveErr } = await supabase
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
      profile: {
        logoUrl: profile?.logo_url,
        signatureUrl: profile?.signature_url,
        companyName: profile?.company_name,
      },
    });
  } catch (error) {
    console.error('Generate proposal from analysis error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate proposal' }, { status: 500 });
  }
}
