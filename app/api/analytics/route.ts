import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ── Helper: verify admin token ────────────────────────────────────────────────
async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const db = supabaseAdmin();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data: p } = await db.from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin' ? user : null;
}

// ── POST /api/analytics  — ingest a single event from the browser ─────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, session_id, user_id, path, target, referrer, user_agent } = body;

    if (!event_type || !session_id || !path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = supabaseAdmin();

    // If user_id provided, verify they are NOT an admin before storing
    if (user_id) {
      const { data: p } = await db.from('profiles').select('role').eq('id', user_id).single();
      if (p?.role === 'admin') {
        // Silently drop admin events
        return NextResponse.json({ ok: true });
      }
    }

    await db.from('analytics_events').insert({
      event_type,
      session_id,
      user_id: user_id || null,
      path,
      target: target || null,
      referrer: referrer || null,
      user_agent: user_agent || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never let analytics fail loudly
    return NextResponse.json({ ok: true });
  }
}

// ── GET /api/analytics  — read stats for admin dashboard ─────────────────────
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 90);
  const db = supabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  // Fetch all events in the window (cap at 50k rows for safety)
  const { data: events } = await db
    .from('analytics_events')
    .select('id, session_id, user_id, event_type, path, target, created_at')
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(50000);

  const rows = events || [];

  // ── Summary numbers ─────────────────────────────────────────────────────────
  const pageviews   = rows.filter(r => r.event_type === 'pageview');
  const clicks      = rows.filter(r => r.event_type === 'click');
  const uniqueSessions = new Set(rows.map(r => r.session_id)).size;
  const uniqueUsers    = new Set(rows.filter(r => r.user_id).map(r => r.user_id)).size;

  // ── Pageviews per day (last `days` days) ────────────────────────────────────
  const pvByDay: Record<string, number> = {};
  pageviews.forEach(r => {
    const d = r.created_at.slice(0, 10);
    pvByDay[d] = (pvByDay[d] || 0) + 1;
  });
  // Build a complete day array with 0-fill
  const pvTimeline = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: pvByDay[key] || 0 };
  });

  // ── Top pages ───────────────────────────────────────────────────────────────
  const pathMap: Record<string, number> = {};
  pageviews.forEach(r => { pathMap[r.path] = (pathMap[r.path] || 0) + 1; });
  const topPages = Object.entries(pathMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // ── Top clicked elements ────────────────────────────────────────────────────
  const clickMap: Record<string, number> = {};
  clicks.forEach(r => {
    const key = `${r.path} → ${r.target || 'unknown'}`;
    clickMap[key] = (clickMap[key] || 0) + 1;
  });
  const topClicks = Object.entries(clickMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([label, count]) => ({ label, count }));

  // ── Unique sessions per day ──────────────────────────────────────────────────
  const sessionsByDay: Record<string, Set<string>> = {};
  rows.forEach(r => {
    const d = r.created_at.slice(0, 10);
    if (!sessionsByDay[d]) sessionsByDay[d] = new Set();
    sessionsByDay[d].add(r.session_id);
  });
  const sessionTimeline = pvTimeline.map(p => ({
    ...p,
    sessions: sessionsByDay[p.date]?.size || 0,
  }));

  // ── Landing vs dashboard split ───────────────────────────────────────────────
  const landingPvs   = pageviews.filter(r => !r.path.startsWith('/dashboard')).length;
  const dashboardPvs = pageviews.filter(r =>  r.path.startsWith('/dashboard')).length;

  return NextResponse.json({
    summary: {
      totalPageviews: pageviews.length,
      totalClicks: clicks.length,
      uniqueSessions,
      uniqueUsers,
      landingPvs,
      dashboardPvs,
      days,
    },
    pvTimeline: sessionTimeline,
    topPages,
    topClicks,
  });
}
