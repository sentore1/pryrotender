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

/** Generate a random URL-safe token */
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

/**
 * POST /api/supplier-quote/create
 * Body: { supplierId?, title, items: [{name, description, unit, qty}] }
 * Returns: { token, url }
 */
export async function POST(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = supabaseWithToken(authToken);
  const { data: { user }, error: authErr } = await client.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { supplierId, title, items } = body;

    if (!items?.length) {
      return NextResponse.json({ success: false, error: 'Items are required' }, { status: 400 });
    }

    const token = generateToken();

    const { data, error } = await client
      .from('supplier_quote_requests')
      .insert({
        user_id: user.id,
        supplier_id: supplierId || null,
        token,
        title: title || 'Quote Request',
        items,
        status: 'pending',
      })
      .select('id, token')
      .single();

    if (error) {
      console.error('Create quote request error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tender.pryro.com';
    const url = `${appUrl}/supplier-quote/${token}`;

    return NextResponse.json({ success: true, token: data.token, url, id: data.id });
  } catch (err) {
    console.error('supplier-quote create error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
