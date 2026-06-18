// Minimal Open States v3 client. Free API key via OPENSTATES_API_KEY (X-API-KEY
// header). All ingestion gated on the key being present — absent → graceful skip.

const BASE = 'https://v3.openstates.org';
const JURISDICTION = process.env.OPENSTATES_JURISDICTION ?? 'California';

export const openStatesKey = () => process.env.OPENSTATES_API_KEY ?? '';
export const hasOpenStatesKey = () => openStatesKey().length > 0;
export const jurisdiction = () => JURISDICTION;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Open States free tier is ~10 requests/minute — keep a hard gap between every call
// so a bulk import never trips the per-minute limit.
const MIN_GAP_MS = 6500;
let lastReqAt = 0;
async function throttle() {
  const wait = MIN_GAP_MS - (Date.now() - lastReqAt);
  if (wait > 0) await sleep(wait);
  lastReqAt = Date.now();
}

interface Page<T> {
  results: T[];
  pagination?: { page: number; max_page: number; per_page: number; total_items: number };
}

export async function osGet<T = unknown>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, String(v));
  }
  for (let attempt = 0; ; attempt++) {
    try {
      await throttle();
      const res = await fetch(url, {
        headers: { 'X-API-KEY': openStatesKey() },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        // 429 → wait out the per-minute window; 5xx / transient HTML errors → short backoff.
        if (attempt < 6) {
          await sleep(res.status === 429 ? 60_000 : 5_000 * (attempt + 1));
          continue;
        }
        throw new Error(`Open States ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      // transient timeout / network blip — retry a few times before giving up
      const name = (err as Error)?.name;
      if (attempt < 5 && (name === 'TimeoutError' || name === 'AbortError' || name === 'TypeError')) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

/** Yield every item across all pages of a paginated v3 endpoint. */
export async function* paginate<T>(path: string, params: Record<string, unknown>): AsyncGenerator<T> {
  let page = 1;
  for (;;) {
    const data = await osGet<Page<T>>(path, { ...params, page });
    for (const item of data.results ?? []) yield item;
    const maxPage = data.pagination?.max_page ?? 1;
    if (page >= maxPage || (data.results ?? []).length === 0) break;
    page++;
    await sleep(150); // be polite
  }
}

export { JURISDICTION };
export const JURISDICTION_PARAM = () => JURISDICTION;
