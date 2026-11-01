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

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const client = supabaseWithToken(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await client
      .from('proposals')
      .select('id,tender_name,content,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, proposals: data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const client = supabaseWithToken(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { tenderName, content } = await request.json();
    const { error } = await client.from('proposals').insert({
      user_id: user.id,
      tender_name: tenderName || 'Untitled Tender',
      content,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save proposal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const client = supabaseWithToken(token);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    const { error } = await client.from('proposals').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete proposal' }, { status: 500 });
  }
}
