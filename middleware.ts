import { NextRequest, NextResponse } from 'next/server';

function getToken(req: NextRequest): string | undefined {
  const manual = req.cookies.get('sb-access-token')?.value;
  if (manual) return manual;

  const allCookies = req.cookies.getAll();

  const base = allCookies.find(c => /^sb-.+-auth-token$/.test(c.name));
  if (base) {
    try {
      const parsed = JSON.parse(decodeURIComponent(base.value));
      const token = parsed?.access_token || (Array.isArray(parsed) && parsed[0]?.access_token);
      if (token) return token;
    } catch { return base.value; }
  }

  const chunks = allCookies
    .filter(c => /^sb-.+-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (chunks.length) {
    try {
      const joined = chunks.map(c => c.value).join('');
      const parsed = JSON.parse(decodeURIComponent(joined));
      const token = parsed?.access_token || (Array.isArray(parsed) && parsed[0]?.access_token);
      if (token) return token;
    } catch {}
  }

  return undefined;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = getToken(req);

  const isDashboard = pathname.startsWith('/dashboard');
  const isAdmin = pathname.startsWith('/admin');
  const isSettings = pathname.startsWith('/settings');
  const isRegister = pathname.startsWith('/register');
  const isAuth = pathname.startsWith('/login') || isRegister;

  // Settings: page handles its own auth
  if (isSettings) return NextResponse.next();

  // Not a protected or auth route — skip
  if (!isDashboard && !isAdmin && !isAuth) return NextResponse.next();

  // No token → redirect to login
  if (!token && (isDashboard || isAdmin)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Logged in + login page → redirect to dashboard
  if (token && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Register page: never redirect away (used for subscription upgrades)
  if (isRegister) return NextResponse.next();

  // Token exists — check profile
  if (token && (isDashboard || isAdmin)) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.redirect(new URL('/login', req.url));

      const { data: profile } = await supabase.from('profiles').select('subscription_status, role').eq('id', user.id).single();

      // Admin route: must have admin role
      if (isAdmin && profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Dashboard: must have active subscription (admins bypass)
      if (isDashboard && profile?.role !== 'admin' && profile?.subscription_status !== 'active') {
        const registerUrl = new URL('/register', req.url);
        registerUrl.searchParams.set('reason', 'subscription');
        return NextResponse.redirect(registerUrl);
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/settings/:path*', '/login', '/register'],
};
