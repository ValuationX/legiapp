import { X } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

// Passive consent + research-disclaimer banner pinned to the bottom — non-blocking,
// so content (and Google's crawler) is never papered over by an alert/interstitial.
// Remembered in localStorage (shared key, so anyone who accepted the old modal won't
// see it again).
const KEY = 'billaid-disclaimer-accepted-v2';

export function ConsentBanner() {
  const [dismissed, setDismissed] = React.useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return true; // storage unavailable → don't nag
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-popover/95 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p>
          Bill Aid is an informational research aid — verify anything important against the official record. By using
          the site you agree to our{' '}
          <Link to="/terms" className="font-medium text-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          . It shows ads (Google AdSense) and uses privacy-friendly analytics.
        </p>
        <button
          onClick={dismiss}
          className="inline-flex shrink-0 items-center gap-1.5 self-end rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:self-auto"
        >
          Got it
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
