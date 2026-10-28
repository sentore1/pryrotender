import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BASE = process.env.PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

const PLANS = {
  monthly: { amount: 29, currency: 'USD', description: 'PryroTender Monthly Subscription' },
  annual: { amount: 249, currency: 'USD', description: 'PryroTender Annual Subscription' },
};

async function getToken() {
  const res = await fetch(`${BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: process.env.PESAPAL_CONSUMER_KEY, consumer_secret: process.env.PESAPAL_CONSUMER_SECRET }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Failed to get Pesapal token');
  return data.token;
}

async function getOrRegisterIPN(token: string, db: ReturnType<typeof supabaseAdmin>) {
  const { data } = await db.from('settings').select('value').eq('key', 'pesapal_ipn_id').single();
  if (data?.value) return data.value;

  const res = await fetch(`${BASE}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pesapal/ipn`, ipn_notification_type: 'GET' }),
  });
  const ipnData = await res.json();
  if (!ipnData.ipn_id) throw new Error('Failed to register IPN');

  await db.from('settings').upsert({ key: 'pesapal_ipn_id', value: ipnData.ipn_id });
  return ipnData.ipn_id;
}

export async function POST(req: NextRequest) {
  try {
    const { plan, email, userId } = await req.json();
    const planData = PLANS[plan as keyof typeof PLANS];
    if (!planData) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const token = await getToken();
    const db = supabaseAdmin();
    const ipnId = await getOrRegisterIPN(token, db);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (plan === 'annual' ? 12 : 1));

    const { data: sub, error: subError } = await db.from('subscriptions').insert({
      user_id: userId, plan, amount: planData.amount, currency: planData.currency,
      status: 'pending', period_start: new Date().toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
    }).select().single();

    if (subError || !sub) throw new Error('Failed to create subscription record');

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pesapal/callback?userId=${userId}&subId=${sub.id}&plan=${plan}`;

    const orderRes = await fetch(`${BASE}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: sub.id, currency: planData.currency, amount: planData.amount,
        description: planData.description, callback_url: callbackUrl,
        notification_id: ipnId, billing_address: { email_address: email },
      }),
    });

    const orderData = await orderRes.json();
    if (orderData.redirect_url) {
      await db.from('subscriptions').update({ pesapal_order_id: orderData.order_tracking_id }).eq('id', sub.id);
      return NextResponse.json({ redirect_url: orderData.redirect_url });
    }
    throw new Error(orderData.error?.message || 'Failed to create payment order');
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
