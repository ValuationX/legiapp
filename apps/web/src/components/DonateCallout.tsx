import { ArrowRight, HeartHandshake, X } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { FUNDING_GOAL } from '@/lib/donate';

/**
 * Permanent, non-dismissible support banner. Rendered atop the Dashboard ("This
 * Week") so it appears for every state — now and any added later — as a standing
 * reminder that the tool is free and donation-supported.
 */
export function DonateBanner() {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HeartHandshake className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Bill Aid is free — help keep it that way</div>
          <p className="text-xs text-muted-foreground">
            Donations fund a free, open advocacy API for charities across every state. Goal: ${FUNDING_GOAL}/month.
          </p>
        </div>
      </div>
      <Link
        to="/donate"
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <HeartHandshake className="h-4 w-4" aria-hidden /> Support
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

// ── Dismissible donation popup (mirrors the disclaimer's modal pattern) ────────
const DKEY = 'billaid-donate-prompt-v1';
const REPROMPT_DAYS = 14; // after dismissal, don't re-prompt for this many days
const DISCLAIMER_KEY = 'billaid-disclaimer-accepted-v2';

function recentlyDismissed(): boolean {
  try {
    const v = localStorage.getItem(DKEY);
    if (!v) return false;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return true; // unknown/old value → treat as dismissed
    return Date.now() - ts < REPROMPT_DAYS * 86_400_000;
  } catch {
    return true; // storage unavailable → don't nag
  }
}

function disclaimerAccepted(): boolean {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === '1';
  } catch {
    return true;
  }
}

/**
 * A donation prompt that pops up once (then snoozes ~14 days after dismissal),
 * shown only after the research/ads disclaimer has been accepted so two modals
 * never stack. Dismissible; the choice is remembered in localStorage.
 */
export function DonatePrompt() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!disclaimerAccepted() || recentlyDismissed()) return;
    const t = window.setTimeout(() => {
      // Don't prompt people who are already on the Donate page.
      if (window.location.pathname.startsWith('/donate')) return;
      setOpen(true);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const snooze = () => {
    try {
      localStorage.setItem(DKEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-xl border bg-popover p-6 shadow-2xl">
        <button
          onClick={snooze}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-primary">
          <HeartHandshake className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Support Bill Aid</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Bill Aid is a free, public tool with no paywall. A small monthly donation funds our mission — a free,
          open advocacy API that pulls legislative data across every state for charities and advocates.
        </p>
        <p className="mt-2 text-sm font-medium">
          Goal: ${FUNDING_GOAL}/month — every dollar gets us there faster.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Link
            to="/donate"
            onClick={snooze}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <HeartHandshake className="h-4 w-4" aria-hidden /> Support Bill Aid
          </Link>
          <button
            onClick={snooze}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
