/**
 * PryroTender – lightweight client-side analytics tracker.
 *
 * Usage:
 *   initAnalytics({ userId, isAdmin })   // call once per page mount
 *
 * What it does:
 *  - Generates / reuses a session_id stored in sessionStorage (one per browser tab session)
 *  - Fires a 'pageview' event immediately
 *  - Listens for clicks on elements that carry [data-track] attributes
 *  - Posts events to /api/analytics (fire-and-forget, never throws)
 *  - Skips everything if isAdmin === true
 */

const SESSION_KEY = 'pt_sid';

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return crypto.randomUUID();
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

async function send(payload: object) {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // keepalive so the request survives page unload
      keepalive: true,
    });
  } catch {
    // silent – analytics must never break the app
  }
}

let _cleanup: (() => void) | null = null;

export function initAnalytics({ userId, isAdmin }: { userId?: string | null; isAdmin?: boolean }) {
  // Never track admin users
  if (isAdmin) return;
  if (typeof window === 'undefined') return;

  // Clean up any previous listener (e.g. layout re-mounts)
  if (_cleanup) _cleanup();

  const sessionId = getSessionId();
  const base = {
    session_id: sessionId,
    user_id: userId ?? null,
    path: window.location.pathname,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
  };

  // Fire pageview
  send({ event_type: 'pageview', ...base });

  // Click tracking — catches [data-track] elements anywhere in the DOM
  const onClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-track]') as HTMLElement | null;
    if (!el) return;
    const target = el.getAttribute('data-track') || el.innerText?.trim().slice(0, 80) || 'unknown';
    send({
      event_type: 'click',
      ...base,
      path: window.location.pathname, // re-read in case of SPA navigation
      target,
    });
  };

  document.addEventListener('click', onClick, { passive: true });
  _cleanup = () => document.removeEventListener('click', onClick);
}

export function trackClick(target: string, userId?: string | null) {
  if (typeof window === 'undefined') return;
  send({
    event_type: 'click',
    session_id: getSessionId(),
    user_id: userId ?? null,
    path: window.location.pathname,
    target,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
  });
}
