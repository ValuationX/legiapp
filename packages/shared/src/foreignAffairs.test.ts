import { describe, expect, it } from 'vitest';
import { FA_REGIONS, matchRegions, regionPgRegex } from './foreignAffairs.js';

describe('foreign-affairs region matching', () => {
  it('lists Ukraine first and marks it adjacent', () => {
    expect(FA_REGIONS[0]?.key).toBe('ukraine');
    expect(FA_REGIONS[0]?.adjacent).toBe(true);
    expect(FA_REGIONS.find((r) => r.key === 'russia')?.adjacent).toBe(true);
  });

  it('tags the headline Ukraine resolution', () => {
    expect(matchRegions('Day of Solidarity with Ukraine.')).toContain('ukraine');
  });

  it('matches word-stems but not mid-word substrings (china ≠ machina)', () => {
    expect(matchRegions('Relating to the machina apparatus.')).not.toContain('china');
    expect(matchRegions('Trade relations with Taiwan and China.')).toEqual(
      expect.arrayContaining(['taiwan', 'china']),
    );
  });

  it('separates Holocaust/antisemitism from Israel policy', () => {
    expect(matchRegions('California Holocaust Memorial Day.')).toContain('holocaust');
    expect(matchRegions('Human Rights: Gaza.')).toContain('israel');
  });

  it('returns nothing for unrelated text', () => {
    expect(matchRegions('An act relating to vehicle registration fees.')).toEqual([]);
  });

  it('builds a leading-word-boundary Postgres regex', () => {
    expect(regionPgRegex(['ukrain', 'kyiv'])).toBe('(^|[^[:alpha:]])(ukrain|kyiv)');
  });
});
