import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/mail';
import { scrapeTenders, Tender } from '@/lib/scraper';
import { generateTenderSlug, generateUniqueSlug, submitIndexNow } from '@/lib/seo';

// Allow up to 90 seconds — scraping three external sites + sending emails needs time
export const maxDuration = 90;

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

  // 2. Look up which IDs we have already seen (for SEO slug deduplication)
  const scrapedIds = allTenders.map(t => t.id);
  const { data: alreadySeen } = await db
    .from('seen_tenders')
    .select('id, slug, notified_user_ids')
    .in('id', scrapedIds);

  const seenMap = new Map(
    (alreadySeen ?? []).map((r: { id: string; slug: string; notified_user_ids: string[] | null }) => [r.id, r])
  );

  // 3. Persist any brand-new tenders into seen_tenders (for SEO slugs)
  const brandNewTenders = allTenders.filter(t => !seenMap.has(t.id));
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  if (brandNewTenders.length) {
    const baseSlugCounts: Record<string, number> = {};
    const rows = brandNewTenders.map(t => {
      const baseSlug = generateTenderSlug(t.title, year);
      baseSlugCounts[baseSlug] = (baseSlugCounts[baseSlug] ?? 0) + 1;
      const slug = baseSlugCounts[baseSlug] > 1
        ? generateUniqueSlug(t.title, t.id, year)
        : baseSlug;
      return {
        id: t.id,
        slug,
        title: t.title,
        organization: t.organization ?? null,
        category: t.category ?? null,
        location: t.location ?? 'Rwanda',
        deadline: t.deadline ?? null,
        source: t.source,
        source_url: t.url,
        url: t.url,
        description: t.description ?? null,
        first_seen_at: now,
        updated_at: now,
        is_active: true,
        notified_user_ids: [],
      };
    });

    // Fix slug collisions within this batch
    const slugsSeen = new Set<string>();
    for (const row of rows) {
      if (slugsSeen.has(row.slug)) {
        row.slug = generateUniqueSlug(row.title, row.id, year);
      }
      slugsSeen.add(row.slug);
    }

    const { error: insertError } = await db
      .from('seen_tenders')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

    if (insertError) {
      console.error('Failed to persist seen_tenders:', insertError.message);
    }

    // Add new rows into seenMap so we have their slugs below
    for (const row of rows) {
      seenMap.set(row.id, { id: row.id, slug: row.slug, notified_user_ids: [] });
    }
  }

  // 3b. Notify IndexNow of newly indexed tender pages (non-blocking)
  if (brandNewTenders.length) {
    const indexNowKey = process.env.INDEXNOW_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';
    if (indexNowKey) {
      const tenderUrls = brandNewTenders.map(t => {
        const row = seenMap.get(t.id) as any;
        return `${appUrl}/tenders/${row?.slug ?? t.id}`;
      });
      submitIndexNow(tenderUrls, appUrl, indexNowKey).catch(err =>
        console.error('IndexNow submission failed:', err)
      );
    }
  }

  // 4. Load all active users who have notifications enabled
  const { data: prefs } = await db
    .from('notification_preferences')
    .select('user_id, enabled, keywords, categories, notification_email, extra_emails')
    .eq('enabled', true);

  if (!prefs?.length) {
    return NextResponse.json({ new: brandNewTenders.length, sent: 0, message: 'No subscribers' });
  }

  let sent = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

  for (const pref of prefs) {
    // Fetch profile separately using service role (avoids RLS join issues)
    const { data: profile } = await db
      .from('profiles')
      .select('email, company_name, subscription_status')
      .eq('id', pref.user_id)
      .single();

    if (!profile || profile.subscription_status !== 'active') continue;

    // 5. Find tenders this user hasn't been notified about yet
    const unnotified = allTenders.filter(t => {
      const row = seenMap.get(t.id) as any;
      const alreadyNotified = (row?.notified_user_ids ?? []).includes(pref.user_id);
      if (alreadyNotified) return false;

      // Check keyword / category match
      const text = `${t.title} ${t.description ?? ''} ${t.category ?? ''}`.toLowerCase();

      const kwMatch = pref.keywords?.length
        ? pref.keywords.some((kw: string) => text.includes(kw.toLowerCase()))
        : true;

      const catMatch = pref.categories?.length
        ? pref.categories.some((cat: string) => text.includes(cat.toLowerCase()))
        : true;

      return kwMatch || catMatch;
    });

    if (!unnotified.length) continue;

    // 6. Build recipient list
    const toEmails: string[] = [];
    if (pref.notification_email) toEmails.push(pref.notification_email);
    else toEmails.push(profile.email);
    if (pref.extra_emails?.length) toEmails.push(...pref.extra_emails);

    const subject = `${unnotified.length} new tender${unnotified.length > 1 ? 's' : ''} matching your preferences`;

    const tenderRows = unnotified.slice(0, 10).map(t => {
      const row = seenMap.get(t.id) as any;
      const tenderUrl = row?.slug
        ? `${appUrl}/tenders/${row.slug}`
        : t.url;

      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee">
          <a href="${tenderUrl}" style="font-weight:bold;color:#2563eb;text-decoration:none">${t.title}</a><br/>
          <span style="color:#666;font-size:12px">
            ${t.organization || t.source} · Deadline: ${t.deadline}
          </span>
        </td>
      </tr>`;
    }).join('');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2563eb;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0">🔔 New Tenders Alert</h2>
        </div>
        <div style="padding:20px;background:#f9fafb">
          <p>Hi ${profile.company_name || 'there'},</p>
          <p>We found <strong>${unnotified.length} tender${unnotified.length > 1 ? 's' : ''}</strong> matching your preferences:</p>
          <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
            ${tenderRows}
          </table>
          ${unnotified.length > 10 ? `<p style="color:#666;font-size:13px">Showing 10 of ${unnotified.length} matches. View all on the dashboard.</p>` : ''}
          <p style="margin-top:20px">
            <a href="${appUrl}/dashboard"
               style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
              View All Tenders
            </a>
          </p>
          <p style="color:#999;font-size:12px;margin-top:20px">
            Manage your notification preferences in
            <a href="${appUrl}/settings">Settings</a>.
          </p>
        </div>
      </div>
    `;

    // 7. Send to each address
    for (const to of toEmails) {
      try {
        await sendEmail({ to, subject, html });
      } catch (err) {
        console.error(`Failed to send to ${to}:`, err);
      }
    }

    // 8. Mark this user as notified for each of these tenders
    //    Use a Postgres function to append to the array atomically
    for (const t of unnotified) {
      const { error: rpcErr } = await db.rpc('append_notified_user', {
        tender_id: t.id,
        user_id: pref.user_id,
      });
      if (rpcErr) {
        // Fallback: read current array then update
        const row = seenMap.get(t.id) as any;
        const existing: string[] = row?.notified_user_ids ?? [];
        if (!existing.includes(pref.user_id)) {
          db.from('seen_tenders')
            .update({ notified_user_ids: [...existing, pref.user_id] })
            .eq('id', t.id)
            .then(() => {});
        }
      }
    }

    sent++;
  }

  return NextResponse.json({
    new: brandNewTenders.length,
    total_scraped: allTenders.length,
    sent,
    success: sent > 0,
  });
}
