<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Arkado (formerly Sarkari Saathi) — Agent Guide

## Versions (deviate from defaults)

- **Next.js 16.2.6** + **React 19.2.4** — far newer than most training data
- **Tailwind CSS v4** — uses `@import "tailwindcss"` (not `@tailwind` directives) and `@theme inline` for tokens
- **ESLint flat config** (`eslint.config.mjs`) with Next.js core-web-vitals + TypeScript rules
- React 19 ESLint rules are strict: `set-state-in-effect`, `immutability`, `purity` are all enforced

## Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` (runs `next build`) |
| Lint | `npm run lint` (runs `eslint`) |
| Typecheck | `npx tsc --noEmit` (tsconfig is strict) |

No test framework installed. No test/coverage scripts.

## Architecture — current state

The project has evolved from an AI chat guide to a **premium digital marketplace** for government exam study materials (PDF notes, MCQs, mock tests) with instant Google Drive delivery after UPI payment.

| Source | Status | Design system |
|--------|--------|---------------|
| `CLAUDE.md` | **OUTDATED** — V1/V2 AI chat guide | HSL navy/saffron, exam eligibility wizard, OpenRouter AI |
| `ANTIGRAVITY.md` | Roadmap only | Marketplace pivot plan |
| Current code | **TRUTH** | Shopify-minimalist: cream `#fbfbf5`, black, Inter/Noto fonts, pill buttons |

Current code is a **premium e-commerce marketplace** for Indian government exam study materials (PDF notes, MCQs, mock tests) with instant Google Drive delivery after UPI payment.

## Data systems

Two data systems coexist:
- **Static JSON:** `data/categories.json`, `data/exams-new.json`, `data/courses-new.json`, `data/settings.json`, `data/orders.json`
- **Supabase schema** (`supabase-schema.sql`) defines tables but frontend uses localStorage mock auth

## Key file map

- `app/page.tsx` — Homepage: Hero slider, Categories section, Featured bundles, Deals, New Arrivals, FAQ
- `app/course/[id]/page.tsx` — Course detail + syllabus + sticky buy card + CartDrawer
- `app/category/[id]/page.tsx` — Exam list under category
- `app/exams/page.tsx` — Category browser grid
- `app/download/page.tsx` — Post-purchase download page with Google Drive links
- `app/auth/page.tsx` — Mock login (localStorage, no real auth)
- `app/admin/page.tsx` — Admin panel (Categories, Exams, Courses, Orders, Settings)
- `app/admin/components/CategoriesTab.tsx` — Category CRUD + logo upload
- `app/admin/components/ExamsTab.tsx` — Exam CRUD + logo upload
- `app/admin/components/CoursesTab.tsx` — Course CRUD + cover upload + syllabus editor + Drive links
- `app/admin/components/OrdersTab.tsx` — Order management with 1-click WhatsApp/Gmail delivery
- `app/admin/components/SettingsTab.tsx` — UPI, WhatsApp, Email, Razorpay settings
- `components/ProductCard.tsx` — Course card with cover, highlights, price, CTA
- `components/CategoriesSection.tsx` — Horizontal category chips + expandable exam list with logos
- `components/CartDrawer.tsx` — Slide-out cart with UPI QR, WhatsApp/Gmail delivery choice, UTR entry
- `components/HeroSlider.tsx` — Auto-slide carousel with 3D book mockup
- `components/SocialFab.tsx` — Floating share button (WhatsApp, Instagram, Facebook, Gmail)
- `lib/store-data.ts` — Server-side data access (async, uses fs/promises)
- `lib/store-hooks.ts` — Client-side data fetching hooks (useCategories, useExams, useCourses, useSettings)
- `lib/store-types.ts` — TypeScript interfaces (Category, Exam, Course, Order, Settings)
- `lib/exam-labels.ts` — Exam ID → readable label mapping
- `lib/courses.ts` — Course API functions

## Data structure

**Category** (6): State Exams, Police & Defence, Teaching, SSC & Railways, UPSC & PSC, Banking  
**Exam** (35+): Each belongs to a category, has logo, status, dates, posts  
**Course** (6): Each belongs to an exam, has cover, syllabus, highlights, Drive links, pricing  
**Order**: Customer info, UTR, amount, course, delivery mode (WhatsApp/Gmail), status

## Admin panel

- URL: `/admin` | PIN: `7877`
- Tabs: Dashboard, Categories, Exams, Courses, Orders, Settings
- All CRUD persists to JSON files (Supabase fallback exists)

## Settings (data/settings.json)

All user-facing text, branding, payment config, social links are configurable:
- Brand: logo_text, logo_badge_text, tagline, footer_tagline
- Homepage: section titles (Featured Bundles, Hot Deals, New Arrivals, Categories, Newsletter)
- Social: whatsapp_url, instagram_url, facebook_url, gmail_url, share_enabled
- Payment: UPI ID, merchant name, WhatsApp support number, Razorpay keys

## Status

### ✅ DONE
| Feature | Details |
|---------|---------|
| Homepage | Hero slider, Categories with logos, Featured, Deals, New Arrivals, FAQ |
| Categories section | Horizontal chips + expandable exam list with logos, search |
| Course detail | Syllabus, sample PDF, sticky buy card |
| Cart drawer | UPI QR (PhonePe/Paytm/GPay), WhatsApp/Gmail delivery choice, UTR entry |
| Social FAB | Opens share drawer (WhatsApp, Instagram, Facebook, Gmail) |
| Admin panel | 6 tabs, dark theme, full CRUD |
| Category CRUD | Logo upload, priority, color, active toggle |
| Exam CRUD | Logo, status, dates, posts, active toggle |
| Course CRUD | Cover, syllabus editor, Drive links, slider toggle |
| Orders | Search/filter, 1-click WhatsApp/Gmail delivery with pre-filled message |
| Settings | UPI, social links, payment methods, branding — all customizable |
| Branding | Logo text, badge, tagline, footer text — editable from admin |
| Colors | Premium amber/copper theme (not red) |

### ❌ BAKI (Remaining)
| Priority | Feature | Notes |
|----------|---------|-------|
| 🔴 High | Real products (actual PDF/MCQ files) | Only 6 mock items, no actual files |
| 🔴 High | Razorpay live keys on Vercel | `.env.local` → Vercel dashboard env vars |
| 🟡 Medium | Order history page | User can't see past orders |
| 🟡 Medium | WhatsApp order notification | Admin gets WA message on new order |
| 🟡 Medium | Post-payment email delivery | Google Drive link via email |
| 🟢 Low | Blog/About/Contact pages | InfoCards link nowhere |
| 🟢 Low | Search results page | Navbar search form exists but no results page |

## Design system (globals.css)

CSS custom properties for all tokens. Key tokens:
- `--brand: #b45309` (amber-700, premium copper)
- `--brand-hover: #92400e`
- `--brand-soft: #fef3c7`
- `--brand-deep: #1c1917`
- `--accent-success: #059669`
- `--accent-gold: #d97706`

Reusable classes:
- `btn-primary` — amber pill button
- `btn-outline` — stone outline
- `btn-dark` — stone-900 button
- `btn-pill-success` — emerald pill
- `card-base` — white card with hover lift
- `promo-strip` — dark top bar
- `discount-ribbon` — amber corner badge
- `rating-chip` — star + number
- `hero-glow` — warm radial gradients
- `whatsapp-fab` — green FAB

Fonts: CSS `@import` (Inter + Noto Sans Devanagari). No Next.js font loader.

## Important quirks

1. **Server vs Client data**: `lib/store-data.ts` uses `fs/promises` (server-only), `lib/store-hooks.ts` uses `fetch` (client). Don't mix.
2. **Admin auth**: Simple cookie + sessionStorage PIN (`7877`). Not production-ready.
3. **Razorpay**: Real integration exists but disabled. Code in `CartDrawer.tsx` (commented), `app/api/payment/*`.
4. **Image optimization**: Uses `next/image` with `fill` + `sizes`. 3D book mockups in `/public/images/bundles/`.
4. **Category logos**: Custom logos in `/public/logos/categories/` (copied from `for_help/`).
5. **Mobile-first**: All sections use `sm:`, `md:`, `lg:` breakpoints. Navbar has mobile drawer.

## Common tasks

**Add new category**: Admin → Categories → + Add Category (logo, color, priority)  
**Add new exam**: Admin → Exams → + Add Exam (category, logo, status, dates)  
**Add new course**: Admin → Courses → + Add Course (exam, cover, syllabus, Drive links, pricing)  
**Update branding**: Admin → Settings → Brand/Homepage/Social tabs  
**Change colors**: Edit `--brand` in `app/globals.css`  
**Add social link**: Admin → Settings → Social → add URL, enable share

## Recent commits

- `eae98aa` feat: Google OAuth login via Supabase
- `d3e8043` fix: Razorpay real integration
- `e85c5e0` feat: exam page with products, drive_url delivery, /download page
- `6364eb3` fix: book cover design on exam cards
- `be6aa5d` feat: per-exam logo_url with admin upload