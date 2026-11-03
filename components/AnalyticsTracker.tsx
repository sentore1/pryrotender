'use client';
/**
 * Drop this component anywhere in a layout to start tracking.
 * Pass userId + isAdmin so we can skip admin users server-side too.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics } from '@/lib/analytics';

interface Props {
  userId?: string | null;
  isAdmin?: boolean;
}

export default function AnalyticsTracker({ userId, isAdmin }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    // Re-fire on every SPA navigation
    initAnalytics({ userId, isAdmin });
  }, [pathname, userId, isAdmin]);

  return null; // renders nothing
}
