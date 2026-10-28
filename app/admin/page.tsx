'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, monthly: 0, annual: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (p?.role !== 'admin') { router.push('/dashboard'); return; }
      loadData();
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.email?.toLowerCase().includes(q) || u.company_name?.toLowerCase().includes(q)
    ));
  }, [search, users]);

  const loadData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*, subscriptions(*)').order('created_at', { ascending: false });
    if (profiles) {
      setUsers(profiles);
      setFiltered(profiles);
      const active = profiles.filter(p => p.subscription_status === 'active');
      const revenue = active.reduce((sum, p) => sum + (p.subscription_plan === 'annual' ? 249 : 29), 0);
      setStats({
        total: profiles.length,
        active: active.length,
        inactive: profiles.filter(p => p.subscription_status !== 'active').length,
        monthly: profiles.filter(p => p.subscription_plan === 'monthly').length,
        annual: profiles.filter(p => p.subscription_plan === 'annual').length,
        revenue,
      });
    }
    setLoading(false);
  };

  const toggleStatus = async (userId: string, current: string) => {
    setActionLoading(userId);
    const newStatus = current === 'active' ? 'inactive' : 'active';
    const updates: any = { subscription_status: newStatus };
    if (newStatus === 'active' && !users.find(u => u.id === userId)?.subscription_end) {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      updates.subscription_end = end.toISOString().split('T')[0];
      updates.subscription_plan = 'monthly';
    }
    await supabase.from('profiles').update(updates).eq('id', userId);
    await loadData();
    setActionLoading(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PryroTender" width={90} height={28} className="object-contain" />
          <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Dashboard</Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total Users', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-green-600' },
            { label: 'Inactive', value: stats.inactive, color: 'text-red-500' },
            { label: 'Monthly', value: stats.monthly, color: 'text-blue-600' },
            { label: 'Annual', value: stats.annual, color: 'text-purple-600' },
            { label: 'Est. Revenue', value: `$${stats.revenue}`, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or company..."
            className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Company', 'Email', 'Plan', 'Status', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.company_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.subscription_plan
                        ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.subscription_plan === 'annual' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>{u.subscription_plan}</span>
                        : <span className="text-gray-400 text-xs">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.subscription_status === 'active' ? 'bg-green-600 text-white' : 'bg-red-100 text-red-600'}`}>
                        {u.subscription_status || 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.subscription_end || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(u.id, u.subscription_status)}
                        disabled={actionLoading === u.id}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg transition disabled:opacity-50 ${u.subscription_status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {actionLoading === u.id ? '...' : u.subscription_status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No users found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
