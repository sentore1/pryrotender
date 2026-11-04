import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/supplier-quote/submit?token=XXX
 * Returns the quote request details (public, no auth) so the supplier form page can hydrate.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
  }

  const supabase = adminClient();

  const { data, error } = await supabase
    .from('supplier_quote_requests')
    .select(`
      id, token, title, items, status,
      user_id,
      suppliers ( name, contact_email, whatsapp )
    `)
    .eq('token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Quote request not found' }, { status: 404 });
  }

  // Fetch the requesting company's profile (name, logo) to show on the form
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, logo_url, signature_url, company_address, company_phone, company_email')
    .eq('id', data.user_id)
    .single();

  return NextResponse.json({
    success: true,
    quoteRequest: {
      id: data.id,
      token: data.token,
      title: data.title,
      items: data.items,
      status: data.status,
    },
    company: profile || null,
  });
}

/**
 * POST /api/supplier-quote/submit
 * Body: { token, supplierName, items: [{name, unit, unit_price, qty, total}], notes }
 * Called by the supplier when they submit their prices. No auth required.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, supplierName, items, notes } = body;

    if (!token || !items?.length) {
      return NextResponse.json({ success: false, error: 'Missing token or items' }, { status: 400 });
    }

    const supabase = adminClient();

    // Verify the request exists and is still pending
    const { data: existing, error: fetchErr } = await supabase
      .from('supplier_quote_requests')
      .select('id, status')
      .eq('token', token)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: 'Quote request not found' }, { status: 404 });
    }

    if (existing.status === 'submitted') {
      return NextResponse.json({ success: false, error: 'This quote has already been submitted' }, { status: 409 });
    }

    const { error: updateErr } = await supabase
      .from('supplier_quote_requests')
      .update({
        status: 'submitted',
        response: items,
        response_notes: notes || null,
        responded_at: new Date().toISOString(),
      })
      .eq('token', token);

    if (updateErr) {
      console.error('supplier_quote_requests update error:', updateErr);
      return NextResponse.json({ success: false, error: 'Failed to save response' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('supplier-quote submit error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
