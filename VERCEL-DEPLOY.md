# Publish LegiApp for free on Vercel + Neon

This gets the tool live at a real HTTPS URL (`your-app.vercel.app`), free, with **no
server to manage**. Three free accounts are involved:

- **Vercel** — hosts the website *and* runs the API (as one serverless function).
- **Neon** — free hosted Postgres that holds the data.
- **GitHub** — stores the code; Vercel deploys from it and auto-redeploys on push.

Everything the SPA and API need is the same origin on Vercel, so the shared
access-code login works exactly like it does locally. You load the data into Neon
straight from this Windows machine with the scripts already in the repo — **no Docker
needed**.

---

## Step 1 — Put the code on GitHub

From the project folder (PowerShell):

```powershell
git init
git add .
git commit -m "LegiApp for Nova Ukraine"
```

Create an empty repo at <https://github.com/new> (Private is fine), then:

```powershell
git remote add origin https://github.com/YOUR-USER/legiapp.git
git branch -M main
git push -u origin main
```

> The big dev database dump (`data-snapshot/`) is already git-ignored. The small
> `data-snapshot-focused/` (~4 MB) is committed — that's the published data.

## Step 2 — Create the Neon database

1. Sign up at <https://neon.tech> (free) and create a project (Postgres 16+).
2. In the project's **Connection Details**, copy **two** connection strings — Neon
   shows both:
   - **Direct** (host like `ep-xxx.REGION.aws.neon.tech`) — for loading data.
   - **Pooled** (host like `ep-xxx-pooler.REGION.aws.neon.tech`) — for the live app.

   Both end with `?sslmode=require` (the app auto-detects Neon and turns on TLS).

## Step 3 — Load the data into Neon (from this machine)

In PowerShell, in the project folder, using the **Direct** string:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require"
npm run migrate
$env:SNAPSHOT_DIR = "data-snapshot-focused"
npm run db:import
```

`migrate` creates the tables; `db:import` streams the focused snapshot up to Neon
(all foreign-affairs bills + recent active bills, the 120 current members with photos
and contacts, and historical sponsors). Takes a minute or two over the network.

> Use the **Direct** string here (not the pooled one) — the bulk `COPY` import needs a
> direct session connection.

## Step 4 — Deploy on Vercel

1. Sign up at <https://vercel.com> with your GitHub account.
2. **Add New → Project**, import the `legiapp` repo. Vercel reads `vercel.json`
   automatically (builds the SPA, wires `/api/*` to the function) — leave the build
   settings as detected.
3. Before the first deploy, open **Environment Variables** and add these four
   (Production scope):

   | Name            | Value                                                            |
   | --------------- | ---------------------------------------------------------------- |
   | `DATABASE_URL`  | your Neon **Pooled** string (the `-pooler` host)                 |
   | `ACCESS_CODE`   | the shared phrase your team will type to get in                  |
   | `PGPOOL_MAX`    | `1`                                                              |
   | `DATABASE_SSL`  | `true`                                                           |

4. Click **Deploy**. After ~1–2 minutes you get a live URL like
   `https://legiapp-xxxx.vercel.app`.

## Step 5 — Share it

Send your team the Vercel URL and the `ACCESS_CODE`. First visit shows the access
screen, then the one-time research disclaimer, then the full tool.

---

## Updating later

- **Change the code/UI:** `git push` — Vercel redeploys automatically.
- **Refresh the data:** on this machine run `npm run db:export:focused`, then repeat
  **Step 3** (re-imports into Neon). No redeploy needed — the live app reads Neon.
- **Rotate the access code:** change `ACCESS_CODE` in Vercel → Settings → Environment
  Variables and redeploy. Existing logins are invalidated automatically.

## No-GitHub alternative (Vercel CLI)

If you'd rather skip GitHub for a one-off deploy:

```powershell
npm i -g vercel
vercel            # links/creates the project, first (preview) deploy
vercel env add DATABASE_URL production      # paste the pooled Neon string
vercel env add ACCESS_CODE production
vercel env add PGPOOL_MAX production         # 1
vercel env add DATABASE_SSL production       # true
vercel --prod     # production deploy
```

## Good to know

- **Free-tier cold starts:** after a quiet spell the first request may take 1–3 s
  while the function wakes; it's instant after that. Fine for a small team.
- **Neon free tier** is generous and doesn't expire; the database may auto-suspend
  when idle and wakes on the next query (adds ~1 s to a cold request).
- **Custom domain (optional):** add one later in Vercel → Settings → Domains; HTTPS is
  automatic. Until then the `*.vercel.app` URL is already HTTPS and works fine.
- **Why not GitHub Pages?** It only serves static files — it can't run the API or host
  the database, so the app would load with no data and no login.
