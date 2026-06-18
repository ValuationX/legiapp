import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseDat, toPgTextLine, type Row } from './parser.js';

const dir = mkdtempSync(join(tmpdir(), 'legiapp-parser-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function parse(content: string): Promise<Row[]> {
  const file = join(dir, `t-${Math.round(performance.now() * 1000)}-${content.length}.dat`);
  writeFileSync(file, content, 'utf8');
  const rows: Row[] = [];
  await parseDat(file, (r) => {
    rows.push(r);
  });
  return rows;
}

describe('parseDat — PUBINFO .dat format', () => {
  it('parses backtick-enclosed text, bare values, and unquoted NULL', async () => {
    const rows = await parse('`AD03`\t`20252026`\tNULL\t`A`\n');
    expect(rows).toEqual([['AD03', '20252026', null, 'A']]);
  });

  it('treats unquoted NULL as null but quoted `NULL` as the string', async () => {
    const rows = await parse('10\t`NULL`\tNULL\n');
    expect(rows).toEqual([['10', 'NULL', null]]);
  });

  it('unescapes a backslash-escaped backtick inside an enclosed field', async () => {
    const rows = await parse('`a\\`b`\tx\n');
    expect(rows).toEqual([['a`b', 'x']]);
  });

  it('keeps an embedded (escaped) tab inside an enclosed field', async () => {
    const rows = await parse('`a\\\tb`\tx\n'); // backtick, a, backslash, TAB, b, backtick
    expect(rows).toEqual([['a\tb', 'x']]);
  });

  it('keeps an embedded (escaped) newline inside an enclosed field', async () => {
    const rows = await parse('`line1\\\nline2`\ty\n'); // backslash + real newline inside quotes
    expect(rows).toEqual([['line1\nline2', 'y']]);
  });

  it('handles multiple rows and a trailing row with no final newline', async () => {
    const rows = await parse('`a`\t`b`\n`c`\t`d`');
    expect(rows).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('toPgTextLine — COPY text encoding', () => {
  it('encodes null as \\N and escapes tab/newline/backslash', () => {
    expect(toPgTextLine([null, 'x'])).toBe('\\N\tx');
    expect(toPgTextLine(['a\tb'])).toBe('a\\tb');
    expect(toPgTextLine(['a\\b'])).toBe('a\\\\b');
    expect(toPgTextLine(['a\nb'])).toBe('a\\nb');
  });
});
