// Key-free subject/issue-area tagging. PUBINFO carries no subject tags and we have
// no Open States key, so we derive coarse issue areas from a curated keyword map
// over each bill's title + digest + body. This is explicitly lower-fidelity than a
// real subject taxonomy (source = 'keyword'), but deterministic and transparent.

export const SUBJECT_RULES: { subject: string; pattern: RegExp }[] = [
  { subject: 'Education', pattern: /\b(school|schools|student|students|pupil|pupils|teacher|teachers|classroom|curriculum|community college|university|universities|k-?12)\b/i },
  { subject: 'Higher Education', pattern: /\b(university of california|california state university|csu\b|uc\b|community college|tuition|cal grant)\b/i },
  { subject: 'Health', pattern: /\b(health|medical|medicaid|medi-cal|hospital|hospitals|physician|patient|patients|disease|prescription|nurse|nursing|behavioral health)\b/i },
  { subject: 'Mental Health', pattern: /\b(mental health|behavioral health|psychiatric|substance use disorder)\b/i },
  { subject: 'Housing', pattern: /\b(housing|tenant|tenants|landlord|rent\b|rental|eviction|affordable housing|homeless|homelessness)\b/i },
  { subject: 'Public Safety', pattern: /\b(crime|criminal|police|peace officer|firearm|firearms|gun\b|sentencing|felony|misdemeanor|incarcerat|parole|probation)\b/i },
  { subject: 'Environment', pattern: /\b(climate|greenhouse gas|emissions|pollution|environmental|carbon|wildfire|conservation|endangered species)\b/i },
  { subject: 'Energy', pattern: /\b(energy|electricity|electrical|utility|utilities|solar|renewable|natural gas|power grid|battery storage)\b/i },
  { subject: 'Transportation', pattern: /\b(transportation|highway|highways|vehicle|vehicles|traffic|transit|rail\b|railroad|caltrans|bicycle|pedestrian)\b/i },
  { subject: 'Taxation', pattern: /\b(taxation|taxes|tax credit|sales tax|income tax|property tax|revenue and taxation|exemption from tax)\b/i },
  { subject: 'Labor & Employment', pattern: /\b(employee|employees|employer|worker|workers|wage|wages|labor\b|collective bargaining|workplace|unemployment insurance|workers' compensation)\b/i },
  { subject: 'Elections', pattern: /\b(election|elections|ballot|voter|voters|voting|candidate|candidates|redistricting|campaign finance)\b/i },
  { subject: 'Agriculture', pattern: /\b(agriculture|agricultural|farm|farms|farmer|farmers|crop|crops|livestock|pesticide|pesticides|cannabis cultivation)\b/i },
  { subject: 'Immigration', pattern: /\b(immigrant|immigrants|immigration|undocumented|noncitizen)\b/i },
  { subject: 'Veterans & Military', pattern: /\b(veteran|veterans|military|national guard|armed forces)\b/i },
  { subject: 'Technology & Privacy', pattern: /\b(privacy|personal information|data breach|artificial intelligence|automated decision|social media platform|internet)\b/i },
  { subject: 'Budget & Appropriations', pattern: /\b(budget act|appropriation|appropriations|general fund|fiscal year)\b/i },
  { subject: 'Insurance', pattern: /\b(insurance|insurer|insured|policyholder|premium)\b/i },
  { subject: 'Water', pattern: /\b(water supply|drinking water|groundwater|drought|watershed|water district|water quality)\b/i },
  { subject: 'Civil Rights', pattern: /\b(discrimination|civil rights|equal protection|hate crime|reproductive)\b/i },
  { subject: 'Foreign Affairs', pattern: /\b(ukrain|russia|putin|kremlin|holodomor|israel|jewish|antisemit|holocaust|hamas|gaza|iran|tehran|taiwan|china|chinese|beijing|uyghur|uighur|tibet|genocide|war crime|foreign country|state sponsor of terror)/i },
];

/** Return the distinct issue-area subjects a bill's text matches (may be empty). */
export function tagSubjects(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const { subject, pattern } of SUBJECT_RULES) {
    if (pattern.test(text)) found.add(subject);
  }
  return [...found];
}
