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

/** GET /api/pricing-items — returns all pricing items for the authenticated user */
export async function GET(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await client
    .from('pricing_items')
    .select('*')
    .eq('user_id', user.id)
    .order('category')
    .order('name');

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, items: data || [] });
}

/** POST /api/pricing-items — upsert one or many items */
export async function POST(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    // body can be a single item or an array (bulk import from Excel)
    const items = Array.isArray(body) ? body : [body];

    const rows = items.map((item: any) => ({
      ...(item.id ? { id: item.id } : {}),
      user_id: user.id,
      name: item.name,
      description: item.description || null,
      unit: item.unit || null,
      unit_price: Number(item.unit_price) || 0,
      currency: item.currency || 'RWF',
      category: item.category || 'goods',
      margin_pct: Number(item.margin_pct) || 0,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await client
      .from('pricing_items')
      .upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('pricing_items upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: data });
  } catch (err) {
    console.error('pricing-items POST error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/pricing-items?id=XXX */
export async function DELETE(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

  const { error } = await client
    .from('pricing_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
