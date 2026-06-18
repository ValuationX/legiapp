// Source reconciliation primitive. PUBINFO is the working source today; when
// Open States / LegiScan are added, each field arrives from multiple sources and
// this decides the winning value, flags disagreements, and preserves the losers
// so the UI can surface a conflict (the spec's "store both, set a conflict flag").

export interface SourcedValue<T> {
  source: string;
  value: T | null | undefined;
}

export interface Reconciled<T> {
  value: T | null;
  conflict: boolean;
  sources: string[];
  /** Present-but-not-chosen values (only populated when there's a conflict). */
  alternatives: { source: string; value: T }[];
}

/**
 * Reconcile the same field reported by several sources.
 * - null/undefined values are ignored (a source that doesn't know never conflicts).
 * - `priority` lists sources best-first; the highest-priority present value wins.
 * - `conflict` is true when present sources disagree on the value.
 */
export function reconcile<T>(values: SourcedValue<T>[], priority: string[] = []): Reconciled<T> {
  const present = values.filter(
    (v): v is { source: string; value: T } => v.value !== null && v.value !== undefined,
  );
  if (present.length === 0) return { value: null, conflict: false, sources: [], alternatives: [] };

  const distinct = new Set(present.map((p) => JSON.stringify(p.value)));
  const conflict = distinct.size > 1;

  const rank = (s: string) => {
    const i = priority.indexOf(s);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const chosen = [...present].sort((a, b) => rank(a.source) - rank(b.source))[0]!;
  const chosenKey = JSON.stringify(chosen.value);

  return {
    value: chosen.value,
    conflict,
    sources: present.map((p) => p.source),
    alternatives: conflict ? present.filter((p) => JSON.stringify(p.value) !== chosenKey) : [],
  };
}
