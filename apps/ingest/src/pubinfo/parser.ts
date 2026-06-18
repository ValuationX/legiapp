import { createReadStream } from 'node:fs';

export type Row = (string | null)[];

/**
 * Streaming parser for California PUBINFO `.dat` files. Per the official load DDL:
 *   FIELDS TERMINATED BY '\t'  OPTIONALLY ENCLOSED BY '`'  LINES TERMINATED BY '\n'
 *
 * Observed conventions in the real data:
 *   • Text fields are wrapped in backticks; numerics/dates are written bare.
 *   • SQL NULL is the literal unquoted token `NULL` (a quoted `` `NULL` `` is the
 *     string "NULL").
 *   • Inside a backtick-enclosed field, MySQL's default escape (`\`) protects the
 *     enclosure char, the escape char, and any embedded field/line terminators —
 *     so enclosed fields may legitimately contain tabs and newlines.
 *
 * A naive split on '\t' / '\n' therefore breaks on those embedded terminators;
 * this char-level state machine tracks enclosure + escape state across the whole
 * stream (including chunk boundaries) and emits one array of fields per record.
 */
export async function parseDat(
  path: string,
  onRow: (row: Row) => void | Promise<void>,
): Promise<number> {
  const stream = createReadStream(path, { encoding: 'utf8' });

  let row: Row = [];
  let field = '';
  let inQuotes = false;
  let wasQuoted = false;
  let started = false; // any char consumed at this field position yet?
  let escaped = false;
  let count = 0;

  const pushField = () => {
    row.push(wasQuoted ? field : field === 'NULL' ? null : field);
    field = '';
    wasQuoted = false;
    started = false;
  };

  for await (const chunk of stream as AsyncIterable<string>) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i]!;

      if (escaped) {
        // The char after a backslash is taken literally, mapping the few letter
        // escapes MySQL may emit. Escaped actual tabs/newlines arrive here too.
        field += c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c === '0' ? '\0' : c;
        escaped = false;
        started = true;
        continue;
      }

      if (inQuotes) {
        if (c === '\\') {
          escaped = true;
        } else if (c === '`') {
          inQuotes = false;
        } else {
          field += c;
        }
        continue;
      }

      // Outside quotes:
      if (c === '`' && !started) {
        inQuotes = true;
        wasQuoted = true;
        started = true;
      } else if (c === '\t') {
        pushField();
      } else if (c === '\n') {
        pushField();
        await onRow(row);
        row = [];
        count++;
      } else if (c !== '\r') {
        field += c;
        started = true;
      }
    }
  }

  // Trailing record with no final newline.
  if (started || field !== '' || row.length > 0) {
    pushField();
    if (row.length > 0) {
      await onRow(row);
      count++;
    }
  }

  return count;
}

/** Encode a parsed row into a PostgreSQL COPY ... FORMAT text line (no trailing newline). */
export function toPgTextLine(row: Row): string {
  return row
    .map((v) =>
      v === null
        ? '\\N'
        : v
            .replace(/\\/g, '\\\\')
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r'),
    )
    .join('\t');
}
