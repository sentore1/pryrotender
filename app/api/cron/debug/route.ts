import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scrapeTenders } from '@/lib/scraper';

export const maxDuration = 60;

/**
 * Debug endpoint — open this in your browser:
 * https://tender.pryro.com/api/cron/debug?secret=tender-cron-secret-2024
 *
 * It runs every step of the new-tenders notification flow and returns a
 * JSON report showing exactly where things break.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Wrong secret' }, { status: 401 });
  }

  const report: Record<string, unknown> = {};
  const db = supabaseAdmin();

  // ── 1. Env vars ──────────────────────────────────────────────────────────
  report.env = {
    CRON_SECRET_set: !!process.env.CRON_SECRET,
    GMAIL_USER: process.env.GMAIL_USER || '(not set)',
    GMAIL_APP_PASSWORD_set: !!process.env.GMAIL_APP_PASSWORD,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    NODE_ENV: process.env.NODE_ENV,
  };

  // ── 2. notification_preferences rows ────────────────────────────────────
  const { data: prefs, error: prefsError } = await db
    .from('notification_preferences')
    .select('user_id, enabled, categories, keywords, notification_email, extra_emails');

  report.notification_preferences = {
    error: prefsError?.message ?? null,
    total_rows: prefs?.length ?? 0,
    enabled_rows: prefs?.filter(p => p.enabled).length ?? 0,
    rows: prefs ?? [],
  };

  // ── 3. For each enabled pref, check the joined profile ──────────────────
  const enabledPrefs = prefs?.filter(p => p.enabled) ?? [];
  const profileChecks: unknown[] = [];

  for (const pref of enabledPrefs) {
    const { data: profile, error: profErr } = await db
      .from('profiles')
      .select('email, company_name, subscription_status')
      .eq('id', pref.user_id)
      .single();

    profileChecks.push({
      user_id: pref.user_id,
      notification_email: pref.notification_email,
      categories: pref.categories,
      keywords: pref.keywords,
      profile_error: profErr?.message ?? null,
      profile_email: profile?.email ?? null,
      subscription_status: profile?.subscription_status ?? null,
      will_receive: profile?.subscription_status === 'active',
    });
  }

  report.profile_checks = profileChecks;

  // ── 4. Scrape a sample of tenders ───────────────────────────────────────
  let tenders: unknown[] = [];
  let scrapeError: string | null = null;
  try {
    const all = await scrapeTenders('');
    tenders = all.slice(0, 5).map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      organization: t.organization,
      deadline: t.deadline,
    }));
    report.scrape = { total_scraped: all.length, sample: tenders, error: null };

    // ── 5. For each active user, show which tenders would match ─────────────
    const matchChecks: unknown[] = [];
    for (const check of profileChecks as any[]) {
      if (!check.will_receive) continue;
      const pref = enabledPrefs.find(p => p.user_id === check.user_id)!;
      const matched = all.filter(t => {
        const text = `${t.title} ${t.description} ${t.category}`.toLowerCase();
        const kwMatch = pref.keywords?.length
          ? pref.keywords.some((kw: string) => text.includes(kw.toLowerCase()))
          : true;
        const catMatch = pref.categories?.length
          ? pref.categories.some((cat: string) => text.includes(cat.toLowerCase()))
          : true;
        return kwMatch || catMatch;
      });
      matchChecks.push({
        user_id: check.user_id,
        email: check.profile_email,
        categories: pref.categories,
        keywords: pref.keywords,
        matched_count: matched.length,
        matched_titles: matched.slice(0, 3).map(t => t.title),
      });
    }
    report.match_checks = matchChecks;
  } catch (err: any) {
    scrapeError = err?.message ?? String(err);
    report.scrape = { total_scraped: 0, sample: [], error: scrapeError };
  }

  // ── 6. seen_tenders overlap ─────────────────────────────────────────────
  const { count: totalSeen } = await db
    .from('seen_tenders')
    .select('*', { count: 'exact', head: true });
  report.seen_tenders_count = totalSeen;

  // How many of the currently scraped 250 are already in seen_tenders?
  try {
    const all = await scrapeTenders('');
    const scrapedIds = all.map((t: any) => t.id);
    const { data: alreadySeen } = await db
      .from('seen_tenders')
      .select('id')
      .in('id', scrapedIds);
    const newCount = scrapedIds.length - (alreadySeen?.length ?? 0);
    report.new_tenders_this_run = newCount;
    report.already_seen_of_scraped = alreadySeen?.length ?? 0;
    report.verdict = newCount === 0
      ? 'NO EMAIL SENT — all 250 scraped tenders are already in seen_tenders. The cron returns early with { new: 0, sent: 0 }.'
      : `${newCount} new tenders would trigger emails this run.`;
  } catch {
    report.seen_overlap_check = 'Could not re-scrape for overlap check';
  }

  return NextResponse.json(report, { status: 200 });
}
