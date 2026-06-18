import { describe, expect, it } from 'vitest';
import { tagSubjects } from './tagger.js';

describe('tagSubjects (keyword issue-area tagging)', () => {
  it('returns no tags for empty/irrelevant text', () => {
    expect(tagSubjects('')).toEqual([]);
    expect(tagSubjects(null)).toEqual([]);
    expect(tagSubjects('An act relating to nomenclature.')).toEqual([]);
  });

  it('tags a single clear topic', () => {
    expect(tagSubjects('An act to add Section 1 to the Education Code, relating to pupils.')).toContain('Education');
  });

  it('tags multiple distinct topics from one bill', () => {
    const tags = tagSubjects('Relating to health care for agricultural farm workers and their wages.');
    expect(tags).toEqual(expect.arrayContaining(['Health', 'Agriculture', 'Labor & Employment']));
  });

  it('is case-insensitive and de-duplicates', () => {
    const tags = tagSubjects('HOUSING for the homeless. Affordable housing and tenants.');
    expect(tags.filter((t) => t === 'Housing')).toHaveLength(1);
  });

  it('catches the Ukraine/foreign-affairs case from the search example', () => {
    expect(tagSubjects('A resolution expressing solidarity with the people of Ukraine.')).toContain('Foreign Affairs');
  });
});
