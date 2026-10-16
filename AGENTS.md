# AGENT.md — arkado.store

> **Read this first.** This file is the operating contract for ANY AI agent
> working in this repo (Muse, Antigravity, Codex, or a human-assisted session).
> The owner is **Harimohan Sharma** — call him **Harimohan**. "Arkado" is the
> brand, not his name. Speak to him in informal Hindi/Hinglish. Lead with the
> one-line verdict, then details. Never flatter; tell it straight.

## 1. What this is

**arkado.store** — a live production marketplace selling All-India competitive
exam study material (PDF notes, MCQs, mock tests). Real customers, real money.

**Payment flow (the whole business):** customer pays via **UPI/QR** → submits
the **12-digit UTR** → order lands in the admin panel as *pending* →
Harimohan **manually approves** → Google Drive links are delivered by
**email (Gmail SMTP)** and/or **WhatsApp**. There is no automated payment
gateway. The legacy Razorpay route was deleted on 2026-09-30 — do not
reintroduce it.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.6** (App Router) + **React 19.2.4** |
| Styling | **Tailwind CSS v4** (`@import "tailwindcss"`, `@theme inline` tokens) |
| Backend | **Supabase** (Postgres) + JSON-file fallback |
| Email | Gmail SMTP via `nodemailer` (from `arkado2026@gmail.com`) |
| Analytics | `@vercel/analytics` (`<Analytics />` in `app/layout.tsx`) |
| Deploy | **Vercel** — push to `main` auto-deploys. No `vercel.json`. |
| Tests | `vitest` (`npm test`, ~55 tests) |

**Commands:**

```bash
npm run dev          # local dev
npm run build        # production build (runs prebuild first)
npx tsc --noEmit     # typecheck — MUST be clean before any push
npx eslint .         # lint
npm test             # vitest suite
```

**Pre-push checklist (all three, every time):** `npx tsc --noEmit` ✅,
`npx eslint .` ✅, `npm test` ✅.

**Build quirk:** `prebuild` runs `node scripts/make-email-logo.mjs`, which
rasterizes `public/logo.svg` → `public/logo-email.png` (used in order emails).
The PNG is gitignored — never commit it.

**`.npmrc` quirk:** the repo root has `.npmrc` with `legacy-peer-deps=true`.
Do not remove it. Without it, Vercel's `npm install` fails with ERESOLVE
(`@vercel/analytics`'s peerOptional `@sveltejs/kit` → vite 8 conflicts with
`vitest`'s vite 7). This was a real production build failure on 2026-10-14.

## 3. Architecture map

```
app/
  page.tsx                    # homepage (via components/HomeClient.tsx)
  layout.tsx                  # root layout — 🔴 RING-FENCED, do not touch
  course/[id]/page.tsx        # course detail (via CourseDetailClient.tsx)
  category/[id]/page.tsx      # category detail (via CategoryDetailClient.tsx)
  search/page.tsx             # search — 🔴 RING-FENCED, do not touch
  ranjeet/admin/page.tsx      # admin panel (passcode-protected)
  api/
    orders/route.ts           # order creation — server recomputes ALL prices
    admin/orders/route.ts     # admin order list (exposes items[])
    admin/orders/[id]/approve/route.ts  # approval → emails + WhatsApp
    admin/settings/route.ts   # site settings (sale %, texts, images)
    admin/upload/route.ts     # image uploads (multipart FormData!)
    settings/route.ts         # public settings read
components/
  CartProvider.tsx            # 🔴 RING-FENCED — Harimohan's own work
  HomeClient.tsx              # 🔴 RING-FENCED — Harimohan's own work
  CartDrawer.tsx              # cart + UPI QR + UTR entry
  CourseCard.tsx, HeroSlider.tsx, SearchBar.tsx, OfferStrip.tsx, ...
  NavratriSection.tsx         # festival section (auto-hides 2026-10-20)
  admin/                      # OrdersTab, SettingsTab, CoursesTab, ...
lib/
  sale-pricing.ts             # ⭐ THE sale engine — single source of truth
  default-settings.ts         # DEFAULT_SETTINGS incl. festival offer
  store-data.ts               # server data layer (Supabase → JSON fallback)
  store-hooks.ts              # client data hooks
  store-types.ts              # TypeScript types (Course.bundle_items etc.)
  navratri.ts                 # Navratri day calculation
  notify.ts                   # email/WhatsApp notifications
supabase-migrations/          # run NEW .sql in Supabase SQL Editor BEFORE deploying
tests/                        # vitest suites
```

## 4. Business rules — do not break these

### 4a. Sale engine (`lib/sale-pricing.ts` is law)

- There is **no coupon system**. Coupons were scrapped on 2026-10-13 by
  Harimohan's explicit order. Never add coupon/code UI.
- Admin sets a **discount %** (Settings → 🎉 फेस्टिवल ऑफर). It applies
  **automatically** to every price: product cards, hero, search, modal,
  course pages, cart, UPI amount, order total.
- `getSalePct(settings)` returns 0 when the offer is off/expired → all prices
  revert automatically. No code changes needed to end a sale.
- **Bundle double-discount guard:** cart items with id starting `bundle-`
  already include the sale in their price — `finalItemPrice()` must NOT
  discount them again. Use `isPreDiscountedItem()` / `finalItemPrice()`,
  never raw math.

### 4b. Order flow (money rules)

- `POST /api/orders` **recomputes every price server-side** from the real
  course catalog. Client-sent prices are never trusted.
- **Bundle validation:** `bundle-*` items must carry `bundle_items` (kit IDs).
  Server resolves each kit against the catalog, sums sale-adjusted kit
  prices, applies `settings.bundle_card.discount_percent` (default **5%**),
  and rejects the order on mismatch. **±₹2 rounding tolerance.**
- **Persistence is verified before success:** the API re-reads the order
  after writing. If it can't be retrieved, it returns an **error** — never a
  fake success page.
- Orders live in Supabase `marketplace_orders`, with a backup merge from
  `admin_settings` on read. Approval (`approve/route.ts`) sends per-kit
  Drive links in the **email** and the **admin WhatsApp message**.

### 4c. Content rules

- Customer-facing text stays as-is. Existing Hindi copy is **never**
  converted to English. Code and comments are English.
- **Nothing customer-facing is hardcoded.** Every text, label, discount %,
  image and setting must be editable from the admin panel
  (Settings → relevant tab) with a live preview where practical.
- Template placeholders `{day}` / `{pct}` are filled by
  `fillTemplate()` in `lib/sale-pricing.ts`.

## 5. 🔴 RING-FENCED FILES — DO NOT TOUCH

These files are **Harimohan's own work** (written in his Antigravity IDE).
Another agent session explicitly promised: *"main use bilkul nahi chhoounga."*

```
components/CartProvider.tsx
app/layout.tsx
components/HomeClient.tsx
app/category/[id]/CategoryDetailClient.tsx
app/course/[id]/CourseDetailClient.tsx
app/search/page.tsx
```

**Rules:**
- Do not edit, refactor, "fix", or reformat them. Not even whitespace.
- Do not include them in any push without Harimohan naming them explicitly.
- `git status` showing these as modified does **NOT** mean you authored them.
  Before claiming authorship of ANY local change, check which chat/session
  owns it. When in doubt, ask Harimohan in the owning chat.
- Untracked local files (e.g. `public/images/navratri/`) are his uploads —
  never push, never delete, never "clean up".

## 6. Push protocol — no exceptions

1. **Every push needs Harimohan's explicit per-push approval.** A pasted
   build log, an error report, or deploy urgency is **never** approval.
   There is no hotfix exception.
2. **Name exactly what rides along** before asking: every file, every diff.
   If his uncommitted files are in the tree, say so and get a separate yes.
3. **Size check:** the GitHub push tool rejects files around **~100KB**
   (`SettingsTab.tsx` at 131KB failed). Run `stat -c%s <file>` before
   pushing. Oversize file → give Harimohan a minimal-diff handoff
   (exact lines to find/replace in the GitHub web editor), never a full paste.
4. **Push only what you changed.** Small, surgical commits with clear
   messages (`feat:`, `fix:`).
5. **Verify after every push:** re-download each pushed file from GitHub
   (`get_file_contents`) and diff against local. `ok:true` alone proves
   nothing.
6. **Re-sync local git:** MCP-created commits diverge from local history.
   After verifying remote content: `git fetch origin && git reset --hard origin/main`.
7. **Vercel auto-deploys** `main`. Watch the deployment; a green GitHub push
   is not a green deploy. If the build fails: diagnose, report the exact
   files/diff needed, and **wait for approval** before pushing the fix.

## 7. Design rules

- **Brand color: restrained deep/burnt orange.** Primary CTAs, active
  category, key accents only. Bright orange everywhere looks cheap.
- Premium, simple, honest. **No** dark AI-looking gradients, rotating
  mandalas, particle effects, box-inside-box nesting, or oversized mobile
  sections. Harimohan spots AI-styled design instantly and rejects it.
- Every clickable element gets a **subtle press feedback** (a soft
  "tap registered" feel, not bold/stylish).
- Mobile-first: test `sm:`/`md:`/`lg:` breakpoints; check real mobile widths.

## 8. Data & secrets

- **Production Supabase project ref:** `juhffafyorfjtahscups`. It lives on a
  **different Supabase account** — NOT on `arkado2026@gmail.com` (that
  account hosts only Salagrams + an inactive Prachand project). Always route
  Supabase emails/warnings by project ID before reacting.
- Key tables: `marketplace_orders`, `admin_settings` (settings + order backup).
- **Repo docs carry dummy secrets.** `.env.example` values and any passcode
  in docs (e.g. `7877`) are **not real**. The real `ADMIN_PASSCODE` is long
  and lives only in Vercel env vars + Harimohan's head. Never "fix" docs by
  inserting a real secret, and never commit `.env.local`.
- **NEVER commit:** `data/orders.json` (customer PII — name, phone, UTR),
  `.env*` (except `.env.example`), `public/logo-email.png`,
  `public/images/navratri/` (Harimohan's uploads).
- Never expose paid Drive links, customer order data, or PII in chat,
  reports, or screenshots.

## 9. Admin panel

- URL: `/ranjeet/admin` (passcode-protected; ask Harimohan for the real one).
- Tabs: Orders, Courses, Exams, Categories, Drive Links, **🎉 फेस्टिवल ऑफर**
  (sale on/off, discount %, Devi images, countdown, CTA — all live-editable),
  Settings, and more.
- The **Festival Offer tab** drives the entire sale engine (§4a). The
  **Drive Links tab** shows per-kit readiness (a kit is READY when its
  original Drive link is set).
- Upload endpoint: `POST /api/admin/upload` — send **FormData with NO
  explicit `Content-Type` header** (setting `application/json` kills the
  multipart boundary — this was a real bug on 2026-10-13).

## 10. Known gotchas

- `package-lock.json` is 304KB — **cannot** be pushed via the GitHub push
  tool. Vercel runs `npm install` on deploy, so leaving it unpushed is safe.
- After any dependency change, expect Vercel's install to behave like
  `--legacy-peer-deps` (see `.npmrc` quirk, §2).
- Supabase RLS status of the production project is **unverified** — never
  claim it as checked.
- `data/orders.json` once leaked into git history (commit `442a873`) —
  history purge still pending. Don't repeat it.

---

## Appendix A — Supabase MCP setup plan (research, not yet connected)

Goal: let an AI agent query the production Supabase project directly
(tables, SQL, migrations, logs) instead of working blind.

**Which server:** the official `@supabase/mcp-server-supabase`
(`npx -y @supabase/mcp-server-supabase@latest`). Capabilities: run SQL,
list/design tables, manage migrations, read logs, generate TypeScript types.

**What it needs:**
1. A **Supabase Personal Access Token (PAT)** — created at
   `supabase.com/dashboard/account/tokens` → "Generate New Token".
   ⚠️ The PAT must come from the account that **owns/can access**
   `juhffafyorfjtahscups` (the production project is NOT on Harimohan's
   Gmail Supabase account).
2. The **project ref**: `juhffafyorfjtahscups`.
3. MCP client config (example for Cursor/Claude Code `.mcp.json`):
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@supabase/mcp-server-supabase@latest",
                  "--read-only",
                  "--project-ref=juhffafyorfjtahscups",
                  "--access-token", "<PAT>"]
       }
     }
   }
   ```
   `--read-only` is strongly recommended for an AI agent touching production.

**Steps for Harimohan (his side, ~5 min):**
1. Log in to the Supabase account that owns the production project.
2. Dashboard → Account → Access Tokens → Generate New Token
   (name it e.g. `muse-mcp`, copy it — it shows only once).
3. Hand the token to SherKhan **via the secure vault flow** (never paste
   raw tokens in chat).
4. SherKhan configures the MCP server with `--read-only` + `--project-ref`.
5. Verify: ask the agent to list tables — expect `marketplace_orders`,
   `admin_settings`, etc.

**Alternative (no token):** newer MCP clients support OAuth via
`https://mcp.supabase.com/mcp?project_ref=juhffafyorfjtahscups` — browser
login instead of a pasted token. Preferred when the client supports it.

**Do NOT connect yet** — Harimohan's order was research-only. Connection
happens only on his explicit go-ahead.
