'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

interface TourStep {
  target: string;
  title: string;
  body: string;
  placement?: 'right' | 'left' | 'bottom' | 'top';
  pulse?: boolean;
  mobileOnly?: boolean;   // show only on mobile
  desktopOnly?: boolean;  // skip on mobile (sidebar-only elements)
  icon: React.ReactNode;
}

const STEPS: TourStep[] = [
  {
    target: 'nav-tenders',
    title: 'Browse Tenders',
    body: 'Use the sidebar to filter tenders by category — IT, Construction, Medical and more. Click any category to see matching opportunities.',
    placement: 'right',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    target: 'tender-search',
    title: 'Search Tenders',
    body: 'Type keywords here to search across all available tenders, then hit Search or press Enter.',
    placement: 'bottom',
    pulse: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    target: 'tender-list',
    title: 'Generate a Proposal in Seconds',
    body: 'Click the blue "Generate" button on any tender card to instantly generate a professional proposal tailored to that tender.',
    placement: 'right',
    pulse: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    target: 'proposal-panel',
    title: 'Your Generated Proposal',
    body: 'Your proposal appears here on the right. You can refine it by typing instructions in the chat box, then Copy or Download it as a DOCX file.',
    placement: 'left',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    target: 'nav-analyse',
    title: 'Analyse a Tender',
    body: 'Upload or paste a tender document to get a full AI analysis — deadlines, requirements, win strategies, and more.',
    placement: 'right',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    target: 'nav-proposals',
    title: 'My Proposals',
    body: 'All your generated proposals are saved here. View, download as DOCX/PDF, or delete them anytime.',
    placement: 'right',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    target: 'nav-form-filler',
    title: 'Form Filler',
    body: 'Upload a tender form and let AI fill it in automatically using your company profile. Saves hours of repetitive work.',
    placement: 'right',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
        <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
      </svg>
    ),
  },
  {
    target: 'nav-custom',
    title: 'Custom Proposal',
    body: "Don't have a listed tender? Tap the menu (☰) and select Custom Proposal to generate one from any pasted tender text.",
    placement: 'right',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    target: 'profile-widget',
    title: 'Your Profile',
    body: 'Click here to access Settings (add your company name, logo, signature) or to log out. A complete profile makes your proposals much stronger.',
    placement: 'top',
    pulse: true,
    desktopOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

// Mobile-specific steps (shown only on small screens where sidebar is hidden)
const MOBILE_STEPS: TourStep[] = [
  {
    target: 'tender-search',
    title: 'Search Tenders',
    body: 'Type keywords here to search across all available tenders, then tap Search.',
    placement: 'bottom',
    pulse: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    target: 'tender-list',
    title: 'Generate a Proposal',
    body: 'Tap the "Generate" button on any tender card to instantly create a professional proposal. It appears as a sheet from the bottom.',
    placement: 'bottom',
    pulse: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    target: 'tender-search',
    title: 'Menu & More Features',
    body: 'Tap the ☰ menu icon at the top left to open the sidebar. From there you can filter by category, analyse tenders, view proposals, fill forms, and more.',
    placement: 'bottom',
    pulse: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
  },
];

interface Rect { top: number; left: number; width: number; height: number }

const GAP = 10;
const DESKTOP_W = 500;
const TOOLTIP_H = 240;

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // return null if the element is off-screen (e.g. sidebar hidden on mobile)
  if (r.width === 0 && r.height === 0) return null;
  if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return null;
  return { top: r.top - GAP, left: r.left - GAP, width: r.width + GAP * 2, height: r.height + GAP * 2 };
}

function tooltipPosition(rect: Rect, placement: TourStep['placement'], tooltipW: number, tooltipH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 14;
  let top = 0; let left = 0;

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left + rect.width + margin;
      if (left + tooltipW > vw - 10) { left = rect.left - tooltipW - margin; }
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - margin;
      if (left < 10) { left = rect.left + rect.width + margin; }
      break;
    case 'bottom':
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      if (top + tooltipH > vh - 10) { top = rect.top - tooltipH - margin; }
      break;
    case 'top':
      top = rect.top - tooltipH - margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      if (top < 10) { top = rect.top + rect.height + margin; }
      break;
    default:
      top = rect.top + rect.height + margin;
      left = rect.left;
  }

  left = Math.max(10, Math.min(left, vw - tooltipW - 10));
  top  = Math.max(10, Math.min(top,  vh - tooltipH - 10));
  return { top, left };
}

export default function OnboardingTour() {
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [rect, setRect]       = useState<Rect | null>(null);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem('pryrotender_tour_done');
    if (!seen) {
      const t = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
        setVisible(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Update isMobile on resize
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeSteps = isMobile ? MOBILE_STEPS : STEPS;
  const tooltipW    = isMobile ? Math.min(window.innerWidth - 32, 380) : DESKTOP_W;

  const updatePosition = useCallback(() => {
    if (!visible || isMobile) return; // mobile uses bottom sheet — no position needed
    const current = activeSteps[step];
    if (!current) return;
    const r = getRect(current.target);
    if (r) {
      setRect(r);
      setPos(tooltipPosition(r, current.placement || 'right', tooltipW, TOOLTIP_H));
    } else {
      setRect(null);
    }
  }, [step, visible, isMobile, activeSteps, tooltipW]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition, visible]);

  useEffect(() => {
    if (!visible || isMobile) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      updatePosition();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { running = false; if (raf.current) cancelAnimationFrame(raf.current); };
  }, [step, visible, isMobile, updatePosition]);

  // Also get rect for mobile spotlight (just to highlight the element)
  useEffect(() => {
    if (!visible || !isMobile) return;
    const current = activeSteps[step];
    if (!current) return;
    const r = getRect(current.target);
    setRect(r);
  }, [step, visible, isMobile, activeSteps]);

  const dismiss = () => {
    localStorage.setItem('pryrotender_tour_done', '1');
    setVisible(false);
  };

  const next = () => {
    if (step < activeSteps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => { if (step > 0) setStep(s => s - 1); };

  if (!visible) return null;

  const current   = activeSteps[step];
  const isLast    = step === activeSteps.length - 1;
  const totalSteps = activeSteps.length;

  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // ── Shared card content (inline JSX, NOT a component — avoids remount on every render) ──
  const cardContent = (
    <>
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 overflow-hidden" style={{ borderRadius: isMobile ? '12px 12px 0 0' : '6px 6px 0 0' }}>
        <div
          className="h-full bg-gray-400 transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="px-5 pt-5 pb-4">
        {/* Step counter + close */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            Step {step + 1} of {totalSteps}
          </span>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close tour">
            ✕
          </button>
        </div>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-2.5">
          <h3 className="text-base font-bold text-gray-900 leading-snug flex-1">{current.title}</h3>
          <div className="shrink-0 w-16 h-16 rounded-md flex items-center justify-center text-gray-400">
            {current.icon}
          </div>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>
      </div>

      {/* Navigation */}
      <div className="px-5 pb-5 flex items-center justify-between gap-2">
        <button onClick={prev} disabled={step === 0}
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-0 transition">
          ← Back
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {activeSteps.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`rounded-full transition-all ${i === step ? 'w-5 h-2.5 bg-blue-600' : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'}`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <button onClick={next}
          className="text-sm font-semibold px-4 py-2 text-white transition"
          style={{ borderRadius: 4, backgroundColor: '#0084FF' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0070d8')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0084FF')}>
          {isLast ? 'Done' : 'Next →'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Invisible interaction layer — captures backdrop clicks, lets card clicks through ── */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ pointerEvents: 'auto' }}
        onClick={dismiss}
      />

      {/* ── SVG backdrop spotlight — purely visual, no pointer events ── */}
      <svg
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{ pointerEvents: 'none' }}
        width={vw} height={vh}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width={vw} height={vh} fill="white" />
            {rect && (
              <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx={8} fill="black" />
            )}
          </mask>
        </defs>
        <rect width={vw} height={vh} fill="rgba(0,0,0,0.55)" mask="url(#spotlight-mask)" />
        {rect && (
          <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx={8}
            fill="none" stroke="#9ca3af" strokeWidth={2} opacity={0.9} />
        )}
      </svg>

      {/* ── Pulse ring ── */}
      {rect && current.pulse && (
        <div className="fixed z-[10000] pointer-events-none" style={{
          top: rect.top - 4, left: rect.left - 4,
          width: rect.width + 8, height: rect.height + 8,
          borderRadius: 10,
          boxShadow: '0 0 0 0 rgba(59,130,246,0.7)',
          animation: 'tour-pulse 1.8s ease-out infinite',
        }} />
      )}

      {/* ── MOBILE: bottom sheet ── */}
      {isMobile && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[10000] bg-white shadow-[0_-4px_30px_rgba(0,0,0,0.18)] pointer-events-auto"
          style={{ borderRadius: '16px 16px 0 0', border: '1px solid #f3f4f6' }}
          onClick={e => e.stopPropagation()}
        >
          {cardContent}
        </div>
      )}

      {/* ── DESKTOP: floating positioned card ── */}
      {!isMobile && (
        <div
          className="fixed z-[10000] bg-white shadow-2xl flex flex-col pointer-events-auto"
          style={{
            top: pos.top,
            left: pos.left,
            width: DESKTOP_W,
            borderRadius: 6,
            transition: 'top 0.25s ease, left 0.25s ease',
            border: '1px solid #f3f4f6',
          }}
          onClick={e => e.stopPropagation()}
        >
          {cardContent}
        </div>
      )}

      <style>{`
        @keyframes tour-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          70%  { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </>
  );
}
