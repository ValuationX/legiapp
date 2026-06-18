# Deploying LegiApp for Nova Ukraine

This hosts the tool for your team on a small server, behind one shared access code,
with automatic HTTPS. The published database is the **focused snapshot** — every
foreign-affairs bill plus the most recent active bills, all 120 current members
(with photos + contact info), and the historical legislators who sponsored relevant
bills. About 4 MB; no live ingest runs in production.

## What you need

- A small Linux VM (1 vCPU / 1 GB RAM is enough). Any provider: DigitalOcean,
  Hetzner, Linode, AWS Lightsail, etc.
- **Docker** with the Compose plugin installed on it.
- A **domain name** you can point at the server (needed for HTTPS — and the login
  cookie only works over HTTPS). A subdomain like `legiapp.novaukraine.org` is fine.

## One-time setup

1. **Point your domain at the server.** Create a DNS **A record** for your
   (sub)domain pointing to the VM's public IP. Make sure ports **80** and **443**
   are open in the firewall.

2. **Copy the project to the server** (git clone, `scp`, or an upload). The folder
   must include `data-snapshot-focused/` — that's the published data.

   Refresh the data anytime *before* copying by running `npm run db:export:focused`
   on your dev machine; commit/copy the updated `data-snapshot-focused/`.

3. **Create the env file** from the template and edit the four values:

   ```bash
   cp .env.prod.example .env.prod
   nano .env.prod
   ```

   | Variable            | Set it to                                              |
   | ------------------- | ------------------------------------------------------ |
   | `SITE_ADDRESS`      | your domain, e.g. `legiapp.novaukraine.org`            |
   | `ACCESS_CODE`       | a long shared phrase your team will type to get in     |
   | `WEB_ORIGIN`        | `https://` + your domain                               |
   | `POSTGRES_PASSWORD` | any strong random string                               |

4. **Launch it:**

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

   On first boot the `init` step migrates the schema and loads the focused snapshot,
   then the API and Caddy start. Caddy fetches a Let's Encrypt certificate
   automatically (give it a minute on first run).

5. **Visit `https://your-domain`.** Share the domain and the access code with your
   team. First visit shows the access screen, then the one-time research disclaimer.

## Day-to-day

- **Logs:** `docker compose -f docker-compose.prod.yml logs -f`
- **Stop:** `docker compose -f docker-compose.prod.yml down` (data is kept in the
  `pgdata` volume)
- **Change the access code:** edit `ACCESS_CODE` in `.env.prod`, then
  `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d` — existing
  sessions are invalidated automatically (the cookie is an HMAC of the code).
- **Refresh the data:** on your dev machine run `npm run db:export:focused`, copy the
  new `data-snapshot-focused/` to the server, then re-run the `up -d --build` command
  (the `init` step reloads the snapshot).

## Local smoke test (no domain)

To try the whole stack on your own machine, set `SITE_ADDRESS=:80` and
`WEB_ORIGIN=http://localhost` in `.env.prod`, bring it up, and open
`http://localhost`. (Plain HTTP is for testing only — log-in over HTTPS needs a
real domain because the access cookie is marked Secure in production.)

## How it differs from local dev

| | Dev (`npm run dev:*`) | Production (this bundle) |
| --- | --- | --- |
| Database | portable Postgres on :5433 | `postgres:16` container |
| Data | full dev dataset / live ingest | focused snapshot (~4 MB) |
| Web | Vite dev server :5173 | static build served by Caddy |
| API | tsx watch :4000 | tsx :4000 (internal only) |
| TLS | none | automatic via Caddy/Let's Encrypt |
| Access | dev code `nova-ukraine-dev` | your `ACCESS_CODE` |
