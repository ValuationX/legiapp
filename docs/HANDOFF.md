# Bill Aid — Handoff / Project State

A portable snapshot of where the project is, how to run it, and what's left. Pairs with
[TRANSFER.md](TRANSFER.md) (machine-move mechanics) and the README (full reference +
data-refresh runbook).

_Last updated: 2026-06-22._

---

## What it is

**Bill Aid** — a public, multi-state **U.S. state-legislature tracker** built for a
Nova Ukraine advocate, with a focus on surfacing **foreign-affairs / Ukraine** legislation
and the lawmakers behind it. State legislatures only (no U.S. Congress).

- **Live:** https://legiapp-api-valuationx1.vercel.app  (now **public** — the access-code
  gate was removed; anyone can view it).
- **Hosting:** Vercel (SPA + the Fastify API bundled as one serverless function) + **Neon**
  Postgres. **Push to `main` on GitHub (`ValuationX/legiapp`) auto-deploys.**
- **Monetization / metrics:** Google AdSense (Auto Ads, `ca-pub-2504590710091105`),
  Vercel Web Analytics, and Vercel Speed Insights are all wired in. Enable Web Analytics +
  Speed Insights + AdSense Auto Ads in the Vercel/AdSense dashboards (the code is in place).

## Data loaded (in Neon, live)

**All 10 states live:** CA, NY, OH, MI, HI, IA, PA, MA, IL, AZ — each has legislators, bills,
foreign-affairs tags, committees (rosters + chairs), district maps, chamber leadership, and a
2026 calendar. CA/NY/OH/MI/HI/IA/PA/MA also have roll-call votes.

- **CA** is the deepest (official PUBINFO source incl. its own votes); NY/OH/MI/HI/IA/PA/MA
  come from Open States bulk CSVs + Census TIGER + curated leadership/calendar.
- **IL + AZ** were loaded via the Open States **v3 API** (no bulk CSV exists for their recent
  sessions). Caveats: **no roll-call votes** (votes come from the bulk CSVs they lack); **AZ
  bills are FA-complete but recent non-FA is slightly truncated** (a late connection drop);
  **AZ map is multi-member** (one rep linked per district).
- **MA** map is partial (named districts, e.g. "3rd Middlesex"); all other MA data is complete.

## Architecture (TypeScript monorepo, npm workspaces)

```
packages/db       Drizzle schema + migrations + pg client (createClient/connectClient)
packages/shared   zod schemas, the STATE registry (states.ts), foreignAffairs.ts, reconcile()
apps/api          Fastify REST API (state-scoped via stateOf(req)); deployed as one Vercel fn
apps/web          React + Vite + Tailwind SPA (TanStack Query, react-router, Leaflet)
apps/ingest       ETL CLI: pubinfo (CA), openstates state import, votes, districts,
                  foreign-affairs, calendar, leadership, augment-ca
scripts/          db.mjs (portable Postgres), verify-state.mjs, etc.
```

Key files: `packages/shared/src/states.ts` (all 10 states' FIPS/labels/seats/map config),
`apps/api/src/state.ts` (`stateOf`), `apps/ingest/src/openstates/import-state.ts` (per-state
import: roster from the OpenStates People GitHub repo, bills from bulk CSV **or** the v3 API),
`apps/ingest/src/openstates/import-votes.ts`, `apps/ingest/src/{districts,calendar,leadership}/`,
`apps/web/src/components/Layout.tsx`, `apps/web/src/App.tsx`, `apps/web/src/lib/state.tsx`.

## Run it on a fresh machine

```bash
git clone https://github.com/ValuationX/legiapp && cd legiapp
npm install
# create apps/web/.env or repo .env with the vars below (copy from Vercel or your old .env)
npm run dev:api    # Fastify on :4000   (needs DATABASE_URL=<Neon> to serve live data)
npm run dev:web    # Vite on :5173 (proxies /api -> :4000)
```

The deployed app reads **Neon** directly, so for local dev you only need `DATABASE_URL`
pointed at Neon — no local Postgres required. (A portable local Postgres exists via
`npm run db:start` if you ever want to ingest the heavy CA PUBINFO raw staging locally.)

### Environment variables (values NOT in this file — get them from the Vercel project env, or your old `.env`)

| Var | Purpose | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres connection string | Required for API + all ingest. **Rotate** — the password was shared in chat. |
| `OPENSTATES_API_KEY` | Open States v3 API (free key) | Only needed for the IL/AZ API import path. **Rotate** — shared in chat. |
| `INGEST_REFRESH_TOKEN` | guards `POST /api/ingest/refresh` | Optional; the endpoint is disabled on Vercel anyway. |
| `WEB_ORIGIN` | API CORS allowlist | comma-separated; defaults to localhost dev origins. |
| (AdSense `ca-pub-2504590710091105`) | in `apps/web/index.html` | Public, not a secret. |
| `ACCESS_CODE` | (legacy) | **No longer used** — the access gate was removed. |

`.env` is gitignored, so it does **not** travel with `git clone` — copy it separately or
re-create the values from the Vercel dashboard.

## Deploy

Push to `main` → Vercel builds (`npm run build -w @legiapp/web && node scripts/build-api.mjs`)
and deploys. **Commit author email must be `285078698+ValuationX@users.noreply.github.com`**
or Vercel rejects the deploy. Verify a deploy by polling the live JS bundle hash + curling
`/api/health`.

## Keeping data current

Production is a **static snapshot** — no scheduler runs on Vercel; data only updates when
ingest is re-run against Neon. See the README "Keeping data current (refresh runbook)" for
the exact per-state commands. All sources are free; no paid APIs.

## Pending / next steps

1. **IL + AZ polish (loaded, not fully clean).** Both are live via the Open States v3 API.
   Remaining: AZ's recent non-FA bills are slightly truncated (a late Neon connection drop mid-
   import), and IL/AZ have no roll-call votes (their source lacks them via this path). The robust
   fix: refactor the API path in `runStateImport` to **collect all bills via the API first, then
   open the DB connection and write** — so Neon never drops an idle connection; re-running
   `state IL`/`state AZ` then gives a fully clean load. (keepAlive + a pg `error` handler were
   added as stopgaps and got both states in.)
2. **Rotate secrets** — the Neon password and Open States key were pasted in chat; rotate both
   and update Vercel env.
3. **MA district map** — named districts; revisit if a full MA map is wanted.
4. **Optional automation** — a free GitHub Actions cron could refresh CA (PUBINFO) + re-tag FA
   on a schedule; not set up.

## Recent changes (this session)

- Rebrand to **Bill Aid** + new logo; first-visit `/welcome` intro page (logo links there).
- **Public site:** removed the access-code gate (web + API).
- **Google AdSense** + **Vercel Analytics** + **Speed Insights** added.
- **Brand-forward blue** theme + **dark mode** (toggle in topbar + Settings).
- **Mobile** responsiveness pass (sticky sidebar, map z-index, no horizontal overflow).
- **8-state rollout:** loaded HI/IA/PA/MA; generalized **district maps** (state-param,
  CA-safe), **roll-call votes** (NY/OH/MI/HI/IA/PA/MA), per-state **leadership** (curated
  from official .gov pages, 100% name-matched) and **calendar** (2026 election/session dates).
- CA foreign-affairs expanded via `augment-ca` (merged missing FA bills into the PUBINFO set).
- Footer + About / Privacy / Terms pages.
- State switch now lands on the new state's This Week.

## Gotchas

- **Neon drops long single-connection imports** (the OS v3 API path) — see Pending #1.
- **OS v3 `/bills` caps `per_page` at 20**; ordinal session names ("104th") don't start with a
  year, so the FA "2022+" filter also reads the bill's action-date year.
- **`bill_subject` has no unique constraint** — importers clear a state's FA tags before re-tagging.
- **Windows portable Postgres** can fail to fork ("error 487") — `withDbRetry` handles it.
- The CA app's IDs are state-prefixed (`CA:…`); district ids are `${state}-${chamber}-${num}-current`.
