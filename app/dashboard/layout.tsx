'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'All Tenders', icon: '▦', cat: '' },
  { label: 'IT & Technology', icon: '⬡', cat: 'IT Technology Software' },
  { label: 'Construction', icon: '⬢', cat: 'Construction Infrastructure Building' },
  { label: 'Medical', icon: '⬡', cat: 'Medical Healthcare Hospital' },
  { label: 'Consultancy', icon: '⬡', cat: 'Consultancy Consulting Services' },
  { label: 'Goods & Supply', icon: '⬡', cat: 'Goods Supply Equipment' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [activeNav, setActiveNav] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => setProfile(p));
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    router.push('/login');
  };

  const handleNavClick = (cat: string) => {
    setActiveNav(cat);
    const url = new URL(window.location.href);
    url.searchParams.set('category', cat);
    router.push('/dashboard?' + url.searchParams.toString());
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] overflow-hidden">
      <aside className="w-56 bg-white flex flex-col border-r border-gray-100 shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <Image src="/logo.png" alt="PryroTender" width={130} height={40} className="object-contain" priority />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.cat} onClick={() => handleNavClick(item.cat)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeNav === item.cat ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="text-base leading-none">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg">
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
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        {profile && profile.subscription_status !== 'active' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
            <p className="text-xs text-amber-700 font-medium">Your subscription is inactive. Subscribe to access all features.</p>
            <Link href="/register?plan=monthly" className="text-xs font-semibold text-white bg-amber-500 px-3 py-1 rounded-lg hover:bg-amber-600">Subscribe Now</Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
