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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { OrderTrackingId, OrderMerchantReference } = body;
    if (!OrderTrackingId) return NextResponse.json({ status: 'ignored' });

    const token = await getToken();
    const statusRes = await fetch(`${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const status = await statusRes.json();
    const db = supabaseAdmin();

    if (status.payment_status_description === 'Completed') {
      const { data: sub } = await db.from('subscriptions').select('*').eq('id', OrderMerchantReference).single();
      if (sub) {
        await db.from('subscriptions').update({ status: 'paid', pesapal_tracking_id: OrderTrackingId }).eq('id', sub.id);
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + (sub.plan === 'annual' ? 12 : 1));
        await db.from('profiles').update({
          subscription_status: 'active', subscription_plan: sub.plan,
          subscription_end: periodEnd.toISOString().split('T')[0],
        }).eq('id', sub.user_id);
      }
    }

    return NextResponse.json({ orderNotificationType: body.OrderNotificationType, orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: '200' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
