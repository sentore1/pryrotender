import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mail';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret');
  if (auth !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  // Find expired-but-still-active users before deactivating so we can email them
  const { data: expiredUsers, error: fetchError } = await db
    .from('profiles')
    .select('id, email, company_name, subscription_plan, subscription_end')
    .eq('subscription_status', 'active')
    .lt('subscription_end', today);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  if (!expiredUsers?.length) {
    return NextResponse.json({ deactivated: 0, date: today });
  }

  // Deactivate them all in one query
  const expiredIds = expiredUsers.map(u => u.id);
  const { error: updateError } = await db
    .from('profiles')
    .update({ subscription_status: 'inactive' })
    .in('id', expiredIds);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Send "subscription expired" email to each deactivated user
  const renewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?reason=subscription`;
  let emailsSent = 0;

  for (const user of expiredUsers) {
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your PryroTender subscription has expired',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#dc2626;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="color:white;margin:0">Subscription Expired</h2>
            </div>
            <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px">
              <p style="color:#111;font-size:15px">Hi ${user.company_name || 'there'},</p>
              <p style="color:#444">Your <strong>${user.subscription_plan || 'monthly'}</strong> subscription expired on <strong>${user.subscription_end}</strong>.</p>
              <p style="color:#444">Your account is now inactive. Renew now to restore access to all tenders and AI proposal generation.</p>
              <p style="margin-top:28px">
                <a href="${renewUrl}"
                  style="background:#2563eb;color:white;padding:13px 28px;border-radius:7px;text-decoration:none;font-weight:bold;font-size:14px">
                  Renew Subscription
                </a>
              </p>
              <p style="color:#999;font-size:12px;margin-top:28px">
                Questions? Reply to this email and we will help you out.
              </p>
            </div>
          </div>
        `,
      });
      emailsSent++;
    } catch {
      // Don't let one failed email stop the rest from being sent
    }
  }

  return NextResponse.json({ deactivated: expiredUsers.length, emailsSent, date: today });
}
