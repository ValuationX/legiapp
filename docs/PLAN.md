# Enhancement Round 3 — Implement the Full Roadmap

## Context
The user wants **every** remaining roadmap item (from the round-2 audit) implemented, using only **free** data sources. A grounded 4-dimension code audit + data-source verification found that most remaining features already have schema/API/UI scaffolding — they're blocked on (a) data population and (b) a few new subsystems (auth, calendar, alerts). Verified free sources: **Open States** (free key via `X-API-KEY`; also no-key bulk CSV at `data.openstates.org`), **LegiScan** (free key, 30k/mo, bulk datasets), CA Senate/Assembly **deadline ICS** files, and chamber member/committee pages (scrape). Statements have **no** free API → best-effort scrape + CalMatters link only.

**One manual step:** paste a free `OPENSTATES_API_KEY` (and optional `LEGISCAN_API_KEY`) into `.env` — unlocks real bill subjects + cross-source conflict flags. Everything else works key-free; key-dependent steps skip gracefully and have no-key fallbacks.

**Assumptions** (no SSO/multi-tenant per spec non-goals): auth = email+password (bcrypt) + JWT, multiple users each with their own watchlist/alerts; email = nodemailer with configurable free SMTP (dev console/Ethereal fallback).

## Phase A — Quick wins & hardening (no dependencies)
- **Security**: restrict CORS to the web origin; constant-time compare + non-default token on `POST /api/ingest/refresh` ([server.ts](apps/api/src/server.ts), [routes/misc.ts](apps/api/src/routes/misc.ts)).
- **DB pool**: explicit `max` + saturation logging; `/api/health` pings the DB ([apps/api/src/db.ts](apps/api/src/db.ts)).
- **Subject filter UI** on Bills (wire the existing `?subject=` param + facet list) ([Bills.tsx](apps/web/src/pages/Bills.tsx), [routes/bills.ts](apps/api/src/routes/bills.ts)).
- **Vote codes**: map `absent`/`not-voting` distinctly from `other` ([normalize.ts](apps/ingest/src/pubinfo/normalize.ts); inspect `raw.bill_detail_vote_tbl.vote_code`).
- **Fuzzy vote/sponsor matching**: match on first+last+chamber + `pg_trgm` fallback so the ~5% unattributed votes / ~6% sponsorships link ([normalize.ts](apps/ingest/src/pubinfo/normalize.ts) `leg_by_name`).
- **Map**: current-vs-proposed `boundarySet` toggle ([Map.tsx](apps/web/src/pages/Map.tsx)).

## Phase B — Free-source data enrichment
New `apps/ingest/src/openstates/` adapter (key from env, graceful skip if absent):
- **Bill subjects** → `bill_subject`: paginate `/bills?jurisdiction=ca`, match by identifier+session, insert `subject[]`. No-key fallback: keyword tagger over `full_text`.
- **Contact + seniority/terms** → `legislator`: primary = scrape chamber member pages (no key, extend [scrape/enrich.ts](apps/ingest/src/scrape/enrich.ts)); fill from Open States `/people?include=offices`.
- **Reelection / electoral timing** → `legislator` (new `next_election_year`, `term_end`, term-limit context): compute **deterministically** in [normalize.ts](apps/ingest/src/pubinfo/normalize.ts), no external source — Assembly = next even year (2026); Senate by district parity (**even**-numbered districts up in gubernatorial years 2026/2030, **odd** in presidential 2028/2032); term = 4yr Senate / 2yr Assembly; note Prop 28 (12-yr total limit). UI: an "Up for reelection 2026" badge on the profile + gallery, and a "facing reelection" filter on the Legislators page. (Verified: even Senate districts are the 2026 cohort.)
- **Committee rosters + chairs** → `committee_membership`: **primary = chamber committee-page scraper** (assembly.ca.gov/committees, senate.ca.gov/committees) because Open States CA committees are experimental; cross-check with Open States. Remove the "roster not synced" placeholder ([CommitteeDetail.tsx](apps/web/src/pages/CommitteeDetail.tsx)).
- **Reconciliation**: ingest Open States (+ optional LegiScan) bill status/party as a 2nd source; run through the existing tested `reconcile()` ([reconcile.ts](packages/shared/src/reconcile.ts)) to set `conflict=true` + store alternatives; surface in the UI source/conflict badge.

## Phase C — Calendar & deadlines (spec area 5)
- Ingest `apps/ingest/src/calendar/`: parse Senate ICS + Assembly ICS/Outlook (`ical` npm) → `calendar_event` (categorize type: intro/committee/fiscal/crossover/floor/governor, set `deadlineFlag`).
- **Election calendar** (the user's reelection/deadline ask): add 2026 statewide election dates as `calendar_event` with `type='election'` — primary **Jun 2 2026**, general **Nov 3 2026**, candidate **filing/declaration deadline Mar 6 2026**, nomination opens Feb 9, voter-reg deadline May 18 — curated from the CA Secretary of State calendar (`sos.ca.gov/elections`; HTML/PDF, no API, ~8 stable dates). These are the electoral "influence windows".
- API `GET /api/calendar` (filters: type incl. `election`, deadline_flag, range) ([routes/calendar.ts]).
- Web `/calendar` page (legislative **and** election deadlines + "upcoming deadlines" list) + sidebar nav + a dashboard deadlines panel that includes the nearest election milestones.

## Phase D — Personalization: auth → watchlist → alerts (spec area 7)
- **Auth** ([routes/auth.ts], [apps/api/src/auth.ts]): email+password (bcrypt), JWT cookie, `/register`/`/login`/`/me`; add `saved_filter` table (`app_user`/`watchlist`/`alert` already in [schema.ts](packages/db/src/schema.ts)).
- **Watchlist + saved filters**: CRUD routes; "Follow" buttons on bill/legislator/committee detail; `/watchlist` page; persisted saved filters; **personalize "This Week"** to followed items ([routes/misc.ts](apps/api/src/routes/misc.ts) dashboard).
- **Alerts**: alert CRUD UI + a **trigger-checker** in [scheduler.ts](apps/ingest/src/scheduler.ts) (bill advanced via `bill_action`, vote scheduled via `committee_hearing`, deadline approaching via `calendar_event`) → email via nodemailer (free SMTP; dev console fallback). Model already extends to SMS.

## Phase E — Statements (spec area 3, best-effort)
- `apps/ingest/src/scrape/statements.ts`: best-effort scrape of member press-release pages → `statement` (keyword topic tags); mark coverage sparse; link to CalMatters Digital Democracy. API `/api/legislators/:id/statements` + a profile section.

## Phase F — Analytics & content depth
- **Voting analytics**: `GET /api/legislators/:id/voting-summary` (counts, party-alignment %, divergence bills) + Recharts on the profile.
- **Bill text viewer + diff**: `GET /api/bills/:id/versions`, inline `full_text` viewer + amendment diff (diff-match-patch); derive concise titles for resolutions.

## Phase G — Quality & ops hardening
- **API integration tests** (Vitest vs a seeded test DB) for every route.
- **Bounded payloads**: cap nested `json_agg` arrays in detail routes + "see all" sub-endpoints.
- **Ingest delta sync** (LegiScan `change_hash`) + transactional/swap-table refresh (no empty-DB-on-failure).
- **Scheduler** retry/backoff + structured logging + failure notification.
- **CSV/Excel export** on list pages (honoring filters).
- **Accessibility + mobile**: ARIA landmarks/labels, skip link, table captions, mobile card views.

## Build order & verification
Execute A → B → C → D → E → F → G (each independently shippable). After each phase run `npm run typecheck` + `npm test` + targeted checks, e.g.: B → committee detail shows a roster with a flagged chair; C → `/api/calendar` returns deadlines and `/calendar` renders; D → register → login → follow a bill → see it in "This Week" → get an alert in the dev inbox; F → profile shows alignment % and a bill diff. `npm run db:start` first (Windows 487 retry already handled); add an `openstates`/`calendar`/`statements` ingest CLI command per adapter.

## Open risks
- Open States CA **committees** may be empty → rosters lead with the chamber scraper (no key).
- **Statements** free coverage is partial (~60–70%) → marked sparse, never implied complete.
- **Alert emails** need a free SMTP cred for real delivery (dev fallback works without one).

---

> **Below: Round 2 (shipped).**

# Enhancement Round 2 — Full-text Search, Member UX, District Map

## Context
The vertical slice shipped and runs on real CA data. The user asked for three concrete improvements:

1. **Search misses content.** Searching "Ukraine" returns too few bills because search only indexes a bill's *identifier + short title* (`BILL_VERSION_TBL.SUBJECT`). Bills that mention Ukraine only in their digest/body are invisible. **Verified:** bill text lives in CAML XML `.lob` files (not yet ingested) — each has `<caml:DigestText>` (Legislative Counsel's Digest) and a `<caml:Bill>…<caml:BillSection>` body.
2. **Member presentation** should be more polished (photo gallery, chamber makeup), and senators currently have no photos.
3. **District map** — an interactive CA map; clicking a location shows the Senate **and** Assembly member for that area.

**Decisions (confirmed with user):** index **digest + full bill text**; map uses **real geographic tiles** (OpenStreetMap); **scrape Senate photos** with an initials-avatar fallback.

## 1. Full-text bill search (fixes the "Ukraine" gap)
**Ingest** — new `apps/ingest/src/pubinfo/billtext.ts`:
- For each bill's latest version, extract its LOB (`BILL_VERSION_TBL_<latest_version_id>.lob`) from the cached archive — add a LOB extractor alongside `extractDatFiles` in [download.ts](apps/ingest/src/pubinfo/download.ts). Only latest-version per bill (~5,000 files), not all 194k LOBs.
- Parse the CAML XML with **cheerio** (already a dep): text of `caml\:DigestText` → `digest`; text under `caml\:Bill` (tags stripped, whitespace collapsed) → `full_text`.
- Set `bill.summary = digest` (richer than today's title-dup), plus new `bill.digest`, `bill.full_text`. Run as a step inside `runPubinfo` after normalize ([run.ts](apps/ingest/src/pubinfo/run.ts)).

**Schema** ([packages/db/src/schema.ts](packages/db/src/schema.ts)) — add `digest text`, `full_text text` to `bill`; add a **weighted generated tsvector + GIN index** via a hand-authored SQL migration (drizzle-kit doesn't emit GENERATED tsvector cleanly):
```sql
ALTER TABLE bill ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(identifier,'')||' '||coalesce(title,'')),'A') ||
  setweight(to_tsvector('english', coalesce(digest,'')),'B') ||
  setweight(to_tsvector('english', coalesce(full_text,'')),'C')) STORED;
CREATE INDEX bill_search_idx ON bill USING gin (search_tsv);
```

**API** — in [bills.ts](apps/api/src/routes/bills.ts) and [misc.ts](apps/api/src/routes/misc.ts): when `q` is present, match `search_tsv @@ websearch_to_tsquery('english',$q)`, order by `ts_rank`, and return a `ts_headline(...)` snippet. Add `matchSnippet?: string` to `BillSummary` in [schemas.ts](packages/shared/src/schemas.ts).

**Web** — show the match snippet under bill results in [Bills.tsx](apps/web/src/pages/Bills.tsx) + [SearchPalette.tsx](apps/web/src/components/SearchPalette.tsx); show the Digest (and a collapsible full text) on [BillDetail.tsx](apps/web/src/pages/BillDetail.tsx).

## 2. Member UX + Senate photos
**Ingest** — extend [enrich.ts](apps/ingest/src/scrape/enrich.ts): scrape the `senate.ca.gov/senators` index page for member photo thumbnails (one page, not 40 sites), match by district → `photo_url`; per-senator try/catch with null fallback (UI → initials avatar via existing `MemberAvatar`). Polite `SCRAPE_DELAY_MS`.
**Web** — [Legislators.tsx](apps/web/src/pages/Legislators.tsx): add a **gallery (photo-card) view** with a gallery/table toggle (default gallery) and a per-chamber **party-composition bar**. Polish [LegislatorDetail.tsx](apps/web/src/pages/LegislatorDetail.tsx) header (large photo, party accent, leadership, committee + vote-count summary). Reuse `MemberAvatar`/`PartyBadge` from [common.tsx](apps/web/src/components/common.tsx).

## 3. District map
**Ingest** — new `apps/ingest/src/districts/run.ts` (separate `districts` CLI command): download Assembly (SLDL) + Senate (SLDU) GeoJSON from the **CA State Geoportal** ArcGIS REST (`?f=geojson`); fallback to Census TIGER `tl_2024_06_sldl/sldu.zip` converted with **mapshaper** (npm, no GDAL) and simplified ~30% (→ ~1–3 MB). Populate the existing `district` table (chamber, number from `SLDLST`/`SLDUST`→int, geojson), set `current_legislator_id` by (chamber, number).
**API** — `GET /api/districts/:chamber` → GeoJSON FeatureCollection; each feature's `properties` embeds the member summary (id, name, party, photoUrl) so clicks render without extra calls.
**Web** — new `/map` page (+ sidebar nav): **react-leaflet** + OSM tile layer; two GeoJSON layers (Assembly/Senate) with a toggle, districts shaded by the member's party (colorblind-safe palette). On map click, use **@turf/boolean-point-in-polygon** against both layers to resolve the Senate *and* Assembly district at that point and show a side panel with both members (cards linking to profiles). New deps: web `react-leaflet leaflet @types/leaflet @turf/boolean-point-in-polygon`; ingest `mapshaper`.

## Build order
1. **Search** (schema → LOB extract/parse → API FTS + snippets → web). Gate: `/api/bills?q=Ukraine` returns materially more than title-only matches, with snippets.
2. **District map** (GeoJSON ingest → district table → API → /map). Gate: 40 SLDU + 80 SLDL features; clicking the map shows both reps.
3. **Member UX** (Senate photos → gallery + composition + profile polish).

## Verification
- `npm run db:start` first (portable Postgres gets reaped in this sandbox). `npm run ingest` (now also pulls bill text), then `npm run ingest -- districts`; confirm `bill.full_text` populated and `district` has 120 rows.
- **Search:** `curl '/api/bills?q=Ukraine'` → ranked bills with snippets; compare count vs `title ILIKE '%ukraine%'`.
- **Map:** open `/map`, toggle chambers, click the LA area → shows that area's Senator + Assemblymember.
- **Members:** gallery shows Assembly photos + best-effort Senate photos (avatar fallback); composition bar matches 60D/19R etc.
- `npm test` (add a CAML digest/text extraction unit test), `npm run typecheck`, `npm run build -w @legiapp/web`.

---

> **Below: the original vertical-slice plan (shipped) — kept for reference.**

# California Legislature Tracker — Implementation Plan

## Context

Greenfield build (working dir `C:\Users\arsen\Downloads\LegiApp` is empty, not a git repo). Goal: a polished, production-quality MVP dashboard for **advocacy orgs & lobbyists** to track the **California State Legislature** (Assembly + Senate) on **real data**. The actionable question it must answer fast: *"Who controls this bill's fate, what's their position, and what's my window to influence it?"*

The original spec is a 9-phase, multi-week build. Rather than scaffold all 9 features thinly, we ship a **polished vertical slice on real data first**, then extend along a staged roadmap. The architecture is built for the full spec from day one (provenance columns, source reconciliation hooks, PostGIS-ready DB) so later phases don't require a rewrite.

### Decisions locked with the user
- **Scope first:** Vertical slice — legislators + bills + votes + committees, member & bill detail pages, global search, and a real "This week" dashboard. Maps, statements, watchlist/alerts come in later phases.
- **Data:** **PUBINFO-first.** California's official bulk download (`downloads.leginfo.legislature.ca.gov`) is the backbone — no API key, authoritative, and (unlike Open States v3, whose votes/committees are currently "experimental") it contains **individual roll-call votes**. Open States / LegiScan become optional cross-check sources in a later reconciliation phase.
- **Runtime:** Docker Desktop available → docker-compose with Postgres + PostGIS exactly as spec'd.
- **Backend:** Node/TypeScript across the whole stack.

### Key research findings that shape the design
| Source | Role | Notes |
|---|---|---|
| **PUBINFO bulk** (`downloads.leginfo.legislature.ca.gov`) | PRIMARY | Tab-delimited `.dat` + `.lob`; MySQL `capublic` schema in `pubinfo_load.zip`. Daily/annual zips. Has bills, history, **individual votes**, analyses, hearings. CA officially recommends this over scraping. |
| **Open States v3** | LATER (cross-check) | Free key (`X-API-Key`). Votes & committees flagged experimental for CA → unreliable for our core data now. |
| **LegiScan** | LATER (backup) | Free key, 30k/mo, `getRollCall`, `change_hash` sync. |
| **Census TIGER 2024** | LATER (maps) | `tl_2024_06_sldu.zip` (40 Senate) + `tl_2024_06_sldl.zip` (80 Assembly); CA Geoportal has pre-made GeoJSON. |
| **Chamber sites** | NOW (enrichment) | assembly.ca.gov has stable photo URLs (`webapi.assembly.ca.gov/.../assembly_member_<district>.jpg`); committee rosters + leadership are scrape-only. |
| **CalMatters Digital Democracy** | LATER (best-effort) | No public API; scrape-only/fragile. Genuinely "if accessible." |

**Hard rule from spec:** never invent data. Unknown fields render as explicitly missing. Every bill/vote/member record carries `source` + `last_verified` (+ `conflict` once multi-source).

---

## Architecture

Monorepo (npm/pnpm workspaces), single language (TypeScript):

```
LegiApp/
  docker-compose.yml            # db (postgis), api, web, ingest
  .env.example                  # DB url, scrape rate limits, (later) API keys
  README.md
  packages/
    db/         # Drizzle schema + migrations (shared by api & ingest)
    shared/     # shared zod schemas + inferred TS types (api <-> web contract)
  apps/
    api/        # Fastify REST API + zod validation
    web/        # React + Vite + Tailwind + shadcn/ui
    ingest/     # ETL worker: PUBINFO downloader/parser/normalizer + chamber scraper + scheduler
```

**Stack choices & rationale**
- **DB access: Drizzle ORM** — SQL-first (fits heavy ETL + `COPY`), great TS types, and custom-type support for PostGIS geometry in the later map phase. (Prisma's weak geometry story is why we avoid it here.)
- **API: Fastify + zod** — fast, TS-native; REST (not tRPC) for extensibility per the "could extend to other states" goal. Request/response types shared via `packages/shared` so we still get end-to-end type safety without coupling.
- **Frontend: React + Vite + Tailwind + shadcn/ui**, React Router, **TanStack Query** (server state), **TanStack Table** (dense data grids), **Recharts** (vote breakdowns), **cmdk** (⌘K global search). Recharts/MapLibre reserved for later chart/map needs.
- **DB image: `postgis/postgis:16-3.4`** now, even though geometry is unused in the slice — avoids a migration churn when maps land.

---

## Data sources & ingestion strategy (the crux)

### A. PUBINFO ETL (`apps/ingest`) — the backbone
1. **Download:** fetch `pubinfo_2025.zip` (annual seed for the 2025–2026 session, ~950 MB) into a cached volume; daily refresh via `pubinfo_daily_<Day>.zip`. Also fetch `pubinfo_load.zip` (the DDL).
2. **Read the real schema:** unzip `pubinfo_load.zip` and parse the `CREATE TABLE` DDL (`bill_tbl.sql`, `bill_history_tbl.sql`, `bill_detail_vote_tbl.sql`, `legislator_tbl.sql`, etc.) to get **exact column orders** for each `.dat` file. **Do not hardcode columns from memory** — drive the parser from the DDL.
3. **Parse `.dat`:** stream tab-delimited rows (no header), handle nulls/escaping per the `pubinfo_Readme.pdf` conventions; load verbatim into `raw_pubinfo.<table>` staging tables (provenance/auditability).
4. **Normalize** staging → internal schema: `bill`, `bill_action`, `sponsorship`, `vote_event` (from `BILL_SUMMARY_VOTE_TBL`), `vote_record` (from `BILL_DETAIL_VOTE_TBL`), `legislator` (spine from `LEGISLATOR_TBL`), `committee_hearing`. Map CA action/status codes → readable status + `current_location`. Map vote codes → `yea|nay|abstain|absent`.
5. **LOB handling:** ingest titles/summaries from `BILL_VERSION_TBL`. **Defer full bill-text/analysis `.lob` parsing** to a later phase (slice needs title/summary/status/history/votes, not full text).

### B. Member enrichment scraper (`apps/ingest`) — joins by district number
`LEGISLATOR_TBL` is the vote-linking spine (name/party/district/house). Enrich each member by **district number** (stable join key) from official chamber pages:
- **Photos:** Assembly stable URL pattern; Senate member-page scrape.
- **Contact, seniority, term dates:** member directory pages.
- **Committee rosters + chairs** and **leadership roles** (Speaker Rivas, Senate Pro Tem Limón, floor/minority leaders, whips): scrape committee + leadership pages → `committee`, `committee_membership`, `leadership_role`.
- Polite rate-limiting + on-disk cache; any field that can't be resolved is left **explicitly null/missing** (rendered as such), never fabricated.

### C. Scheduler & manual refresh
- In-process **node-cron** in the ingest worker: daily PUBINFO sync + weekly enrichment re-scrape.
- **Manual "refresh now":** `POST /api/ingest/refresh` (and an ingest CLI) to trigger a run on demand.

---

## Data model (Postgres via Drizzle, in `packages/db`)

Normalized internal schema + provenance on every record. **Created now (core), populated in the slice:**
- `legislator` (id, full_name, first_name, last_name, party, chamber, district, photo_url, email, phone, office, seniority, term_start, term_end, **source, last_verified, conflict**)
- `leadership_role` (id, legislator_id, role, chamber, start_date, end_date, source)
- `committee` (id, name, chamber, type, source) · `committee_membership` (committee_id, legislator_id, role[chair|vice|member], source)
- `bill` (id, session, identifier, measure_type, title, summary, status, current_location, chamber_of_origin, **source, last_verified, conflict**)
- `bill_action` (id, bill_id, date, description, chamber, action_code, seq) · `bill_subject` (bill_id, subject)
- `sponsorship` (bill_id, legislator_id, type[primary|co], source)
- `vote_event` (id, bill_id, date, chamber, committee_id?, motion, result, yes_count, no_count, other_count, location, **source, last_verified**)
- `vote_record` (vote_event_id, legislator_id, option[yea|nay|abstain|absent])
- `committee_hearing` (id, committee_id, date, time, location, bill_id?) — powers "This week"
- `raw_pubinfo.*` staging tables + a `raw_source_payload` (id, source, source_id, kind, payload jsonb, fetched_at) for audit.

**Defined in schema but populated in later phases:** `statement`, `calendar_event`, `district` (PostGIS `geometry`), `user`, `watchlist`, `alert`.

---

## API (Fastify REST, `apps/api`)

- `GET /api/legislators` — filter by chamber, party, district, `q`
- `GET /api/legislators/:id` — profile hub: committees, leadership, sponsorships, recent votes
- `GET /api/bills` — filter by session, chamber, status, subject, sponsor, `q`; paginated
- `GET /api/bills/:id` — actions timeline, sponsorships, votes, current location
- `GET /api/committees` · `GET /api/committees/:id` — roster (chairs flagged) + referred/heard bills
- `GET /api/votes/:id` — vote event + per-member records
- `GET /api/search?q=` — cross-entity (members, bills, committees) via Postgres full-text/`ILIKE`
- `GET /api/dashboard/this-week` — recently moved bills (last 7d of `bill_action`) + upcoming `committee_hearing`
- `GET /api/meta/sources` — source + `last_verified` freshness
- `POST /api/ingest/refresh` — manual refresh (token-guarded)

---

## Frontend (`apps/web`)

Bloomberg-terminal clarity: dense, readable, keyboard-friendly.
- `/` — **"This week"** dashboard: recently moved bills + upcoming hearings + data-freshness panel (watchlist personalization deferred → global view for now).
- `/legislators` (list + filters) · `/legislators/:id` — **the hub** everything links back to.
- `/bills` (list + filters) · `/bills/:id` — history timeline + current location + votes (incl. committee & sponsorship prominence per spec).
- `/committees` · `/committees/:id` — roster with chairs flagged + bills referred.
- **Global ⌘K search** (cmdk) across members/bills/committees.
- **Source badge + `last_verified`** on bill/vote/member records.
- **Party color-coding** with a colorblind-safe palette (e.g. blue/orange, not blue/red) + non-color cues; WCAG-AA contrast.

---

## Docker, tests, docs

- **docker-compose:** `db` (postgis/postgis:16-3.4, named volume), `api`, `web`, `ingest` (shares api image); volume for the PUBINFO download cache. `.env.example` documents everything.
- **Tests (Vitest)** — focused on the normalization layer (spec deliverable #5): `.dat` tab parser (delimiter/null/escape), action/status-code → status mapping, vote-code → `yea|nay|abstain|absent`, district-join enrichment, and the `conflict`-flagging function (unit-tested now so the later reconciliation phase plugs in cleanly).
- **README:** setup via `docker compose up`, the PUBINFO-first model + reconciliation design, where future API keys go, and **"how to add a new state"** (the ingest worker is source-pluggable; PUBINFO adapter is CA-specific, internal schema is state-agnostic).

---

## Implementation sequence (vertical slice)

1. **Skeleton:** monorepo + workspaces + docker-compose + Postgres/PostGIS + Drizzle core schema + first migration.
2. **PUBINFO ETL:** downloader → DDL-driven `.dat` parser → `raw_pubinfo` staging → normalize bills/actions/votes/sponsorships/legislators/hearings. Seed from `pubinfo_2025.zip`. **Gate:** verify real counts (≈120 legislators, thousands of bills, real roll-call records) via psql.
3. **Enrichment scraper:** photos/contact/committee rosters/leadership joined by district; explicit-missing handling.
4. **API:** Fastify + zod endpoints above; shared types in `packages/shared`.
5. **Frontend:** shadcn scaffold → legislators list/profile → bills list/detail → committees → ⌘K search → "This week". Source badges throughout.
6. **Tests + README + scheduler + manual refresh.** Polish pass on the slice.

## Staged roadmap (remaining spec, post-slice)
- **B — Reconciliation:** add Open States + LegiScan ingestion; cross-source `conflict` flags surfaced in UI (store both values).
- **C — Calendar/deadlines:** parse Senate/Assembly 2026 deadline ICS/PDF + committee hearing agendas; calendar + "upcoming deadlines" views.
- **D — District maps:** TIGER `tl_2024_06_sldu/sldl` → GeoJSON → PostGIS; MapLibre layer; district↔member lookup; current vs proposed toggle.
- **E — Statements:** CalMatters Digital Democracy best-effort scrape; mark sparse/unavailable per member.
- **F — Watchlist/alerts:** user model, saved filters, email alerts (nodemailer) with a channel model extensible to SMS.
- **G — Final polish** + watchlist-personalized "This week."

---

## Verification (end-to-end)

1. `docker compose up` → db, api, web, ingest all healthy.
2. Trigger ingest seed (or `POST /api/ingest/refresh`); confirm row counts in psql **and** via `GET /api/legislators` / `GET /api/bills`.
3. In the web app: open a legislator → follow to a sponsored bill → open a roll-call vote → jump to the committee; run a ⌘K search; confirm "This week" shows real recently-moved bills + hearings; confirm source badges + `last_verified` render.
4. Use Claude Preview / browser MCP to screenshot the hub pages.
5. `npm test` → normalization/reconciliation suite green.

## Open risks & mitigations
- **Exact PUBINFO columns** unknown until DDL is read → parser is DDL-driven (step 2 reads `pubinfo_load.zip` first; nothing hardcoded).
- **`LEGISLATOR_TBL` scope** (full roster vs authors-only) uncertain → chamber-directory scrape provides the authoritative 120-member roster; PUBINFO links votes by district/name.
- **Annual zip is ~950 MB** → cached volume; README notes first-run download time; daily zips for incremental refresh.
- **Scraping fragility** → polite rate-limit + cache; explicit-missing fields; chamber rosters re-scraped weekly, not per-request.
