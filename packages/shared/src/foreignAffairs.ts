// Foreign-affairs regions for the Ukraine tracker. Ukraine first; `adjacent` marks
// the "Ukraine & adjacent" group (Ukraine + Russia, the invasion). Stems were
// curated by a 7-agent relevance pass and are matched over a bill's TITLE + DIGEST
// only (not the full body) for precision — incidental country mentions live in the
// body and are deliberately excluded.
export interface FaRegion {
  key: string;
  label: string;
  adjacent: boolean;
  stems: string[];
}

export const FA_REGIONS: FaRegion[] = [
  { key: 'ukraine', label: 'Ukraine', adjacent: true, stems: ['ukrain', 'kyiv', 'donbas', 'donetsk', 'luhansk', 'zelensky', 'zelenskyy', 'holodomor'] },
  { key: 'russia', label: 'Russia', adjacent: true, stems: ['russia', 'russian', 'putin', 'moscow', 'kremlin'] },
  { key: 'israel', label: 'Israel & Jewish Affairs', adjacent: false, stems: ['israel', 'jewish', 'hamas', 'gaza'] },
  { key: 'holocaust', label: 'Holocaust & Antisemitism', adjacent: false, stems: ['holocaust', 'antisemit', 'anti-semit'] },
  { key: 'iran', label: 'Iran', adjacent: false, stems: ['iran', 'tehran'] },
  { key: 'china', label: 'China', adjacent: false, stems: ['china', 'chinese', 'beijing', 'uyghur', 'uighur', 'hong kong', 'tibet'] },
  { key: 'taiwan', label: 'Taiwan', adjacent: false, stems: ['taiwan'] },
  { key: 'general', label: 'Genocide & Human Rights', adjacent: false, stems: ['genocide', 'war crime', 'state sponsor of terror'] },
];

export const FA_REGION_BY_KEY: Map<string, FaRegion> = new Map(FA_REGIONS.map((r) => [r.key, r]));

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);
}

/** Postgres POSIX regex (leading word boundary) matching any of a region's stems. */
export function regionPgRegex(stems: string[]): string {
  return `(^|[^[:alpha:]])(${stems.map(escapeRe).join('|')})`;
}

// ─── Alignment scoring ───────────────────────────────────────────────────────
// Categorize a legislator's level of alignment with an issue (Ukraine, etc.) from
// how they engaged: leading a measure (author) counts most, then measures that
// actually passed, then coauthorships.
export type AlignmentLevel = 'champion' | 'strong-ally' | 'ally' | 'supporter';

export const ALIGNMENT_LABEL: Record<AlignmentLevel, string> = {
  champion: 'Champion',
  'strong-ally': 'Strong Ally',
  ally: 'Ally',
  supporter: 'Supporter',
};

export function alignmentScore(authored: number, coauthored: number, passed: number): number {
  return authored * 3 + coauthored + passed * 2;
}

export function alignmentLevel(authored: number, score: number): AlignmentLevel {
  if (authored >= 1) return 'champion'; // led legislation on the issue
  if (score >= 6) return 'strong-ally';
  if (score >= 3) return 'ally';
  return 'supporter';
}

/** JS equivalent (for tests): which region keys does this title+digest text match? */
export function matchRegions(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const r of FA_REGIONS) {
    const re = new RegExp(`(^|[^a-z])(${r.stems.map(escapeRe).join('|')})`, 'i');
    if (re.test(text)) out.push(r.key);
  }
  return out;
}
