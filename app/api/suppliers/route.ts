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

/** GET /api/suppliers */
export async function GET(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await client
    .from('suppliers')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, suppliers: data || [] });
}

/** POST /api/suppliers — create or update */
export async function POST(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, label, contact_email, whatsapp, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Supplier name is required' }, { status: 400 });
    }

    const row: Record<string, any> = {
      user_id: user.id,
      name: name.trim(),
      label: label?.trim() || null,
      contact_email: contact_email?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      notes: notes?.trim() || null,
    };
    if (id) row.id = id;

    const { data, error } = await client
      .from('suppliers')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('suppliers upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, supplier: data });
  } catch (err) {
    console.error('suppliers POST error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/suppliers?id=XXX */
export async function DELETE(request: NextRequest) {
  const authToken = extractToken(request);
  if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = supabaseWithToken(authToken);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

  const { error } = await client
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
