import * as React from 'react';
import { useLocation } from 'react-router-dom';

// AdSense is loaded ONLY on content-rich pages — never on the welcome/overview, the
// District Map (a tool), Settings, the Donate page, the legal pages, or 404. AdSense
// disallows ads on screens without publisher content or used for navigation/alerts,
// and this is what the crawler hits, so gating the load here clears the violation.
// (Consent is passive — see ConsentBanner — so no explicit accept-gate is needed.)

const ADSENSE_CLIENT = 'ca-pub-2504590710091105';

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

/** Side-effect-only: loads Google AdSense once the visitor reaches a content page. */
export function Ads(): null {
  const location = useLocation();
  React.useEffect(() => {
    if (isContentRoute(location.pathname)) loadAdSense();
  }, [location.pathname]);
  return null;
}
