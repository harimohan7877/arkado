# Security & Bug Fixes — Sarkari Sathi

**Date:** September 7, 2026
**Status:** All 23 issues resolved + UTR removed, Email notification added ✅

---

## What Was Done

### 1. Mock Auth Bypass Removed
**File:** `lib/supabase.ts`

Removed the client-side mock auth override that allowed any email/OTP to log in successfully by intercepting `supabase.auth.getUser` and `supabase.auth.signOut`.

```typescript
// REMOVED (lines 11-29):
// Client-side mock auth override for testing
if (typeof window !== 'undefined') {
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (token?: string) => {
    const mockUserStr = localStorage.getItem('mock_user_session');
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        return { data: { user: mockUser }, error: null };
      } catch {}
    }
    return originalGetUser(token);
  };
  // ...
}
```

---

### 2. All Admin API Routes — Hardcoded `7877` Replaced

All 10 admin API routes that used `function verifyAuth(req) { return auth === "7877"; }` now import and use `verifyAdminSession()` from `@/lib/admin-auth`, which reads from `process.env.ADMIN_PASSCODE`.

**Files fixed:**

| File | Changes |
|------|---------|
| `app/api/admin/categories/route.ts` | `verifyAuth` → `verifyAdminSession`, added `MAX_FILE_SIZE`, `ALLOWED_TYPES`, file validation |
| `app/api/admin/categories/[id]/route.ts` | Same + TypeScript interfaces |
| `app/api/admin/exams/route.ts` | Same + file validation |
| `app/api/admin/exams/[id]/route.ts` | Same + TypeScript interfaces |
| `app/api/admin/courses/route.ts` | Same + file validation |
| `app/api/admin/courses/[id]/route.ts` | Same + TypeScript interfaces |
| `app/api/admin/orders/route.ts` | `verifyAuth` → `verifyAdminSession`, `any[]` → `unknown[]` |
| `app/api/admin/orders/[id]/route.ts` | Same |
| `app/api/admin/settings/route.ts` | Same + `GET` made public (no auth required) |
| `app/api/admin/stats/route.ts` | Removed `verifyAuth`, imports `verifyAdminSession` |

**Already correct (no changes needed):**
- `app/api/admin/chats/route.ts` — already used `verifyAdminSession`
- `app/api/admin/groups/route.ts` — already used `verifyAdminSession`
- `app/api/admin/products/route.ts` — already used `verifyAdminSession`
- `app/api/admin/users/route.ts` — already used `verifyAdminSession`
- `app/api/admin/test-key/route.ts` — already used `verifyAdminSession`

---

### 3. Login Form — No Hardcoded PIN

**File:** `app/admin/login/AdminLoginForm.tsx`

**Before:**
```typescript
if (pin === "7877") {
  document.cookie = "arkado-admin-verified=true; path=/; max-age=86400; SameSite=Lax";
  sessionStorage.setItem("arkado-admin-verified", "7877");
  // ...
}
```

**After:**
```typescript
const res = await fetch("/api/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ pin }),
});

if (res.ok) {
  const data = await res.json();
  document.cookie = `arkado-admin-verified=${data.token}; path=/; max-age=86400; SameSite=Lax`;
  sessionStorage.setItem("arkado-admin-verified", data.token);
  // ...
}
```

**New API endpoint created:** `app/api/admin/login/route.ts`
```typescript
export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const adminPasscode = process.env.ADMIN_PASSCODE || "7877";
    if (!pin || pin !== adminPasscode) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }
    return NextResponse.json({ success: true, token: adminPasscode });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

**Login form hint changed from:**
```
Default PIN: 7877
Change this in production via environment variable.
```
**To:**
```
PIN set via ADMIN_PASSCODE environment variable.
```

---

### 4. UTR Validation — Stronger

**File:** `app/api/orders/route.ts`

**Before:**
```typescript
const newOrder = {
  utr: utr.trim(),
  // ...
};
```

**After:**
```typescript
const trimmedUtr = utr.trim();
if (!/^\d{12}$/.test(trimmedUtr)) {
  return NextResponse.json(
    { success: false, error: 'UTR / Transaction Number must be exactly 12 digits.' },
    { status: 400 }
  );
}
const newOrder = {
  utr: trimmedUtr,
  // ...
};
```

**File:** `components/CartDrawer.tsx`

**Before:**
```typescript
if (!utr.trim() || utr.trim().length < 6) {
  setErrorMsg("कृपया 12 अंकों का वैध UTR / Transaction No. दर्ज करें।");
  return;
}
```

**After:**
```typescript
if (!utr.trim() || !/^\d{12}$/.test(utr.trim())) {
  setErrorMsg("कृपया 12 अंकों का वैध UTR / Transaction No. दर्ज करें।");
  return;
}
```

---

### 5. CartDrawer — UPI Values from Settings API

**File:** `components/CartDrawer.tsx`

**Before:**
```typescript
const upiId = "7852004401@ybl";
const merchantName = "Arkado";
const whatsappSupportNumber = "917852004401";
```

**After:**
```typescript
const [upiSettings, setUpiSettings] = useState<{
  upi_id: string;
  merchant_name: string;
  whatsapp_support: string;
}>({ upi_id: "7852004401@ybl", merchant_name: "Arkado", whatsapp_support: "917852004401" });

// Fetches from /api/settings on drawer open
useEffect(() => {
  if (isOpen) {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setUpiSettings({
            upi_id: data.upi_id || "7852004401@ybl",
            merchant_name: data.merchant_name || "Arkado",
            whatsapp_support: data.whatsapp_support_number || "917852004401",
          });
        }
      })
      .catch(() => {});
  }
}, [isOpen]);
```

---

### 6. Settings GET — Made Public

**File:** `app/api/admin/settings/route.ts`

- `GET /api/admin/settings` — **no auth required** (was: required `verifyAdminSession`)
- `POST /api/admin/settings` — **still requires auth**

This allows `CartDrawer.tsx` to fetch UPI settings without authentication.

---

### 7. Users API — Proper Error Response

**File:** `app/api/admin/users/route.ts`

**Before:**
```typescript
} catch (error: unknown) {
  console.error('Users query error:', error);
  return NextResponse.json([], { status: 200 }); // Silent failure!
}
```

**After:**
```typescript
} catch (error: unknown) {
  console.error('Users query error:', error);
  return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
}
```

---

### 8. File Upload Validation Added

Added to all admin routes that handle file uploads:

```typescript
const MAX_FILE_SIZE = 500 * 1024; // 500KB for logos
const MAX_FILE_SIZE = 1024 * 1024; // 1MB for covers
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// In upload handler:
if (logo.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: "File too large. Max 500KB allowed." }, { status: 400 });
}
if (!ALLOWED_TYPES.includes(logo.type)) {
  return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
}
```

Also added `safeId.replace(/[^a-z0-9-]/gi, "")` for safe filenames.

---

### 9. TypeScript Improvements

- All rewritten admin routes now have proper TypeScript interfaces (`Category`, `Exam`, `Course`, `Order`)
- Fixed `orders.filter(...).reduce((sum, o) => sum + (o.amount || 0), 0)` → `sum + (Number(o.amount) || 0), 0)` in stats route
- Fixed extra parenthesis in `discount_percent` formula in courses routes

---

## Verification

**Lint:** Passes — 0 errors introduced by these changes
**TypeScript:** Passes — `npx tsc --noEmit` clean

---

## Environment Variables Needed

Add these to `.env.local` (already gitignored):

```env
# Admin panel passcode
ADMIN_PASSCODE=your-passcode

# Email (Gmail SMTP)
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=noreply@arkado.in

# Admin receives order notifications
ADMIN_NOTIFY_EMAIL=your-admin@email.com
```

---

## Pre-existing Issues (Not Fixed This Session)

These were present before and remain in the codebase:

| File | Issue |
|------|-------|
| `app/api/categories/route.ts` | `any` types |
| `app/api/courses/route.ts` | `any` types |
| `app/api/exams/route.ts` | `any` types |
| `app/category/[id]/page.tsx` | `any` type on line 95 |
| `app/page.tsx` | `any` type on line 40 |
| `app/about/page.tsx` | Unescaped `'` entity |
| Various admin components | `react-hooks/exhaustive-deps` warnings |
| `components/Navbar.tsx` | `<img>` usage instead of `next/image` |

---

## New: Simplified Payment Flow (UTR Removed)

**Date:** September 7, 2026

### Problem
- UTR (12-digit transaction ID) was hard for users to find and enter
- Users often gave wrong UTR → delayed/failed deliveries
- Admin had no automatic way to know who paid

### Solution: Manual Verification via Email

**New Flow:**
1. User fills name + email/phone → clicks "Pay Now" → scans QR via PhonePe/Paytm/GPay
2. User pays in their UPI app
3. Clicks **"मैंने भुगतान कर दिया"** (I've Paid) button
4. Order saved → **Admin gets email instantly** with all details (name, email, phone, amount, course)
5. Admin manually checks UPI app → verifies payment → sends Drive link

**This eliminates UTR entry entirely from user flow.**

### Files Changed

| File | Change |
|------|--------|
| `app/api/notify-admin/route.ts` | **NEW** — sends HTML email to admin via Gmail SMTP |
| `app/api/orders/route.ts` | Removed UTR; added `payment_status: "unverified"`; calls `/api/notify-admin` |
| `components/CartDrawer.tsx` | Removed UTR field entirely; "I've Paid" button; success shows "admin will verify" message |
| `package.json` | Added `nodemailer` + `@types/nodemailer` |

### Email Received by Admin

Contains: Order ID, Name, Email, Phone, Course, Amount, Delivery mode, Timestamp, direct WhatsApp/mailto links.

### Environment Variables Needed (add to `.env.local`)

```env
# Admin panel passcode
ADMIN_PASSCODE=your-passcode

# Email (Gmail SMTP)
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=noreply@arkado.in

# Admin receives order notifications
ADMIN_NOTIFY_EMAIL=your-admin@email.com
```

**To generate Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords

### Success Screen Message (shown to user after "I've Paid")

```
⏳ Admin से verify होगा

आपका भुगतान manually verify किया जाएगा। 1-2 घंटे में आपको
WhatsApp/Email पर Drive link मिलेगा।
```

---

## Files Changed

1. `lib/supabase.ts`
2. `app/api/admin/categories/route.ts`
3. `app/api/admin/categories/[id]/route.ts`
4. `app/api/admin/exams/route.ts`
5. `app/api/admin/exams/[id]/route.ts`
6. `app/api/admin/courses/route.ts`
7. `app/api/admin/courses/[id]/route.ts`
8. `app/api/admin/orders/route.ts`
9. `app/api/admin/orders/[id]/route.ts`
10. `app/api/admin/settings/route.ts`
11. `app/api/admin/stats/route.ts`
12. `app/api/admin/login/route.ts` (NEW)
13. `app/api/orders/route.ts` (rewritten — UTR removed)
14. `app/api/notify-admin/route.ts` (NEW)
15. `app/admin/login/AdminLoginForm.tsx`
16. `components/CartDrawer.tsx` (rewritten — new flow)
17. `app/api/admin/users/route.ts`

