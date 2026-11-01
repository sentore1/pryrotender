import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mail';
import { scrapeTenders, Tender } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret');
  if (auth !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  // 1. Scrape all current tenders
  let allTenders: Tender[] = [];
  try {
    allTenders = await scrapeTenders('');
  } catch (err) {
    console.error('Scraping failed:', err);
    return NextResponse.json({ error: 'Scraping failed' }, { status: 500 });
  }

  if (!allTenders.length) {
    return NextResponse.json({ new: 0, sent: 0, message: 'No tenders scraped' });
  }

  // 2. Look up which IDs we have already seen
  const scrapedIds = allTenders.map(t => t.id);
  const { data: alreadySeen } = await db
    .from('seen_tenders')
    .select('id')
    .in('id', scrapedIds);

  const seenSet = new Set((alreadySeen ?? []).map((r: { id: string }) => r.id));

  // 3. Keep only genuinely new tenders
  const newTenders = allTenders.filter(t => !seenSet.has(t.id));

  if (!newTenders.length) {
    return NextResponse.json({ new: 0, sent: 0, message: 'No new tenders' });
  }

  // 4. Persist new tenders into seen_tenders so we never re-notify for them
  const rows = newTenders.map(t => ({
    id: t.id,
    title: t.title,
    source: t.source,
    url: t.url,
    first_seen_at: new Date().toISOString(),
  }));

  const { error: insertError } = await db
    .from('seen_tenders')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (insertError) {
    console.error('Failed to persist seen_tenders:', insertError.message);
    // Don't abort — still send notifications, but log the issue
  }

  // 5. Load all active users who have notifications enabled
  const { data: prefs } = await db
    .from('notification_preferences')
    .select('*, profiles(email, company_name, subscription_status)')
    .eq('enabled', true);

  if (!prefs?.length) {
    return NextResponse.json({ new: newTenders.length, sent: 0, message: 'No subscribers' });
  }

  let sent = 0;

  for (const pref of prefs) {
    const profile = (pref as any).profiles;
    if (!profile || profile.subscription_status !== 'active') continue;

    // 6. Filter new tenders by each user's keywords / categories
    const matched = newTenders.filter(t => {
      const text = `${t.title} ${t.description} ${t.category}`.toLowerCase();
      const kwMatch = pref.keywords?.length
        ? pref.keywords.some((kw: string) => text.includes(kw.toLowerCase()))
        : true;
      const catMatch = pref.categories?.length
        ? pref.categories.some((cat: string) => text.includes(cat.toLowerCase()))
        : true;
      // Both keywords AND categories must match (if both are set)
      if (pref.keywords?.length && pref.categories?.length) return kwMatch && catMatch;
      return kwMatch || catMatch;
    });

    if (!matched.length) continue;

    // 7. Build recipient list
    const toEmails: string[] = [];
    if (pref.notification_email) toEmails.push(pref.notification_email);
    else toEmails.push(profile.email);
    if (pref.extra_emails?.length) toEmails.push(...pref.extra_emails);

    const subject = `${matched.length} new tender${matched.length > 1 ? 's' : ''} matching your preferences`;

    const tenderRows = matched.slice(0, 10).map(t =>
      `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee">
          <a href="${t.url}" style="font-weight:bold;color:#2563eb;text-decoration:none">${t.title}</a><br/>
          <span style="color:#666;font-size:12px">
            ${t.organization || t.source} · Deadline: ${t.deadline}
          </span>
        </td>
      </tr>`
    ).join('');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2563eb;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0">🔔 New Tenders Alert</h2>
        </div>
        <div style="padding:20px;background:#f9fafb">
          <p>Hi ${profile.company_name || 'there'},</p>
          <p>We found <strong>${matched.length} new tender${matched.length > 1 ? 's' : ''}</strong> matching your preferences:</p>
          <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
            ${tenderRows}
          </table>
          ${matched.length > 10 ? `<p style="color:#666;font-size:13px">Showing 10 of ${matched.length} matches. View all on the dashboard.</p>` : ''}
          <p style="margin-top:20px">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
               style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
              View All Tenders
            </a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:20px">
            Manage your notification preferences in
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Settings</a>.
          </p>
        </div>
      </div>
    `;

    // 8. Send to each address — catch per-user errors so one failure doesn't abort the rest
    for (const to of toEmails) {
      try {
        await sendEmail({ to, subject, html });
      } catch (err) {
        console.error(`Failed to send to ${to}:`, err);
      }
    }

    // 9. Mark notified_at in seen_tenders for audit trail
    await db
      .from('seen_tenders')
      .update({ notified_at: new Date().toISOString() })
      .in('id', matched.map(t => t.id));

    sent++;
  }

  return NextResponse.json({
    new: newTenders.length,
    sent,
    success: sent > 0,
  });
}
