import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

/** GET /api/supplier-quote/list — returns all quote requests for the authenticated user */
export async function GET(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await client
    .from('supplier_quote_requests')
    .select(`
      id, token, title, items, status, response, response_notes, created_at, responded_at,
      suppliers ( id, name, contact_email, whatsapp )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, requests: data || [] });
}

/**
 * PATCH /api/supplier-quote/list
 * Body: { id, action: 'accept' | 'reject', margin_pct?, manual_items? }
 * Lets the admin accept a submitted quote (optionally adding margin) and save
 * the priced items to pricing_items.
 */
export async function PATCH(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, action, margin_pct, manual_items } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    // Verify ownership
    const { data: req, error: fetchErr } = await client
      .from('supplier_quote_requests')
      .select('id, response, items, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !req) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (action === 'accept') {
      // Mark the quote request as accepted
      await client
        .from('supplier_quote_requests')
        .update({ status: 'accepted' })
        .eq('id', id);

      // Save items to pricing_items catalogue
      const responseItems: any[] = manual_items || req.response || [];
      const margin = Number(margin_pct) || 0;

      if (responseItems.length) {
        const rows = responseItems.map((item: any) => ({
          user_id: user.id,
          name: item.name,
          description: item.description || null,
          unit: item.unit || null,
          unit_price: Number(item.unit_price) || 0,
          currency: 'RWF',
          category: 'goods',
          margin_pct: margin,
          updated_at: new Date().toISOString(),
        }));

        const { error: insertErr } = await client
          .from('pricing_items')
          .upsert(rows, { onConflict: 'id' });

        if (insertErr) console.error('pricing_items insert from quote error:', insertErr);
      }

      return NextResponse.json({ success: true, message: 'Quote accepted and items saved to catalogue' });
    }

    if (action === 'reject') {
      await client
        .from('supplier_quote_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('supplier-quote PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
