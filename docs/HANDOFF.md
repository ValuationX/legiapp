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

**8 states fully featured:** CA, NY, OH, MI, HI, IA, PA, MA — each has legislators, bills,
foreign-affairs tags, roll-call votes, committees (rosters + chairs), district maps,
chamber leadership, and a 2026 calendar (elections + session dates).

- **MA** map is partial (Massachusetts uses *named* districts, e.g. "3rd Middlesex" — the
  numeric TIGER match only links some; all other MA data is complete).
- **CA** is the deepest (official PUBINFO source incl. its own votes); the other 7 come
  from Open States bulk CSVs + Census TIGER + curated leadership/calendar.

**Not loaded yet: IL + AZ** — see Pending below.

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

1. **Load IL + AZ (the one unfinished feature).** Data isn't in the Open States *bulk CSV*
   exports for recent IL (only 100th GA) / AZ, but Open States **does** track them — load via
   the **v3 API** path (`OPENSTATES_API_KEY=… npm run ingest -- state IL`). The curated IL/AZ
   leadership + calendar are already in the repo (`leadership/data.ts`, `calendar/data.ts`).
   **Blocker:** the slow, rate-limited API import holds one Neon connection open and Neon
   drops it mid-run ("Connection terminated unexpectedly"); TCP keepAlive did not fix it.
   **Fix:** refactor `runStateImport` to *collect all API data first, then open the DB
   connection and write* (so the connection isn't idle during fetches) — or run the import
   against a local Postgres and publish the IL/AZ rows to Neon. Then run `votes`/`districts`
   (note AZ House is multi-member → map shows one rep/district), `leadership IL`, `leadership AZ`,
   `calendar IL`, `calendar AZ`, and verify with `scripts/verify-state.mjs`.
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
