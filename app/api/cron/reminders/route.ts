import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret');
  if (auth !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Find users whose subscription expires in exactly 3 days
  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  const target = in3Days.toISOString().split('T')[0];

  const { data: users, error } = await db
    .from('profiles')
    .select('id, email, company_name, subscription_plan, subscription_end')
    .eq('subscription_status', 'active')
    .eq('subscription_end', target);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!users?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject: `Your PryroTender subscription expires in 3 days`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#2563eb;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">Subscription Expiring Soon</h2>
          </div>
          <div style="padding:20px;background:#f9fafb">
            <p>Hi ${user.company_name || 'there'},</p>
            <p>Your <strong>${user.subscription_plan || 'monthly'}</strong> subscription expires on <strong>${user.subscription_end}</strong> — that's in 3 days.</p>
            <p>Renew now to keep access to all tenders and AI proposal generation.</p>
            <p style="margin-top:24px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/register?reason=subscription"
                style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                Renew Subscription
              </a>
            </p>
            <p style="color:#999;font-size:12px;margin-top:24px">
              If you have any questions, reply to this email.
            </p>
          </div>
        </div>
      `,
    });
    sent++;
  }

  return NextResponse.json({ sent });
}
