'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import OnboardingTour from '@/components/OnboardingTour';

const DEFAULT_NAV_ITEMS = [
  { label: 'All Tenders', cat: '' },
  { label: 'IT & Technology', cat: 'IT Technology Software' },
  { label: 'Construction', cat: 'Construction Infrastructure Building' },
  { label: 'Medical', cat: 'Medical Healthcare Hospital' },
  { label: 'Consultancy', cat: 'Consultancy Consulting Services' },
  { label: 'Goods & Supply', cat: 'Goods Supply Equipment' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [activeNav, setActiveNav] = useState('');
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        setProfile(p);
        if (p?.sidebar_categories?.length) {
          const custom = p.sidebar_categories as string[];
          const items = custom.map((cat: string) => {
            const found = DEFAULT_NAV_ITEMS.find(n => n.cat === cat);
            return found || { label: cat, cat };
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
        <Image src="/logo.png" alt="PryroTender" width={65} height={20} className="object-contain" priority />
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="relative pl-4">
          {/* vertical connecting line */}
          <span className="absolute left-[1.35rem] top-3 bottom-3 w-px bg-gray-200" />
          {navItems.map((item, idx) => (
            <button key={item.cat} onClick={() => handleNavClick(item.cat)}
              data-tour={idx === 0 ? 'nav-tenders' : undefined}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${activeNav === item.cat ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 border ${activeNav === item.cat ? 'bg-white border-white' : 'bg-white border-gray-300'}`} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="px-3 py-2 space-y-0.5 border-t border-gray-100">
        <Link href="/dashboard/analyse" onClick={() => setSidebarOpen(false)}
          data-tour="nav-analyse"
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/dashboard/analyse' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Analyse Tender
        </Link>
        <Link href="/dashboard/proposals" onClick={() => setSidebarOpen(false)}
          data-tour="nav-proposals"
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/dashboard/proposals' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          My Proposals
        </Link>
        <Link href="/dashboard/form-filler" onClick={() => setSidebarOpen(false)}
          data-tour="nav-form-filler"
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === '/dashboard/form-filler' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>
          Form Filler
        </Link>
        <Link href="/dashboard?custom=1" onClick={() => setSidebarOpen(false)}
          data-tour="nav-custom"
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Custom Proposal
        </Link>
        {profile && (
          <div className="relative mx-2 mb-2">
            {profileOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.14)] p-3 z-50">
                <p className="text-xs font-semibold text-gray-800 truncate">{profile.company_name || profile.email}</p>
                <p className="text-xs text-gray-400 truncate mb-2">{profile.email}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.subscription_status === 'active' ? 'bg-green-600 text-white' : 'bg-red-100 text-red-600'}`}>
                  {profile.subscription_status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <div className="mt-3 pt-2 border-t border-gray-100 flex flex-col gap-0.5">
                  <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
            <div onClick={() => setProfileOpen(o => !o)} data-tour="profile-widget" className="flex items-center gap-2 px-3 py-2 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] cursor-pointer" style={{ borderRadius: '4px' }}>
              <div className="w-7 h-7 rounded-full bg-blue-600 hover:bg-gray-400 transition-colors flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(profile.company_name || profile.email || '?')[0].toUpperCase()}
              </div>
              <p className="text-xs font-medium text-gray-700 truncate flex-1">{profile.company_name || profile.email}</p>
              <span className="text-gray-400 text-sm leading-none tracking-widest">···</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
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
    <OnboardingTour />
    </>
  );
}
