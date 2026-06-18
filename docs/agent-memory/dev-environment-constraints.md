---
name: dev-environment-constraints
description: "This Windows box can't run Docker; use portable local Postgres instead."
metadata: 
  node_type: memory
  type: project
  originSessionId: f2327825-7f38-4a71-a1b8-2b55d3657423
---

On this Windows 11 machine (LAPTOP-VFMR3ACP), Docker Desktop, WSL2, and CPU virtualization are all unavailable, and the user is not a local admin — so Docker/containers are NOT an option for local dev. Node 20+, npm, git, and winget ARE available.

**Why:** Verified 2026-06-16 — `docker`/`wsl` absent, `VirtualizationFirmwareEnabled=False`, `IsInRole(Administrator)=False`. The user initially believed Docker was available; it is not.

**Also on the desktop (2026-06-17):** the project was set up on a separate Win10 desktop (OneDrive path `…/legiapp-main/legiapp-main`, Node v24). Docker CLI is likewise absent there, so the same portable-Postgres path applies. Two desktop-specific notes: (1) Postgres I/O is slow on the OneDrive path (a checkpoint fsync took ~111s) but works. (2) Unlike the laptop, **Claude_Preview screenshot/eval tooling DOES work here** — use it to verify web changes.

**How to apply:** For local databases use the portable-Postgres pattern from [[legiapp-project]] — the `embedded-postgres` npm package ships real Postgres *server* binaries (initdb/pg_ctl/postgres only, NO psql/createdb) driven via `pg_ctl` on port 5433 in `scripts/db.mjs`; create the DB and run ad-hoc SQL through the node `pg` client. Author `docker-compose.yml` as a deliverable if asked, but don't expect it to run here.
