// Minimal Open States v3 client. Free API key via OPENSTATES_API_KEY (X-API-KEY
// header). All ingestion gated on the key being present — absent → graceful skip.

const BASE = 'https://v3.openstates.org';
const JURISDICTION = process.env.OPENSTATES_JURISDICTION ?? 'California';

export const openStatesKey = () => process.env.OPENSTATES_API_KEY ?? '';
export const hasOpenStatesKey = () => openStatesKey().length > 0;
export const jurisdiction = () => JURISDICTION;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    const res = await fetch(url, {
      headers: { 'X-API-KEY': openStatesKey() },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429 && attempt < 5) {
      await sleep(2000 * (attempt + 1)); // rate-limit backoff
      continue;
    }
    if (!res.ok) throw new Error(`Open States ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return (await res.json()) as T;
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
