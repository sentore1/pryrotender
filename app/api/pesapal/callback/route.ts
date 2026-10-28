import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BASE = process.env.PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

async function getToken() {
  const res = await fetch(`${BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: process.env.PESAPAL_CONSUMER_KEY, consumer_secret: process.env.PESAPAL_CONSUMER_SECRET }),
  });
  return (await res.json()).token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('userId');
  const subId = searchParams.get('subId');
  const plan = searchParams.get('plan');
  const trackingId = searchParams.get('OrderTrackingId');

  if (!userId || !subId || !trackingId) {
    return NextResponse.redirect(new URL('/dashboard?payment=failed', req.url));
  }

  try {
    const token = await getToken();
    const statusRes = await fetch(`${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const status = await statusRes.json();
    const db = supabaseAdmin();

    if (status.payment_status_description === 'COMPLETED') {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (plan === 'annual' ? 12 : 1));

      await db.from('subscriptions').update({
        status: 'paid', pesapal_tracking_id: trackingId,
      }).eq('id', subId);

      await db.from('profiles').update({
        subscription_status: 'active', subscription_plan: plan,
        subscription_end: periodEnd.toISOString().split('T')[0],
      }).eq('id', userId);

      return NextResponse.redirect(new URL('/dashboard?payment=success', req.url));
    }

    return NextResponse.redirect(new URL('/dashboard?payment=failed', req.url));
  } catch {
    return NextResponse.redirect(new URL('/dashboard?payment=failed', req.url));
  }
}
