import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mail';
import { scrapeTenders } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret');
  if (auth !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const isTest = body?.test === true;
  const testUserId = body?.userId;

  const db = supabaseAdmin();

  let query = db.from('notification_preferences')
    .select('*, profiles(email, company_name, subscription_status)')
    .eq('enabled', true);

  if (isTest && testUserId) query = query.eq('user_id', testUserId);

  const { data: prefs } = await query;
  if (!prefs?.length) return NextResponse.json({ sent: 0 });

  const allTenders = await scrapeTenders('');
  let sent = 0;

  for (const pref of prefs) {
    const profile = (pref as any).profiles;
    if (!profile || profile.subscription_status !== 'active') continue;

    const matched = allTenders.filter(t => {
      const text = `${t.title} ${t.description} ${t.category}`.toLowerCase();
      const kwMatch = pref.keywords?.length ? pref.keywords.some((kw: string) => text.includes(kw.toLowerCase())) : true;
      const catMatch = pref.categories?.length ? pref.categories.some((cat: string) => text.includes(cat.toLowerCase())) : true;
      return kwMatch || catMatch;
    });

    if (!matched.length && !isTest) continue;

    const displayTenders = isTest && !matched.length ? allTenders.slice(0, 3) : matched.slice(0, 10);

    const tenderList = displayTenders.map(t =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>${t.title}</strong><br/><span style="color:#666;font-size:12px">${t.organization || ''} · Deadline: ${t.deadline}</span></td></tr>`
    ).join('');

    const toEmails: string[] = [];
    if (pref.notification_email) toEmails.push(pref.notification_email);
    else toEmails.push(profile.email);
    if (pref.extra_emails?.length) toEmails.push(...pref.extra_emails);

    const subject = isTest
      ? `[Test] Tender notification preview`
      : `${matched.length} new tender${matched.length > 1 ? 's' : ''} matching your preferences`;

    for (const to of toEmails) {
      await sendEmail({ to, subject, html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#2563eb;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="color:white;margin:0">${isTest ? '🧪 Test — ' : ''}New Tenders Alert</h2>
            </div>
            <div style="padding:20px;background:#f9fafb">
              <p>Hi ${profile.company_name || 'there'},</p>
              ${isTest ? '<p style="color:#f59e0b;font-size:12px">This is a test email. In production, only tenders matching your preferences will appear.</p>' : ''}
              <p>We found <strong>${displayTenders.length} tender${displayTenders.length > 1 ? 's' : ''}</strong> matching your preferences:</p>
              <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
                ${tenderList}
              </table>
              <p style="margin-top:20px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">View All Tenders</a></p>
              <p style="color:#999;font-size:12px;margin-top:20px">Manage your notification preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Settings</a>.</p>
            </div>
          </div>
        ` });
    }
    sent++;
  }

  return NextResponse.json({ sent, success: sent > 0 });
}
