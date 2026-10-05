# DEPLOYMENT.md — arkado.store

How this site goes live. One page, no fluff.

## How deploy works

- Push to `main` → Vercel auto-deploys. That's it.
- No `vercel.json` — Vercel uses framework defaults.
- Build runs `npm run build`, which first runs `prebuild`:
  `node scripts/make-email-logo.mjs` rasterizes `public/logo.svg` → `public/logo-email.png`
  (used in order emails; the PNG is gitignored because binary pushes corrupt it).

## Required env vars on Vercel

Set these in Vercel → Project → Settings → Environment Variables.
Missing vars fail silently at runtime — the site builds fine but features break.

| Var | Used for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (server) | Never expose with `NEXT_PUBLIC_` |
| `ADMIN_PASSCODE` | Admin panel login | Real one is long; repo docs carry a dummy |
| `SESSION_SECRET` | Admin sessions | |
| `SMTP_USER` | Gmail SMTP (order emails) | e.g. `arkado2026@gmail.com` |
| `SMTP_PASS` | Gmail SMTP | App password, not the login password |
| `SMTP_FROM` | Email sender | **Leave UNSET** unless it equals `SMTP_USER`. A different value (e.g. `noreply@arkado.in`) lands customer mail in Spam |
| `ADMIN_NOTIFY_EMAIL` | New-order alert recipient | |
| `NEXT_PUBLIC_APP_URL` | Canonical URL | `https://arkado.store` |
| `DEFAULT_UPI_ID` | Checkout UPI ID | |
| `DEFAULT_WHATSAPP_NUMBER` | Support WhatsApp | `917852004401` |
| `DEFAULT_SUPPORT_PHONE` | Support display | `+91 78520 04401` |
| `DEFAULT_SUPPORT_EMAIL` | Support email | |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | AI job-guidance chat | |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_FREE_MESSAGES_LIMIT` | Misc | |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Legacy | Razorpay route was deleted 2026-09-30; safe to remove these |

To inspect a secret's value (Vercel dashboard has no View button): `vercel env pull` on a local PC.

## Supabase migrations

SQL files in `supabase-migrations/`. Run new ones in Supabase Dashboard → SQL Editor
**before** deploying the code that needs them. The code has fallbacks, but real
columns/tables are always better.

Pending as of 2026-10-05:

- `20260930_admin_login_attempts.sql`
- `20261001_order_terms_acceptance.sql`
- `20261005_page_views.sql`
- `20261005_order_admin_note.sql`

## Pre-push checklist

```bash
npx tsc --noEmit
npx eslint .
npm test        # vitest, 55 tests
```

## Post-deploy verify (2 min)

1. `https://arkado.store` loads.
2. `https://arkado.store/logo-email.png` returns a PNG (not 404 — the prebuild
   script swallows Sharp failures, so a green build alone doesn't prove it).
3. Place a test order → admin gets email at `ADMIN_NOTIFY_EMAIL`.
4. Approve it → customer gets the Drive-link email (check Spam on first test).

## Never commit

- `data/orders.json` — customer PII (name, email, phone, UTR). Gitignored; the app
  recreates it locally on write. A copy once leaked into history — see commit
  `442a873`; history purge still pending.
- `.env.local`, `.env*` (except `.env.example`)
- `public/logo-email.png` — generated at build time.

## Rollback

Vercel Dashboard → Deployments → ⋯ on the previous good deployment → **Promote to Production**.
