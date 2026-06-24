import { describe, expect, it } from 'vitest';
import { billStatusBucket } from './billStatus.js';

describe('billStatusBucket', () => {
  it('tests terminal/dead states before "passed"', () => {
    expect(billStatusBucket('FAILED TO PASS')).toBe('failed');
    expect(billStatusBucket('Vetoed')).toBe('vetoed');
    expect(billStatusBucket('Chaptered')).toBe('signed');
    expect(billStatusBucket('Approved by the Governor')).toBe('signed');
  });

  it('maps progress states', () => {
    expect(billStatusBucket('Passed')).toBe('passed_chamber');
    expect(billStatusBucket('In committee process')).toBe('in_committee');
    expect(billStatusBucket('In Assembly')).toBe('introduced');
    expect(billStatusBucket('Introduced')).toBe('introduced');
  });

  it('treats stalled/unknown/empty as other', () => {
    expect(billStatusBucket('Two Year Bill')).toBe('other');
    expect(billStatusBucket(null)).toBe('other');
    expect(billStatusBucket('')).toBe('other');
    expect(billStatusBucket('   ')).toBe('other');
  });
});
