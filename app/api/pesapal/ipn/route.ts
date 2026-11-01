import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BASE = process.env.PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

/** Safely add months without day-overflow (e.g. Jan 31 + 1 month → Feb 28, not Mar 3) */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // If the day overflowed (e.g. Jan 31 → Mar 3), roll back to last day of intended month
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0); // last day of the previous (correct) month
  }
  return d;
}

async function getToken() {
  const res = await fetch(`${BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: process.env.PESAPAL_CONSUMER_KEY, consumer_secret: process.env.PESAPAL_CONSUMER_SECRET }),
  });
  return (await res.json()).token;
}

async function handleIPN(OrderTrackingId: string, OrderMerchantReference: string, OrderNotificationType: string) {
  if (!OrderTrackingId) {
    console.warn('[IPN] Missing OrderTrackingId — skipping');
    return;
  }

  const token = await getToken();
  if (!token) throw new Error('[IPN] Failed to obtain Pesapal auth token');

  const statusRes = await fetch(`${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const status = await statusRes.json();

  console.log(`[IPN] TrackingId=${OrderTrackingId} MerchantRef=${OrderMerchantReference} PaymentStatus=${status.payment_status_description}`);

  if (status.payment_status_description === 'COMPLETED') {
    const db = supabaseAdmin();

    const { data: sub, error: subErr } = await db.from('subscriptions').select('*').eq('id', OrderMerchantReference).single();
    if (subErr || !sub) {
      console.error('[IPN] Subscription not found for MerchantRef:', OrderMerchantReference, subErr?.message);
      return;
    }

    const { error: subUpdateErr } = await db.from('subscriptions')
      .update({ status: 'paid', pesapal_tracking_id: OrderTrackingId })
      .eq('id', sub.id);
    if (subUpdateErr) console.error('[IPN] Failed to update subscription record:', subUpdateErr.message);

    const periodEnd = addMonths(new Date(), sub.plan === 'annual' ? 12 : 1);
    const { error: profileErr } = await db.from('profiles').update({
      subscription_status: 'active',
      subscription_plan: sub.plan,
      subscription_end: periodEnd.toISOString().split('T')[0],
    }).eq('id', sub.user_id);

    if (profileErr) {
      console.error('[IPN] Failed to activate subscription on profile:', profileErr.message);
      throw new Error(profileErr.message); // bubble up so Pesapal sees a non-200 and retries
    }

    console.log(`[IPN] ✅ Subscription activated for user=${sub.user_id} plan=${sub.plan} until=${periodEnd.toISOString().split('T')[0]}`);
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
  } catch (err: any) {
    // Log the error but still return 200 so Pesapal doesn't treat the IPN endpoint as broken.
    // Profile update failures throw and are logged above; Pesapal will retry on non-200.
    console.error('[IPN] Unhandled error in GET handler:', err?.message ?? err);
  }

  return NextResponse.json({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: '200' });
}

// Keep POST as fallback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body;
    await handleIPN(OrderTrackingId, OrderMerchantReference, OrderNotificationType);
  } catch (err: any) {
    console.error('[IPN] Unhandled error in POST handler:', err?.message ?? err);
  }

  return NextResponse.json({ status: '200' });
}
