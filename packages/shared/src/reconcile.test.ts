import { describe, expect, it } from 'vitest';
import { reconcile } from './reconcile.js';

describe('reconcile', () => {
  it('returns null with no conflict when all sources are empty', () => {
    const r = reconcile([
      { source: 'pubinfo', value: null },
      { source: 'openstates', value: undefined },
    ]);
    expect(r).toEqual({ value: null, conflict: false, sources: [], alternatives: [] });
  });

  it('ignores missing values (a source that does not know never conflicts)', () => {
    const r = reconcile([
      { source: 'pubinfo', value: 'Chaptered' },
      { source: 'openstates', value: null },
    ]);
    expect(r.value).toBe('Chaptered');
    expect(r.conflict).toBe(false);
    expect(r.sources).toEqual(['pubinfo']);
  });

  it('agrees without conflict when sources match', () => {
    const r = reconcile([
      { source: 'pubinfo', value: 'In Committee Process' },
      { source: 'legiscan', value: 'In Committee Process' },
    ]);
    expect(r.conflict).toBe(false);
    expect(r.alternatives).toHaveLength(0);
  });

  it('flags a conflict and keeps the losing values', () => {
    const r = reconcile([
      { source: 'openstates', value: 'Passed' },
      { source: 'pubinfo', value: 'Chaptered' },
    ]);
    expect(r.conflict).toBe(true);
    // No priority given → first present value wins, the other is kept as an alternative.
    expect(r.value).toBe('Passed');
    expect(r.alternatives.map((a) => a.value)).toContain('Chaptered');
  });

  it('respects source priority when choosing the winner', () => {
    const r = reconcile(
      [
        { source: 'openstates', value: 'Passed' },
        { source: 'pubinfo', value: 'Chaptered' },
      ],
      ['pubinfo', 'legiscan', 'openstates'],
    );
    expect(r.value).toBe('Chaptered'); // pubinfo wins per priority
    expect(r.conflict).toBe(true);
  });
});
