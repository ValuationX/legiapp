# LegiApp — California Legislature Tracker

Operational intelligence for advocacy organizations and lobbyists tracking the
**California State Legislature** (Assembly + Senate). Built on **real data** from
California's official legislative dataset — not mock data.

The question it answers fast: **"Who controls this bill's fate, what's their
position, and what's my window to influence it?"**

This is a **polished vertical slice**: legislators, bills, votes (including
individual roll-call records), committees, global search, and a "This Week"
dashboard — all on the live 2025–2026 session. Maps, statements, and
watchlists/alerts are scoped as follow-on phases (see [Roadmap](#roadmap)).

---

## What's inside (real data)

Seeded from the current session, the database holds:

| Entity | Count |
| --- | --- |
| Legislators (current roster) | **120** |
| Bills (2025–2026) | **~4,990** |
| Bill actions (history) | **~72,000** |
| Sponsorships | **~33,000** |
| Vote events (floor + committee) | **~16,000** |
| **Individual roll-call vote records** | **~445,000** |
| Committee hearings | **~14,000** |

> 94.9% of vote records and 93.9% of sponsorships link to a current member
> profile; the rest are former members (who voted earlier in session) — shown by
> name without a profile link, never fabricated.

---

## Architecture

A TypeScript monorepo (npm workspaces):

```
packages/
  db/       Drizzle schema + migrations (staging + normalized model)
  shared/   zod schemas + types (API ⇄ web contract) + reconcile() primitive
apps/
  api/      Fastify REST API
  web/      React + Vite + Tailwind + shadcn-style UI
  ingest/   ETL worker: PUBINFO download → parse → COPY → normalize, + enrichment, + scheduler
scripts/db.mjs   portable local Postgres manager (no Docker, no admin)
```

- **DB**: PostgreSQL (Drizzle ORM). Image `postgis/postgis:16-3.4` so the maps
  phase needs no migration churn.
- **API**: Fastify + zod, REST (extensible to other clients/states).
- **Web**: React, React Router, TanStack Query, Recharts, cmdk (⌘K search).

---

## Quick start (local, no Docker)

Requirements: **Node ≥ 20**. No Docker, no admin, no system Postgres install — a
portable PostgreSQL is downloaded into the project and run as your user.

```bash
npm install                # installs workspaces + the embedded Postgres binaries
npm run db:start           # init + start Postgres on :5433, create the legiapp db
npm run migrate            # create the schema
npm run ingest             # download PUBINFO (~950MB first run) → seed real data
                           # (PUBINFO normalize + bill text for full-text search + member enrichment)
npm run ingest -- districts # one-time: download + load CA district boundaries (for the map)
npm run ingest -- calendar  # load 2026 legislative deadlines (Senate ICS) + CA election dates

# two terminals:
npm run dev:api            # Fastify API on http://localhost:4000
npm run dev:web            # Vite app on  http://localhost:5173
```

Open **http://localhost:5173**.

> First `npm run ingest` downloads the ~950MB annual archive into `.data-cache/`.
> Set `PUBINFO_ARCHIVE=daily_Tue` (etc.) in `.env` to pull a daily full snapshot
> instead. Copy `.env.example` → `.env` to override any defaults.

Stop / inspect the database:

```bash
npm run db:stop
npm run db:status
node scripts/db.mjs sql "SELECT count(*) FROM bill"
```

## Quick start (Docker)

For machines with Docker available (the stack uses PostGIS, ready for maps):

```bash
docker compose up --build
# web → http://localhost:8080   api → http://localhost:4000   db → :5433
```

`api` runs migrations on boot; `ingest` seeds once then runs the daily scheduler.

---

## Data sources & the PUBINFO-first model

California publishes its **entire legislative database** as a downloadable,
no-API-key dataset ("PUBINFO") at
[downloads.leginfo.legislature.ca.gov](https://downloads.leginfo.legislature.ca.gov/).
It is the **authoritative** source and — unlike Open States v3, whose votes and
committees are currently flagged experimental for CA — it contains **individual
roll-call vote records**. So it is our primary backbone.

| Source | Role | Notes |
| --- | --- | --- |
| **PUBINFO bulk** | PRIMARY (now) | Tab-delimited `.dat` (backtick-enclosed) + `.lob`, MySQL `capublic` schema. Bills, history, votes, hearings. No key. |
| **Chamber sites** | Enrichment (now) | Assembly member photos (stable URL); leadership (curated). |
| **Open States v3** | Reconcile (later) | Free key. Subjects, committee rosters, cross-check. |
| **LegiScan** | Backup (later) | Free key, `getRollCall`, `change_hash` sync. |
| **Census TIGER / CA Geoportal** | Maps (later) | SLDU/SLDL → GeoJSON/PostGIS. |
| **CalMatters Digital Democracy** | Statements (later) | No public API; best-effort. |

### Ingestion pipeline (`apps/ingest`)

1. **Download + extract** only the needed `.dat` files from the archive
   (`download.ts`) — skips the thousands of bill-text `.lob` blobs.
2. **Parse** the PUBINFO format with a streaming state machine that handles tab
   delimiters, optional backtick enclosure, `NULL` tokens, and backslash escapes
   incl. embedded tabs/newlines (`parser.ts`, column maps in `tables.ts`).
3. **Stage** verbatim into the `raw.*` schema via Postgres `COPY` (`load.ts`) for
   auditability.
4. **Normalize** `raw.*` → the internal model with set-based SQL (`normalize.ts`):
   code → readable status, vote-code → `yea|nay|abstain`, location → committee/chamber,
   vote/sponsor → legislator linking by name + chamber.
5. **Enrich** members with photos + leadership (`scrape/enrich.ts`).

Every record carries `source` + `last_verified` (+ `conflict`), surfaced as a
badge in the UI.

### Reconciliation logic

The accuracy contract is *store both, flag the disagreement* — never silently
pick. `packages/shared/reconcile.ts` is the primitive (unit-tested):

```ts
reconcile(
  [{ source: 'openstates', value: 'Passed' }, { source: 'pubinfo', value: 'Chaptered' }],
  ['pubinfo', 'legiscan', 'openstates'], // priority, best first
)
// → { value: 'Chaptered', conflict: true, alternatives: [{ source: 'openstates', value: 'Passed' }] }
```

When the Open States / LegiScan adapters land, each field is run through
`reconcile()`; a `conflict` flag and the losing values are stored and shown in
the UI. Today, with PUBINFO as the sole authority, conflicts are always `false`.

---

## API

```
GET  /api/legislators            ?chamber&party&district&q&page&pageSize
GET  /api/legislators/:id
GET  /api/legislators/:id/votes
GET  /api/legislators/:id/bills
GET  /api/bills                  ?chamber&measureType&status&sponsor&subject&q&page&pageSize
GET  /api/bills/:id
GET  /api/bills-facets
GET  /api/committees             ?chamber&q
GET  /api/committees/:id
GET  /api/committees/:id/bills
GET  /api/votes/:id
GET  /api/districts/:chamber     GeoJSON (assembly|senate) for the map
GET  /api/calendar               ?type&deadline&upcoming&from&to  (deadlines + election dates)
GET  /api/search                 ?q  (full-text across bill title + digest + body)
GET  /api/dashboard/this-week
GET  /api/meta/sources
POST /api/ingest/refresh         (header: x-ingest-token)

# Personalization (email+password auth, JWT in an httpOnly cookie)
POST /api/auth/register|login|logout   ·   GET /api/auth/me
GET  /api/watchlist  ·  GET /api/watchlist/status  ·  POST/DELETE /api/watchlist
GET  /api/saved-filters  ·  POST /api/saved-filters  ·  DELETE /api/saved-filters/:id
GET  /api/alerts  ·  POST /api/alerts  ·  DELETE /api/alerts/:id
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run db:start` / `db:stop` / `db:status` | manage portable Postgres |
| `npm run migrate` / `generate` | apply / author Drizzle migrations |
| `npm run ingest` | full refresh (PUBINFO + enrichment + committees + subjects + calendar) |
| `npm run ingest -- pubinfo` \| `scrape` \| `committees` \| `subjects` \| `districts` \| `calendar` \| `alerts` \| `schedule` | individual steps / cron worker |
| `npm run ingest -- alerts --test` | send a test alert email to every alert owner (dev console transport) |
| `npm run dev:api` / `dev:web` | dev servers |
| `npm test` | normalization + reconciliation + tagger + auth tests |
| `npm run typecheck` | typecheck all workspaces |

---

## Keeping data current (refresh runbook)

Production serves a **static snapshot**: the deployed app is a read-only API + web
bundle on Vercel, so **no scheduler runs in production** — data only updates when an
ingest command is re-run against the (Neon) database. The dashboard shows each state's
`last_verified` freshness so staleness is visible. All sources are **free**; no paid
APIs are used. To refresh, point `DATABASE_URL` at the production DB and run:

```bash
# California — official PUBINFO bulk feed (stable URL; fully automatable):
DATABASE_URL=<prod> npm run ingest                  # bills/votes/roster/committees/subjects
DATABASE_URL=<prod> npm run ingest -- foreign-affairs
DATABASE_URL=<prod> npm run ingest -- calendar CA   # live Senate ICS + curated election dates

# Source-fed states (NY/OH/MI/HI/IA/PA/MA) — from the Open States session CSVs
# (set OS_CSV_DIRS to that state's session dirs), e.g. for NY:
OS_CSV_DIRS="…NY dirs…" IMPORT_APPLY=1 DATABASE_URL=<prod> npm run ingest -- state NY    # roster+bills+committees+FA
OS_CSV_DIRS="…NY dirs…" IMPORT_APPLY=1 DATABASE_URL=<prod> npm run ingest -- votes NY    # roll-call votes
DATABASE_URL=<prod> npm run ingest -- districts NY   # Census TIGER boundaries
DATABASE_URL=<prod> npm run ingest -- calendar NY    # curated 2026 election + session dates
DATABASE_URL=<prod> npm run ingest -- leadership NY  # curated chamber leadership
```

Each command is idempotent (re-running replaces that state's slice). **Manually-maintained
data** — refresh ~once per session from official pages, no free feed exists:
chamber **leadership** (`apps/ingest/src/leadership/data.ts`; CA in
`apps/ingest/src/scrape/positions-guide.ts`) and the curated per-state **calendar**
dates (`apps/ingest/src/calendar/data.ts`). Everything else (bills, legislators, votes,
committees, district boundaries) flows from official/authoritative feeds and refreshes by
re-running the commands above. A scheduled refresh could run these on free GitHub Actions
minutes against Neon if the org wants it (not set up yet).

## Adding another state

The internal schema is state-agnostic; only the **adapters** are CA-specific.

1. Add a source adapter under `apps/ingest/src/<state>/` that produces rows in the
   normalized shape (`bill`, `legislator`, `vote_event`, …). For Open-States-backed
   states this is mostly one API client.
2. Add the state's identifiers (session, chamber names, party codes) to a small
   config and key records by `source`.
3. Reuse `reconcile()` to merge sources.
4. Add a `state` dimension to queries/UI filters.

No schema rewrite is required — PUBINFO is just California's adapter.

## Required API keys

None for the vertical slice (PUBINFO + TIGER need no key). For the later
reconciliation phase: **Open States** (free, `OPENSTATES_API_KEY`) and
**LegiScan** (free, `LEGISCAN_API_KEY`) — placeholders are in `.env.example`.

---

## Roadmap

- **B — Enrichment**: ✅ rosters + subjects done key-free — committee rosters/chairs from the OpenStates **People** repo
  (`npm run ingest -- committees`) and keyword issue-area tags over bill text (`npm run ingest -- subjects`). Cross-source
  **reconciliation** (Open States/LegiScan, conflict flags) still needs an API key.
- **C — Calendar/deadlines**: ✅ done — official Senate 2026 deadline ICS (joint J.R. 61 deadlines) + curated CA Secretary of State election dates → `calendar_event` (`npm run ingest -- calendar`) → `/api/calendar` + `/calendar` page + dashboard panel.
- **D — District maps**: ✅ done — TIGER SLDU/SLDL → GeoJSON (`npm run ingest -- districts`) → `/map` page; click anywhere shows the Assembly member + State Senator.
- **E — Statements**: CalMatters Digital Democracy (best-effort) — not yet built.
- **F — Watchlist/alerts**: ✅ done — email+password auth (JWT cookie), follow bills/legislators/committees, saved filters, and email alerts (`/watchlist` page; trigger-checker in the ingest worker, dev console transport unless `SMTP_URL` is set).
- **G — Polish**: watchlist-personalized "This Week" (a "Your watchlist" panel shows when signed in).

## Known gaps (today)

- **Cross-source reconciliation** is scaffolded but inactive: with PUBINFO as the sole
  authority, `conflict` is always `false`. It activates when an `OPENSTATES_API_KEY`
  is added (the adapter + `reconcile()` are in place).
- **Bill subjects** are coarse keyword-derived issue areas (`source='keyword'`), not a
  formal taxonomy — richer subjects arrive with an Open States key.
- **Senate member photos** lack a stable URL pattern, so they're scraped
  best-effort from each district site (~21/40 found); the rest use an initials
  avatar fallback. Assembly photos load from a stable official URL.

## Round 2 additions

- **Full-text bill search** — bill digests + full body text are extracted from the
  official CAML XML and indexed with a weighted Postgres `tsvector`, so a search
  like "Ukraine" now finds bills that mention it anywhere (incl. resolutions), not
  just in the title. Results are ranked and show a highlighted snippet.
- **District map** (`/map`) — interactive Leaflet map of all 120 districts over
  OpenStreetMap; click anywhere in California to see that point's Assembly member
  and State Senator (resolved client-side with `@turf/boolean-point-in-polygon`).
- **Member gallery** — photo-card directory with a per-chamber party-composition
  bar, plus best-effort Senate photos.

> **Windows note:** embedded Postgres on Windows can intermittently fail to fork a
> connection ("could not reserve shared memory region, error 487"). All DB entry
> points retry transient connection failures (`packages/db/src/retry.ts`), and the
> server runs with a reduced shared-memory footprint, so this is handled
> transparently.
