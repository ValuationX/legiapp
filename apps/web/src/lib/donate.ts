// Master switch for the remaining donation surfaces — the Donate page + route and
// the sidebar/footer "Donate" links. Set to false to hide everything for now; flip
// back to true to restore it. The Ko-fi wiring below stays intact either way.
export const DONATIONS_ENABLED: boolean = false;

// ── Ko-fi configuration — the single source of truth ─────────────────────────
// To CONNECT Ko-fi: set KOFI_USERNAME to the project's Ko-fi handle (the slug in
// ko-fi.com/<handle>, e.g. 'billaid'). That one change lights up the Donate page's
// button + embedded live goal thermometer, and the donation banners site-wide.
// While it's empty, everything degrades gracefully to a "coming soon" / goal-only
// state (no broken links or empty iframes). Ko-fi has no public API, so the live
// progress bar is Ko-fi's own embedded widget.
export const KOFI_USERNAME: string = 'arseniyshafran';

/** Monthly funding goal in USD — the threshold that funds the free Advocacy API. */
export const FUNDING_GOAL = 200;

/** The public Ko-fi page (donation button target). Empty until KOFI_USERNAME is set. */
export const DONATE_URL = KOFI_USERNAME ? `https://ko-fi.com/${KOFI_USERNAME}` : '';

/** Ko-fi's official embeddable widget URL (live goal + donate controls). */
export const KOFI_EMBED_URL = KOFI_USERNAME
  ? `https://ko-fi.com/${KOFI_USERNAME}/?hidefeed=true&widget=true&embed=true&preview=true`
  : '';
