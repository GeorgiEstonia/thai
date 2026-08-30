# Deploying

Two services: **Railway** for Postgres, **Vercel** for the app. GitHub in
between. Roughly fifteen minutes, most of it waiting.

## 1. Push to GitHub

Create an empty repo at https://github.com/new — call it `thai`, **private**,
and do not let it add a README or .gitignore.

Then, in this folder:

```bash
git remote add origin https://github.com/GeorgiEstonia/thai.git
git branch -M main
git push -u origin main
```

If it asks for a password, use a personal access token, not your account
password: GitHub → Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate, with the `repo` scope.

`.env.local` is gitignored, so your keys do not go up. Check with
`git ls-files | grep env` — it should only show `.env.example`.

## 2. Postgres on Railway

1. railway.app → New Project → **Deploy PostgreSQL**
2. Open the Postgres service → **Variables** → copy `DATABASE_PUBLIC_URL`
   (the public one — Vercel is outside Railway's private network)

Create the tables from your machine, pointing at that URL:

```bash
DATABASE_URL="paste-the-railway-url" npm run db:push
```

## 3. Vercel

1. vercel.com → Add New → Project → import the `thai` repo
2. Leave every build setting alone; it detects Next.js
3. Add four **Environment Variables** before deploying:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Railway `DATABASE_PUBLIC_URL` |
| `APP_PASSPHRASE` | whatever you want to type to get in |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | your key |

4. Deploy.

## 4. Add it to your phone

Open the Vercel URL in Safari → Share → Add to Home Screen. It runs
full-screen and keeps you logged in.

## Things that will bite

- **Reading a chapter takes longer than a Hobby plan allows.** OCR plus
  verification can run past 60 seconds, and Hobby kills functions at 60. On
  Pro the limit is 300, which is what `maxDuration` is set to. On Hobby, upload
  a few pages at a time.
- **Worksheet photos are stored in the database** as data URLs. Fine for
  occasional pages; if you import a lot, move them to blob storage.
- **Redeploying does not touch the database.** Schema changes need
  `DATABASE_URL="…" npm run db:push` run again from your machine.
- **Railway's free trial credit runs out.** If the app starts failing to load
  progress, check the Railway billing page before debugging anything else.

## Changing things later

```bash
git add -A && git commit -m "what changed" && git push
```

Vercel rebuilds on push. `main` is production.
