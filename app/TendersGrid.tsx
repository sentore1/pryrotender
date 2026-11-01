/**
 * TendersGrid — async server component shown on the landing page.
 *
 * Pulls live tenders and, where a slug is available in seen_tenders,
 * links each card to its public /tenders/[slug] detail page.
 * Falls back to /register for tenders not yet in the DB.
 */

import Link from 'next/link';
import { scrapeTenders, Tender } from '@/lib/scraper';
import { supabaseAdmin } from '@/lib/supabase';
import { getTenderStatus, formatDeadline } from '@/lib/seo';

async function getSlugsMap(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from('seen_tenders')
      .select('id, slug')
      .in('id', ids)
      .not('slug', 'is', null);
    return new Map((data ?? []).map((r: { id: string; slug: string }) => [r.id, r.slug]));
  } catch {
    return new Map();
  }
}

export async function TendersGrid() {
  let tenders: Tender[] = [];
  try {
    const all = await scrapeTenders('');
    tenders = all.slice(0, 6);
  } catch {
    tenders = [];
  }

  const slugsMap = await getSlugsMap(tenders.map(t => t.id));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tenders.length === 0 ? (
        <p className="text-sm text-gray-400 col-span-2 text-center">No tenders available right now. Check back soon.</p>
      ) : tenders.map((t, i) => {
        const slug = slugsMap.get(t.id);
        const href = slug ? `/tenders/${slug}` : '/register';
        const status = getTenderStatus(t.deadline);
        const isExpired = status === 'expired';
        const isClosingSoon = status === 'closing_soon';

        return (
          <Link key={i} href={href} className="block group">
            <div className="bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col gap-3" style={{borderRadius:'8px'}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 text-white bg-blue-600" style={{borderRadius:'4px'}}>{t.category || 'Tender'}</span>
                  <span className="text-xs font-semibold text-gray-500">{t.organization && t.organization !== 'Not specified' ? t.organization : ''}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 text-gray-500 bg-gray-100" style={{borderRadius:'4px'}}>{t.source}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{t.title}</p>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span className={`text-xs ${isExpired ? 'text-red-500' : isClosingSoon ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                    {isExpired ? 'Closed: ' : 'Deadline: '}
                    <span className="font-medium">{formatDeadline(t.deadline)}</span>
                  </span>
                </div>
                {slug ? (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600 text-white transition" style={{borderRadius:'4px'}}>View Tender →</span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600 text-white transition" style={{borderRadius:'4px'}}>Generate Proposal →</span>
                )}
              </div>
              {/* Hover overlay only for tenders without a public slug yet */}
              {!slug && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{borderRadius:'8px'}}>
                  <span className="px-5 py-2 bg-gray-900 text-white text-xs font-semibold" style={{borderRadius:'4px'}}>Sign up to access</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function TendersSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 p-5 shadow-sm flex flex-col gap-3 animate-pulse" style={{borderRadius:'8px'}}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div className="h-3 w-28 bg-gray-100 rounded" />
            <div className="h-6 w-28 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
