import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper: verify caller is admin
async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const db = supabaseAdmin();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const db = supabaseAdmin();

  // ── Analytics overview ────────────────────────────────────────────────────
  if (action === 'analytics') {
    const [
      { data: profiles },
      { data: subscriptions },
      { data: proposals },
      { data: tenders },
    ] = await Promise.all([
      db.from('profiles').select('id, subscription_status, subscription_plan, subscription_end, created_at'),
      db.from('subscriptions').select('id, plan, amount, currency, status, created_at, period_start, period_end'),
      db.from('proposals').select('id, created_at'),
      db.from('seen_tenders').select('id, category, is_active, first_seen_at').limit(2000),
    ]);

    // User growth — last 12 months
    const now = new Date();
    const userGrowth = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = (profiles || []).filter(p => {
        const c = new Date(p.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length;
      return { label, count };
    });

    // Revenue — paid subscriptions per month (last 12)
    const revenueByMonth = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const revenue = (subscriptions || [])
        .filter(s => {
          if (s.status !== 'paid') return false;
          const c = new Date(s.created_at);
          return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
        })
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return { label, revenue };
    });

    // Proposals per month (last 12)
    const proposalsByMonth = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = (proposals || []).filter(p => {
        const c = new Date(p.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length;
      return { label, count };
    });

    // Tender categories
    const categoryMap: Record<string, number> = {};
    (tenders || []).forEach(t => {
      const cat = t.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    const activeProfiles = (profiles || []).filter(p => p.subscription_status === 'active');
    const totalRevenuePaid = (subscriptions || [])
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    return NextResponse.json({
      summary: {
        totalUsers: (profiles || []).length,
        activeUsers: activeProfiles.length,
        monthlyUsers: (profiles || []).filter(p => p.subscription_plan === 'monthly').length,
        annualUsers: (profiles || []).filter(p => p.subscription_plan === 'annual').length,
        totalProposals: (proposals || []).length,
        totalTenders: (tenders || []).length,
        activeTenders: (tenders || []).filter(t => t.is_active).length,
        totalRevenue: totalRevenuePaid,
        paidSubs: (subscriptions || []).filter(s => s.status === 'paid').length,
        pendingSubs: (subscriptions || []).filter(s => s.status === 'pending').length,
      },
      userGrowth,
      revenueByMonth,
      proposalsByMonth,
      topCategories,
    });
  }

  // ── All users ─────────────────────────────────────────────────────────────
  if (action === 'users') {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, email, company_name, role, subscription_status, subscription_plan, subscription_end, created_at')
      .order('created_at', { ascending: false });

    // Proposal counts per user
    const { data: proposalCounts } = await db
      .from('proposals')
      .select('user_id');

    const countMap: Record<string, number> = {};
    (proposalCounts || []).forEach(p => {
      countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
    });

    const users = (profiles || []).map(p => ({
      ...p,
      proposal_count: countMap[p.id] || 0,
    }));

    return NextResponse.json({ users });
  }

  // ── Subscription history for a user ──────────────────────────────────────
  if (action === 'sub-history') {
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const { data: subs } = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return NextResponse.json({ subscriptions: subs || [] });
  }

  // ── Get public settings (e.g. momo_enabled) ──────────────────────────────
  if (action === 'get-settings') {
    const keys = ['momo_enabled', 'momo_number', 'momo_name'];
    const { data } = await db.from('settings').select('key, value').in('key', keys);
    const result: Record<string, string> = {};
    (data || []).forEach(r => { result[r.key] = r.value; });
    // Defaults if not yet set
    if (!result.momo_enabled) result.momo_enabled = 'true';
    if (!result.momo_number)  result.momo_number  = '0789XXXXXX';
    if (!result.momo_name)    result.momo_name    = 'PryroTender';
    return NextResponse.json({ settings: result });
  }

  // ── Pending payments awaiting admin approval ──────────────────────────────
  if (action === 'pending-payments') {
    const { data: subs } = await db
      .from('subscriptions')
      .select(`
        id, user_id, plan, amount, currency, status,
        payment_method, payment_reference, reference_uploaded_at, created_at
      `)
      .in('status', ['awaiting_approval', 'pending'])
      .not('payment_reference', 'is', null)
      .order('reference_uploaded_at', { ascending: true });

    // Enrich with user info
    const userIds = [...new Set((subs || []).map(s => s.user_id))];
    const { data: profiles } = userIds.length
      ? await db.from('profiles').select('id, email, company_name').in('id', userIds)
      : { data: [] };

    const profileMap: Record<string, { email: string; company_name: string | null }> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const enriched = (subs || []).map(s => ({
      ...s,
      email: profileMap[s.user_id]?.email ?? '—',
      company_name: profileMap[s.user_id]?.company_name ?? null,
    }));

    return NextResponse.json({ payments: enriched });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;
  const db = supabaseAdmin();

  // ── Update settings (momo_enabled, momo_number, momo_name) ──────────────
  if (action === 'update-settings') {
    const { settings } = body as { settings: Record<string, string> };
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object required' }, { status: 400 });
    }
    const allowed = ['momo_enabled', 'momo_number', 'momo_name'];
    const rows = Object.entries(settings)
      .filter(([k]) => allowed.includes(k))
      .map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }));

    if (!rows.length) return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 });
    await db.from('settings').upsert(rows, { onConflict: 'key' });
    return NextResponse.json({ success: true });
  }

  // ── Extend subscription by N free months ─────────────────────────────────
  if (action === 'extend') {
    const { userId, months } = body;
    if (!userId || !months || months < 1 || months > 12) {
      return NextResponse.json({ error: 'userId and months (1-12) required' }, { status: 400 });
    }

    const { data: profile, error: fetchErr } = await db
      .from('profiles')
      .select('subscription_end, subscription_status, subscription_plan')
      .eq('id', userId)
      .single();

    if (fetchErr || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Base date: if active and has future end date, extend from there; otherwise from today
    const base = profile.subscription_end && new Date(profile.subscription_end) > new Date()
      ? new Date(profile.subscription_end)
      : new Date();

    base.setMonth(base.getMonth() + months);
    const newEnd = base.toISOString().split('T')[0];

    await db.from('profiles').update({
      subscription_status: 'active',
      subscription_plan: profile.subscription_plan || 'monthly',
      subscription_end: newEnd,
    }).eq('id', userId);

    // Log it as a "paid" subscription record for audit trail
    await db.from('subscriptions').insert({
      user_id: userId,
      plan: profile.subscription_plan || 'monthly',
      amount: 0,
      currency: 'USD',
      status: 'paid',
      period_start: new Date().toISOString().split('T')[0],
      period_end: newEnd,
    });

    return NextResponse.json({ success: true, newEnd });
  }

  // ── Toggle subscription status ────────────────────────────────────────────
  if (action === 'toggle-status') {
    const { userId, currentStatus } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const updates: Record<string, any> = { subscription_status: newStatus };

    if (newStatus === 'active') {
      const { data: profile } = await db.from('profiles').select('subscription_end, subscription_plan').eq('id', userId).single();
      const hasValidEnd = profile?.subscription_end && new Date(profile.subscription_end) > new Date();
      if (!hasValidEnd) {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        updates.subscription_end = end.toISOString().split('T')[0];
        updates.subscription_plan = profile?.subscription_plan || 'monthly';
      }
    }

    await db.from('profiles').update(updates).eq('id', userId);
    return NextResponse.json({ success: true, newStatus });
  }

  // ── Approve a manual payment (MoMo or Pesapal reference) ─────────────────
  if (action === 'approve-payment') {
    const { subscriptionId } = body;
    if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

    const { data: sub, error: subErr } = await db
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subErr || !sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    // Mark subscription paid
    await db.from('subscriptions').update({
      status: 'paid',
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    }).eq('id', subscriptionId);

    // Activate the user profile
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (sub.plan === 'annual' ? 12 : 1));

    await db.from('profiles').update({
      subscription_status: 'active',
      subscription_plan: sub.plan,
      subscription_end: periodEnd.toISOString().split('T')[0],
    }).eq('id', sub.user_id);

    return NextResponse.json({ success: true, newEnd: periodEnd.toISOString().split('T')[0] });
  }

  // ── Reject a manual payment ───────────────────────────────────────────────
  if (action === 'reject-payment') {
    const { subscriptionId } = body;
    if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

    const { error } = await db.from('subscriptions').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    }).eq('id', subscriptionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Delete user ───────────────────────────────────────────────────────────
  if (action === 'delete-user') {
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    // Deleting from auth.users cascades to profiles via FK
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
