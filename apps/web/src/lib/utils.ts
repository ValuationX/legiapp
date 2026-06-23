import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Return `url` only if it is a safe http(s) link, else null. Data-driven hrefs
 * (calendar sources, legislator contact links) come from scraped ingest, so this
 * blocks `javascript:` / `data:` URLs from ever becoming a click-to-execute XSS sink.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const proto = new URL(url, window.location.origin).protocol;
    return proto === 'http:' || proto === 'https:' ? url : null;
  } catch {
    return null;
  }
}
