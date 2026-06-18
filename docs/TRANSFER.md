# Transferring LegiApp to another machine

Everything you need is in this repo: the **code**, the implementation **plan**
([docs/PLAN.md](PLAN.md)), and the assistant's **memory notes**
([docs/agent-memory/](agent-memory/)). Big/throwaway folders are gitignored and are
recreated on the new machine — do **not** copy them:

| Folder | What it is | Recreated by |
| --- | --- | --- |
| `node_modules/` | dependencies | `npm install` |
| `.data-cache/` | ~950 MB PUBINFO + TIGER downloads | `npm run ingest` |
| `.postgres/` | portable Postgres server + database | `npm run db:start` + ingest |
| `dist/`, `apps/web/dist/` | build output | `npm run build` |
| `.env` | secrets/config | copy from `.env.example` |

## Option 1 — via GitHub (recommended)
On **this** machine:
```bash
gh repo create legiapp --private --source=. --remote=origin --push
# or make an empty repo on github.com, then:
# git remote add origin <url> && git branch -M main && git push -u origin main
```
On the **new** machine: `git clone <url> LegiApp && cd LegiApp`

## Option 2 — zip / copy the folder
Copy the `LegiApp` folder, but first delete the throwaway folders above
(`node_modules`, `.postgres`, `.data-cache`, `dist`, `apps/web/dist`). Keep `.env`
if you want your config/key to come along.

## Set up on the new machine (Windows, no Docker needed)
Requires **Node 20+** (`node --version`).
```bash
copy .env.example .env       # then paste your OPENSTATES_API_KEY into .env
npm install
npm run db:start             # portable Postgres on :5433 (no admin/Docker)
npm run migrate

# FAST PATH — restore the committed snapshot (data-snapshot/, no 950MB download):
npm run db:import
#   …or pull fresh from source instead (downloads ~950MB, ~10 min):
#   npm run ingest && npm run ingest -- districts

npm run ingest -- openstates # only if OPENSTATES_API_KEY is set (rosters/subjects/contact)
# then, in two terminals:
npm run dev:api              # http://localhost:4000
npm run dev:web              # http://localhost:5173
```

The repo includes a **point-in-time database snapshot** in `data-snapshot/`
(gzipped CSVs, ~57 MB) covering all 120 legislators, ~5k bills with full text,
445k vote records, leadership, reelection, positions, and districts. `npm run
db:import` restores it in seconds — no re-download needed. Refresh it any time
with `npm run db:export`.

## Keep the database & skip the re-download (optional)
Instead of the long first ingest, after `npm run db:stop` on the old machine copy
these two folders over as well:
- `.postgres/` — the live database with all ingested data
- `.data-cache/` — the downloaded PUBINFO/TIGER files

Then just: `npm install`, `npm run db:start`, `npm run dev:api`, `npm run dev:web`.
(Works most reliably moving between the same OS/Node major version.)

## Restore the assistant's memory (so Claude Code remembers this project)
Claude stores memory per project path under:
```
%USERPROFILE%\.claude\projects\<SLUG>\memory\
```
`<SLUG>` is the new absolute path with `:` and `\` replaced by `-`. Example:
`C:\Users\you\Desktop\LegiApp` → `C--Users-you-Desktop-LegiApp`.
Copy the three files from [docs/agent-memory/](agent-memory/) into that folder
(create it if needed). The plan already travels with the repo at
[docs/PLAN.md](PLAN.md).
