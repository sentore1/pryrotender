'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Users, CreditCard, RefreshCw, Trash2, ChevronRight,
  TrendingUp, DollarSign, FileText, Layers, CheckCircle2, XCircle,
  Calendar, AlertTriangle, ArrowLeft, LogOut, BarChart2, Gift,
  Clock, History, X, Eye, MousePointerClick, Globe, MonitorSmartphone,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  email: string;
  company_name: string | null;
  role: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_end: string | null;
  created_at: string;
  proposal_count: number;
}

interface SubRecord {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  period_start: string | null;
  period_end: string | null;
  pesapal_tracking_id: string | null;
}

interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  monthlyUsers: number;
  annualUsers: number;
  totalProposals: number;
  totalTenders: number;
  activeTenders: number;
  totalRevenue: number;
  paidSubs: number;
  pendingSubs: number;
}

interface ChartPoint { label: string; count?: number; revenue?: number }

// Visitor analytics types
interface VisitorSummary {
  totalPageviews: number;
  totalClicks: number;
  uniqueSessions: number;
  uniqueUsers: number;
  landingPvs: number;
  dashboardPvs: number;
  days: number;
}
interface PvPoint { date: string; label: string; count: number; sessions: number }
interface TopItem { path?: string; label?: string; count: number }

// ─── Tiny inline bar chart (generic) ─────────────────────────────────────────
function MiniBar({ data, valueKey, color, fmt }: {
  data: Record<string, any>[];
  valueKey: string;
  color: string;
  fmt?: (v: number) => string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        const label = d.label || d.date || String(i);
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div
              className={`w-full rounded-t-sm transition-all ${color}`}
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {label}: {fmt ? fmt(val) : val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, Icon }: { label: string; value: string | number; sub?: string; color: string; Icon?: React.ElementType }) {
  return (
    <div className="bg-white p-4 border border-gray-100 shadow-sm" style={{ borderRadius: 4 }}>
      <div className="flex items-start justify-between mb-1">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        {Icon && <Icon size={16} className="text-gray-300 mt-1 flex-shrink-0" />}
      </div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'users' | 'subscriptions' | 'visitors'>('overview');

  // analytics
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [userGrowth, setUserGrowth] = useState<ChartPoint[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<ChartPoint[]>([]);
  const [proposalsByMonth, setProposalsByMonth] = useState<ChartPoint[]>([]);
  const [topCategories, setTopCategories] = useState<ChartPoint[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // visitor analytics
  const [vDays, setVDays] = useState(30);
  const [vSummary, setVSummary] = useState<VisitorSummary | null>(null);
  const [pvTimeline, setPvTimeline] = useState<PvPoint[]>([]);
  const [topPages, setTopPages] = useState<TopItem[]>([]);
  const [topClicks, setTopClicks] = useState<TopItem[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);

  // users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // extend modal
  const [extendTarget, setExtendTarget] = useState<UserRow | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendMsg, setExtendMsg] = useState('');

  // subscription history drawer
  const [historyUser, setHistoryUser] = useState<UserRow | null>(null);
  const [history, setHistory] = useState<SubRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // action feedback
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const t = data.session?.access_token;
      if (!t) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.session!.user.id).single();
      if (p?.role !== 'admin') { router.push('/dashboard'); return; }
      setToken(t);
    });
  }, []);

  // ── API helper ────────────────────────────────────────────────────────────
  const api = useCallback(async (method: 'GET' | 'POST', params: Record<string, string>, body?: object) => {
    if (!token) return null;
    const url = method === 'GET'
      ? `/api/admin?${new URLSearchParams(params)}`
      : '/api/admin';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  }, [token]);

  // ── Load analytics ────────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    const data = await api('GET', { action: 'analytics' });
    if (data && !data.error) {
      setSummary(data.summary);
      setUserGrowth(data.userGrowth);
      setRevenueByMonth(data.revenueByMonth);
      setProposalsByMonth(data.proposalsByMonth);
      setTopCategories(data.topCategories);
    }
    setAnalyticsLoading(false);
  }, [api, token]);

  // ── Load users ────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    const data = await api('GET', { action: 'users' });
    if (data && !data.error) {
      setUsers(data.users);
      setFiltered(data.users);
    }
    setUsersLoading(false);
  }, [api, token]);

  useEffect(() => { if (token) { loadAnalytics(); loadUsers(); } }, [token]);

  // ── Load visitor analytics ────────────────────────────────────────────────
  const loadVisitors = useCallback(async (days = vDays) => {
    if (!token) return;
    setVisitorsLoading(true);
    const res = await fetch(`/api/analytics?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.error) {
      setVSummary(data.summary);
      setPvTimeline(data.pvTimeline || []);
      setTopPages(data.topPages || []);
      setTopClicks(data.topClicks || []);
    }
    setVisitorsLoading(false);
  }, [token, vDays]);

  // Load visitors when tab first opens
  useEffect(() => { if (tab === 'visitors' && token && !vSummary) loadVisitors(); }, [tab, token]);

  // ── Filter users ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u => {
      const matchQ = u.email?.toLowerCase().includes(q) || u.company_name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || u.subscription_status === statusFilter;
      return matchQ && matchStatus;
    }));
  }, [search, statusFilter, users]);

  // ── Toggle status ─────────────────────────────────────────────────────────
  const handleToggle = async (u: UserRow) => {
    setActionLoading(u.id + '-toggle');
    const data = await api('POST', {}, { action: 'toggle-status', userId: u.id, currentStatus: u.subscription_status });
    if (data?.success) {
      showToast(`${u.email} is now ${data.newStatus}`);
      loadUsers();
    } else showToast(data?.error || 'Failed', false);
    setActionLoading(null);
  };

  // ── Extend subscription ───────────────────────────────────────────────────
  const handleExtend = async () => {
    if (!extendTarget) return;
    setExtendLoading(true);
    setExtendMsg('');
    const data = await api('POST', {}, { action: 'extend', userId: extendTarget.id, months: extendMonths });
    if (data?.success) {
      setExtendMsg(`✓ Extended to ${data.newEnd}`);
      showToast(`${extendTarget.email} extended by ${extendMonths} month${extendMonths > 1 ? 's' : ''}`);
      loadUsers();
      setTimeout(() => { setExtendTarget(null); setExtendMsg(''); }, 1500);
    } else setExtendMsg(data?.error || 'Failed to extend');
    setExtendLoading(false);
  };

  // ── Subscription history ──────────────────────────────────────────────────
  const openHistory = async (u: UserRow) => {
    setHistoryUser(u);
    setHistoryLoading(true);
    const data = await api('GET', { action: 'sub-history', userId: u.id });
    setHistory(data?.subscriptions || []);
    setHistoryLoading(false);
  };

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const data = await api('POST', {}, { action: 'delete-user', userId: deleteTarget.id });
    if (data?.success) {
      showToast(`${deleteTarget.email} deleted`);
      setDeleteTarget(null);
      loadUsers();
      loadAnalytics();
    } else showToast(data?.error || 'Failed to delete', false);
    setDeleteLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    router.push('/login');
  };

  // ── Category bar ──────────────────────────────────────────────────────────
  const maxCat = Math.max(...topCategories.map(c => c.count || 0), 1);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PryroTender" width={90} height={28} className="object-contain" />
          <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft size={14} /> Dashboard
          </a>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
          {([
            { key: 'overview',       label: 'Overview',       Icon: LayoutDashboard },
            { key: 'users',          label: 'Users',          Icon: Users },
            { key: 'subscriptions',  label: 'Subscriptions',  Icon: CreditCard },
            { key: 'visitors',       label: 'Visitors',       Icon: Eye },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
            >
              <t.Icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
        {tab === 'overview' && (
          <div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : summary && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                  <StatCard label="Total Users"   value={summary.totalUsers}                                                         color="text-gray-900"    Icon={Users} />
                  <StatCard label="Active Subs"   value={summary.activeUsers}  sub={`${summary.totalUsers > 0 ? Math.round((summary.activeUsers / summary.totalUsers) * 100) : 0}% of total`} color="text-green-600"   Icon={CheckCircle2} />
                  <StatCard label="Monthly"       value={summary.monthlyUsers}                                                        color="text-blue-600"    Icon={Calendar} />
                  <StatCard label="Annual"        value={summary.annualUsers}                                                         color="text-purple-600"  Icon={TrendingUp} />
                  <StatCard label="Total Revenue" value={`$${summary.totalRevenue.toLocaleString()}`} sub={`${summary.paidSubs} paid transactions`}            color="text-emerald-600" Icon={DollarSign} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Total Proposals"  value={summary.totalProposals} color="text-indigo-600" Icon={FileText} />
                  <StatCard label="Total Tenders"    value={summary.totalTenders}   color="text-gray-700"   Icon={Layers} />
                  <StatCard label="Active Tenders"   value={summary.activeTenders}  color="text-orange-600" Icon={BarChart2} />
                  <StatCard label="Pending Payments" value={summary.pendingSubs}    color="text-yellow-600" Icon={Clock} />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* User growth */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-sm font-semibold text-gray-700 mb-3">User Growth (12 mo)</div>
                    <MiniBar data={userGrowth} valueKey="count" color="bg-blue-500 hover:bg-blue-600" />
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                      <span>{userGrowth[0]?.label}</span>
                      <span>{userGrowth[userGrowth.length - 1]?.label}</span>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Revenue USD (12 mo)</div>
                    <MiniBar data={revenueByMonth} valueKey="revenue" color="bg-emerald-500 hover:bg-emerald-600" />
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                      <span>{revenueByMonth[0]?.label}</span>
                      <span>{revenueByMonth[revenueByMonth.length - 1]?.label}</span>
                    </div>
                  </div>

                  {/* Proposals */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Proposals Generated (12 mo)</div>
                    <MiniBar data={proposalsByMonth} valueKey="count" color="bg-indigo-500 hover:bg-indigo-600" />
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                      <span>{proposalsByMonth[0]?.label}</span>
                      <span>{proposalsByMonth[proposalsByMonth.length - 1]?.label}</span>
                    </div>
                  </div>
                </div>

                {/* Top tender categories */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-sm font-semibold text-gray-700 mb-4">Top Tender Categories</div>
                  <div className="space-y-2">
                    {topCategories.map((c, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="text-xs text-gray-500 w-40 truncate">{c.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.round(((c.count || 0) / maxCat) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium text-gray-600 w-10 text-right">{c.count}</div>
                      </div>
                    ))}
                    {topCategories.length === 0 && <div className="text-sm text-gray-400">No categories found</div>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════ USERS TAB ══════════════════ */}
        {tab === 'users' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search email or company…"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button onClick={loadUsers} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <RefreshCw size={13} /> Refresh
              </button>
              <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} users</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {usersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Company / Email', 'Plan', 'Status', 'Expires', 'Proposals', 'Joined', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800 text-xs">{u.company_name || '—'}</div>
                            <div className="text-gray-400 text-[11px]">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            {u.subscription_plan
                              ? <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.subscription_plan === 'annual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.subscription_plan}</span>
                              : <span className="text-gray-400 text-xs">None</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                              {u.subscription_status || 'inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {u.subscription_end
                              ? <span className="flex items-center gap-1">
                                  {u.subscription_end}
                                  {new Date(u.subscription_end) < new Date() && <XCircle size={12} className="text-red-400" />}
                                </span>
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-semibold text-indigo-600">{u.proposal_count}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Toggle */}
                              <button
                                onClick={() => handleToggle(u)}
                                disabled={actionLoading === u.id + '-toggle'}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition disabled:opacity-40 ${u.subscription_status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                              >
                                {actionLoading === u.id + '-toggle' ? '…' : u.subscription_status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              {/* Extend */}
                              <button
                                onClick={() => { setExtendTarget(u); setExtendMonths(1); setExtendMsg(''); }}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                              >
                                <Gift size={11} /> Free Months
                              </button>
                              {/* History */}
                              <button
                                onClick={() => openHistory(u)}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                              >
                                <History size={11} /> History
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ SUBSCRIPTIONS TAB ══════════════════ */}
        {tab === 'subscriptions' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Active users breakdown */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-3">Subscription Breakdown</div>
                {summary && (
                  <div className="space-y-3">
                    {[
                      { label: 'Active Monthly', value: summary.monthlyUsers, color: 'bg-blue-500', max: summary.activeUsers },
                      { label: 'Active Annual', value: summary.annualUsers, color: 'bg-purple-500', max: summary.activeUsers },
                      { label: 'Inactive', value: summary.totalUsers - summary.activeUsers, color: 'bg-red-400', max: summary.totalUsers },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="text-xs text-gray-500 w-32">{row.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                          <div className={`${row.color} h-2.5 rounded-full`} style={{ width: `${row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%` }} />
                        </div>
                        <div className="text-xs font-bold text-gray-700 w-8 text-right">{row.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick revenue stats */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-3">Revenue (12 mo)</div>
                <MiniBar data={revenueByMonth} valueKey="revenue" color="bg-emerald-500 hover:bg-emerald-600" />
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>{revenueByMonth[0]?.label}</span>
                  <span>{revenueByMonth[revenueByMonth.length - 1]?.label}</span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  Total collected: <span className="font-bold text-emerald-600">${summary?.totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Users expiring soon */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <AlertTriangle size={14} className="text-orange-400" /> Subscriptions Expiring in 7 Days
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Company', 'Email', 'Plan', 'Expires', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users
                      .filter(u => {
                        if (!u.subscription_end || u.subscription_status !== 'active') return false;
                        const diff = (new Date(u.subscription_end).getTime() - Date.now()) / 86400000;
                        return diff >= 0 && diff <= 7;
                      })
                      .map(u => (
                        <tr key={u.id} className="hover:bg-yellow-50">
                          <td className="px-4 py-3 font-medium text-gray-800 text-xs">{u.company_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.subscription_plan === 'annual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.subscription_plan}</span>
                          </td>
                          <td className="px-4 py-3 text-orange-500 text-xs font-semibold">{u.subscription_end}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setExtendTarget(u); setExtendMonths(1); setExtendMsg(''); setTab('users'); }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              <Gift size={11} /> Extend
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                    {users.filter(u => {
                      if (!u.subscription_end || u.subscription_status !== 'active') return false;
                      const diff = (new Date(u.subscription_end).getTime() - Date.now()) / 86400000;
                      return diff >= 0 && diff <= 7;
                    }).length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No subscriptions expiring soon.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ VISITORS TAB ══════════════════ */}
        {tab === 'visitors' && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-sm font-medium text-gray-600">Last</span>
              {[7, 14, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => { setVDays(d); loadVisitors(d); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${vDays === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400'}`}
                >
                  {d}d
                </button>
              ))}
              <button
                onClick={() => loadVisitors(vDays)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {visitorsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : vSummary ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                  <StatCard label="Page Views"       value={vSummary.totalPageviews}  color="text-blue-600"    Icon={Eye} />
                  <StatCard label="Clicks Tracked"   value={vSummary.totalClicks}     color="text-indigo-600"  Icon={MousePointerClick} />
                  <StatCard label="Unique Sessions"  value={vSummary.uniqueSessions}  color="text-gray-800"    Icon={MonitorSmartphone} />
                  <StatCard label="Logged-in Users"  value={vSummary.uniqueUsers}     color="text-green-600"   Icon={Users} />
                  <StatCard label="Landing Views"    value={vSummary.landingPvs}      color="text-orange-600"  Icon={Globe} />
                  <StatCard label="Dashboard Views"  value={vSummary.dashboardPvs}    color="text-purple-600"  Icon={LayoutDashboard} />
                </div>

                {/* Pageviews timeline */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Eye size={14} className="text-blue-500" /> Pageviews over time
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Views</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-400 inline-block" /> Sessions</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 h-20 w-full">
                    {pvTimeline.map((d, i) => {
                      const maxVal = Math.max(...pvTimeline.map(p => p.count), 1);
                      const maxSess = Math.max(...pvTimeline.map(p => p.sessions), 1);
                      return (
                        <div key={i} className="flex-1 flex items-end gap-px group relative h-full">
                          <div className="flex-1 bg-blue-500 rounded-t-sm" style={{ height: `${Math.max(Math.round((d.count / maxVal) * 100), d.count > 0 ? 3 : 0)}%` }} />
                          <div className="flex-1 bg-teal-400 rounded-t-sm" style={{ height: `${Math.max(Math.round((d.sessions / maxSess) * 100), d.sessions > 0 ? 3 : 0)}%` }} />
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                            {d.label}: {d.count} views · {d.sessions} sessions
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                    <span>{pvTimeline[0]?.label}</span>
                    <span>{pvTimeline[pvTimeline.length - 1]?.label}</span>
                  </div>
                </div>

                {/* Top pages + Top clicks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Globe size={14} className="text-orange-400" /> Top Pages
                    </div>
                    <div className="divide-y divide-gray-50">
                      {topPages.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No data yet.</div>}
                      {topPages.map((p, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                          <span className="text-[11px] text-gray-400 w-4 text-right font-medium">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">{p.path}</div>
                            <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${Math.round((p.count / (topPages[0]?.count || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-600 w-10 text-right">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <MousePointerClick size={14} className="text-indigo-400" /> Top Clicked Elements
                    </div>
                    <div className="divide-y divide-gray-50">
                      {topClicks.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No click data yet.</div>}
                      {topClicks.map((c, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                          <span className="text-[11px] text-gray-400 w-4 text-right font-medium">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">{c.label}</div>
                            <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.round((c.count / (topClicks[0]?.count || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-600 w-10 text-right">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                <Eye size={32} className="text-gray-200" />
                <p className="text-sm">No visitor data yet. Data will appear once visitors browse the site.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════ EXTEND MODAL ══════════════════ */}
      {extendTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Give Free Months</h2>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium text-gray-700">{extendTarget.company_name || extendTarget.email}</span>
              {extendTarget.subscription_end && ` · currently expires ${extendTarget.subscription_end}`}
            </p>

            <label className="text-xs font-semibold text-gray-600 mb-2 block">Number of months</label>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 6, 12].map(m => (
                <button
                  key={m}
                  onClick={() => setExtendMonths(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition border ${extendMonths === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400 mb-4 bg-gray-50 rounded-lg p-2.5 flex items-start gap-2">
              <Gift size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <span>
                New expiry: <span className="font-semibold text-gray-700">
                  {(() => {
                    const base = extendTarget.subscription_end && new Date(extendTarget.subscription_end) > new Date()
                      ? new Date(extendTarget.subscription_end)
                      : new Date();
                    base.setMonth(base.getMonth() + extendMonths);
                    return base.toISOString().split('T')[0];
                  })()}
                </span>
                {' '}· Free · logged in payment history
              </span>
            </div>

            {extendMsg && (
              <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${extendMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {extendMsg}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setExtendTarget(null); setExtendMsg(''); }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={extendLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Gift size={14} />
                {extendLoading ? 'Extending…' : `Grant ${extendMonths} Month${extendMonths > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ HISTORY DRAWER ══════════════════ */}
      {historyUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                  <History size={14} className="text-gray-400" /> Payment History
                </div>
                <div className="text-xs text-gray-400">{historyUser.email}</div>
              </div>
              <button onClick={() => setHistoryUser(null)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {historyLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">No payment records.</div>
              ) : (
                <div className="space-y-2">
                  {history.map(s => (
                    <div key={s.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'paid' ? 'bg-green-500' : s.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-800 capitalize">{s.plan}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.status === 'paid' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {s.amount === 0 ? 'Free (admin grant)' : `${s.currency} ${s.amount}`}
                          {s.period_start && s.period_end && ` · ${s.period_start} → ${s.period_end}`}
                        </div>
                        <div className="text-[11px] text-gray-300">{new Date(s.created_at).toLocaleString()}</div>
                        {s.pesapal_tracking_id && (
                          <div className="text-[11px] text-gray-300 truncate">TXN: {s.pesapal_tracking_id}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ DELETE CONFIRM ══════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-base font-bold text-gray-900 text-center mb-1">Delete User?</h2>
            <p className="text-sm text-gray-500 text-center mb-5">
              This will permanently delete <span className="font-semibold text-gray-800">{deleteTarget.email}</span> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
