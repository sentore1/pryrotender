import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import { scrapeTenders } from '@/lib/scraper';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // Protect with a secret header for cron calls
  const auth = req.headers.get('x-cron-secret');
  if (auth !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: prefs } = await db
    .from('notification_preferences')
    .select('*, profiles(email, company_name, subscription_status)')
    .eq('enabled', true);

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

    if (!matched.length) continue;

    const tenderList = matched.slice(0, 10).map(t =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>${t.title}</strong><br/><span style="color:#666;font-size:12px">${t.organization || ''} · Deadline: ${t.deadline}</span></td></tr>`
    ).join('');

    await resend.emails.send({
      from: process.env.NOTIFICATION_FROM_EMAIL!,
      to: profile.email,
      subject: `${matched.length} new tender${matched.length > 1 ? 's' : ''} matching your preferences`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#2563eb;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">New Tenders Alert</h2>
          </div>
          <div style="padding:20px;background:#f9fafb">
            <p>Hi ${profile.company_name || 'there'},</p>
            <p>We found <strong>${matched.length} tender${matched.length > 1 ? 's' : ''}</strong> matching your preferences:</p>
            <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
              ${tenderList}
            </table>
            <p style="margin-top:20px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">View All Tenders</a></p>
            <p style="color:#999;font-size:12px;margin-top:20px">Manage your notification preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Settings</a>.</p>
          </div>
        </div>
      `,
    });
    sent++;
  }

  return NextResponse.json({ sent });
}
