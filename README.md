# TP Selection

## Local setup

Install Node.js 24 (which includes npm), then install the locked dependencies:

```sh
npm ci
```

Copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell, or `cp .env.example .env.local` in macOS/Linux), then set these public Supabase project values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase is optional during local development. Until both values are set, the client is `null` and the site can run without a Supabase connection.

## GitHub Pages

In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as repository Actions variables under **Secrets and variables > Actions > Variables**. The deployment workflow builds `main` using those values and publishes `dist`.

These Vite values are included in the browser bundle and must be public. Never put Supabase secret or service-role keys in browser code or Actions variables.

## Current scope

The site is currently only an application shell. Registration, quota and other business rules, and the database schema do not exist yet. When capacity rules are implemented, Supabase must enforce them transactionally; browser-only checks cannot prevent concurrent over-enrollment.
