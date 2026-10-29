'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

const DEFAULT_NAV_ITEMS = [
  { label: 'All Tenders', icon: '▦', cat: '' },
  { label: 'IT & Technology', icon: '⬡', cat: 'IT Technology Software' },
  { label: 'Construction', icon: '⬢', cat: 'Construction Infrastructure Building' },
  { label: 'Medical', icon: '⬡', cat: 'Medical Healthcare Hospital' },
  { label: 'Consultancy', icon: '⬡', cat: 'Consultancy Consulting Services' },
  { label: 'Goods & Supply', icon: '⬡', cat: 'Goods Supply Equipment' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [activeNav, setActiveNav] = useState('');
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        setProfile(p);
        if (p?.sidebar_categories?.length) {
          const custom = p.sidebar_categories as string[];
          const items = custom.map((cat: string) => {
            const found = DEFAULT_NAV_ITEMS.find(n => n.cat === cat);
            return found || { label: cat, icon: '⬡', cat };
          });
          setNavItems([DEFAULT_NAV_ITEMS[0], ...items]);
        }
      });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800`;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0];
      if (name.startsWith('sb-')) document.cookie = `${name}=; path=/; max-age=0`;
    });
    router.refresh();
    router.replace('/login');
  };

  const handleNavClick = (cat: string) => {
    setActiveNav(cat);
    setSidebarOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('category', cat);
    router.push('/dashboard?' + url.searchParams.toString());
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <Image src="/logo.png" alt="PryroTender" width={90} height={28} className="object-contain" priority />
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button key={item.cat} onClick={() => handleNavClick(item.cat)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeNav === item.cat ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <span className="text-base leading-none">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 space-y-0.5 border-t border-gray-100">
        <Link href="/dashboard/analyse" onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/dashboard/analyse' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <span>◈</span> Analyse Tender
        </Link>
        <Link href="/dashboard/proposals" onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/dashboard/proposals' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <span>📄</span> My Proposals
        </Link>
        <Link href="/dashboard/form-filler" onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/dashboard/form-filler' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <span>◉</span> Form Filler
        </Link>
        <Link href="/dashboard?custom=1" onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900`}>
          <span>✎</span> Custom Proposal
        </Link>
        <Link href="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg">
          <span>⚙</span> Settings
        </Link>
        {profile && (
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400 truncate">{profile.company_name || profile.email}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {profile.subscription_status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
        )}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
          <span>↩</span> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white flex-col border-r border-gray-100 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white flex flex-col shadow-xl z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 text-xl leading-none">☰</button>
          <Image src="/logo.png" alt="PryroTender" width={80} height={24} className="object-contain" />
        </div>

        {profile && profile.subscription_status !== 'active' && (
          <div className="bg-orange-500 px-4 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-white font-medium">Your subscription is inactive.</p>
            <Link href="/register?plan=monthly" className="text-xs font-semibold text-white bg-amber-500 px-3 py-1 rounded-lg hover:bg-amber-600 shrink-0">Subscribe Now</Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
