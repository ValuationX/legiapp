import { describe, expect, it } from 'vitest';
import { parseBillXml } from './billtext.js';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<caml:MeasureDoc xmlns:caml="http://lc.ca.gov/legalservices/schemas/caml.1#">
  <caml:Description>
    <caml:Title>Day of Solidarity with Ukraine.</caml:Title>
    <caml:DigestText><p>This measure would recognize a Day of Solidarity with Ukraine.</p></caml:DigestText>
  </caml:Description>
  <caml:Bill xmlns="http://www.w3.org/1999/xhtml">
    <caml:Preamble>The people of the State of California do enact as follows:</caml:Preamble>
    <caml:BillSection>SECTION 1. The Legislature stands in solidarity with the people of Ukraine.</caml:BillSection>
  </caml:Bill>
</caml:MeasureDoc>`;

describe('parseBillXml (CAML bill text extraction)', () => {
  it('extracts the Legislative Counsel digest', () => {
    expect(parseBillXml(SAMPLE).digest).toContain('Day of Solidarity with Ukraine');
  });

  it('extracts whole-document body text (incl. resolved clauses) for search recall', () => {
    const { fullText } = parseBillXml(SAMPLE);
    expect(fullText).toContain('solidarity with the people of Ukraine');
    expect(fullText).toContain('do enact as follows');
  });

  it('returns nulls for empty/garbage input', () => {
    expect(parseBillXml('<x/>').digest).toBeNull();
  });
});
