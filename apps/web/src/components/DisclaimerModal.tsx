import { ShieldAlert } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/primitives';

// Bumped to v2 when the notice started covering ads/analytics, so prior users re-accept.
const KEY = 'billaid-disclaimer-accepted-v2';

/** One-time, must-accept notice (research disclaimer + ads/analytics consent),
 *  remembered in localStorage. Links to the Privacy Policy + Terms (open in a new tab
 *  so reading them doesn't dismiss the notice). */
export function DisclaimerModal() {
  const [accepted, setAccepted] = React.useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return true; // if storage is unavailable, don't block the app
    }
  });

  if (accepted) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setAccepted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-popover p-6 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Before you begin</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Bill Aid aggregates public legislative data as an{' '}
          <span className="font-medium text-foreground">informational research aid only</span> — not a replacement
          for human judgment. Verify anything important against the official record before acting on it.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This site shows ads through Google AdSense and uses privacy-friendly analytics (Vercel), which may set or
          read cookies. By continuing you agree to our{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            Terms of Use
          </a>
          .
        </p>
        <Button onClick={accept} className="mt-5 w-full">
          I understand &amp; agree
        </Button>
      </div>
    </div>
  );
}
