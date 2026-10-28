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

async function handleIPN(OrderTrackingId: string, OrderMerchantReference: string, OrderNotificationType: string) {
  if (!OrderTrackingId) return;

  const token = await getToken();
  const statusRes = await fetch(`${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const status = await statusRes.json();
  const db = supabaseAdmin();

  if (status.payment_status_description === 'COMPLETED') {
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
}

// Pesapal sends GET IPN notifications
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const OrderTrackingId = searchParams.get('OrderTrackingId') || '';
  const OrderMerchantReference = searchParams.get('OrderMerchantReference') || '';
  const OrderNotificationType = searchParams.get('OrderNotificationType') || '';

  try {
    await handleIPN(OrderTrackingId, OrderMerchantReference, OrderNotificationType);
  } catch { /* silent — always return 200 to Pesapal */ }

  return NextResponse.json({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: '200' });
}

// Keep POST as fallback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body;
    await handleIPN(OrderTrackingId, OrderMerchantReference, OrderNotificationType);
  } catch { /* silent */ }

  return NextResponse.json({ status: '200' });
}
