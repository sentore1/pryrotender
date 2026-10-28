import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret');
  if (auth !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  // Deactivate expired subscriptions
  const { data: expired, error } = await db
    .from('profiles')
    .update({ subscription_status: 'inactive' })
    .eq('subscription_status', 'active')
    .lt('subscription_end', today)
    .select('id, email');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deactivated: expired?.length || 0, date: today });
}
