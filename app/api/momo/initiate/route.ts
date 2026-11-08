import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// MoMo plan amounts (same tiers as Pesapal)
const PLANS = {
  monthly: {
    RWF:  { amount: 15000, currency: 'RWF' },
    USDT: { amount: 10,    currency: 'USD' },
  },
  annual: {
    RWF:  { amount: 165000, currency: 'RWF' },
    USDT: { amount: 112,    currency: 'USD' },
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, currency } = await req.json();

    if (!plan || !userId) {
      return NextResponse.json({ error: 'plan and userId are required' }, { status: 400 });
    }

    const selectedCurrency = (currency === 'USDT' ? 'USDT' : 'RWF') as 'RWF' | 'USDT';
    const planData = PLANS[plan as keyof typeof PLANS]?.[selectedCurrency];
    if (!planData) {
      return NextResponse.json({ error: 'Invalid plan or currency' }, { status: 400 });
    }

    const db = supabaseAdmin();

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (plan === 'annual' ? 12 : 1));

    const { data: sub, error: subError } = await db
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        amount: planData.amount,
        currency: planData.currency,
        status: 'pending',
        payment_method: 'momo',
        period_start: new Date().toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (subError || !sub) {
      console.error('[MoMo] Failed to create subscription:', subError?.message);
      return NextResponse.json({ error: 'Failed to create subscription record' }, { status: 500 });
    }

    return NextResponse.json({
      subscriptionId: sub.id,
      amount: planData.amount,
      currency: planData.currency,
      plan,
    });
  } catch (e: any) {
    console.error('[MoMo] Initiate error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
