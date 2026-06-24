import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { useStateCtx } from '@/lib/state';

// AdSense is loaded ONLY on content-rich pages, and only after the visitor has
// accepted the disclaimer and chosen a state. It is never loaded on the welcome /
// state-picker page, the must-accept disclaimer, the District Map (a tool), Settings,
// the Donate page, or the legal pages — AdSense disallows ads on screens without
// publisher content or used for navigation / alerts. This is what the crawler hits
// first, so gating the load here is what clears the policy violation.

const ADSENSE_CLIENT = 'ca-pub-2504590710091105';
const DISCLAIMER_KEY = 'billaid-disclaimer-accepted-v2';

const CONTENT_PATHS = new Set([
  '/',
  '/bills',
  '/legislators',
  '/leadership',
  '/committees',
  '/calendar',
  '/foreign-affairs',
  '/about',
]);

function isContentRoute(path: string): boolean {
  if (CONTENT_PATHS.has(path)) return true;
  // Detail pages (bills/legislators/committees/votes) carry real content too.
  return /^\/(bills|legislators|committees|votes)\/[^/]+/.test(path);
}

function disclaimerAccepted(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === '1';
  } catch {
    return false;
  }
}

let scriptInjected = false;
function loadAdSense(): void {
  if (scriptInjected || document.getElementById('adsbygoogle-js')) return;
  scriptInjected = true;
  const s = document.createElement('script');
  s.id = 'adsbygoogle-js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
}

/** Side-effect-only: conditionally loads Google AdSense on eligible content pages. */
export function Ads(): null {
  const location = useLocation();
  const { chosen } = useStateCtx();

  React.useEffect(() => {
    const maybeLoad = () => {
      if (chosen && disclaimerAccepted() && isContentRoute(location.pathname)) loadAdSense();
    };
    maybeLoad();
    // Load immediately once the disclaimer is accepted (no navigation needed).
    window.addEventListener('billaid:disclaimer-accepted', maybeLoad);
    return () => window.removeEventListener('billaid:disclaimer-accepted', maybeLoad);
  }, [location.pathname, chosen]);

  return null;
}
