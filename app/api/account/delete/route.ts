import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const db = supabaseAdmin();

  await db.from('notification_preferences').delete().eq('user_id', userId);
  await db.from('subscriptions').delete().eq('user_id', userId);
  await db.from('profiles').delete().eq('id', userId);

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
