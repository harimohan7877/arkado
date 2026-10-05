# 🌌 ANTIGRAVITY — Sarkari Saathi Master Development Guide
## Location: [ANTIGRAVITY.md](file:///c:/Users/Admin/Downloads/mitu's tool/sarkari sathi/sarkari-saathi/ANTIGRAVITY.md)

Welcome to the master blueprint of **Sarkari Saathi**! We are building a premium, 10x fast e-commerce marketplace for exam materials (modeled after Shopify's minimalist and high-end aesthetic).

---

## 🧭 Step-by-Step Roadmap

### 🎨 Step 1: Shopify-Minimalist UI/UX (Front-End Foundation)
*   **Theme:** Clean cream background canvas (`#fbfbf5`) and pure white layouts (`#ffffff`). Accent details in soft aloe/mint green.
*   **Typography:** Outfit and Inter fonts. Display headings styled with light/thin weight (300) and tight tracking for an editorial feel.
*   **Pill Buttons:** Solid black pill buttons (`rounded-full`) are the universal button standard. No sharp rectangular blocks.
*   **Hero Slider:** Rich, deep navy-to-indigo gradient background (`#0a1128` → `#111d44` → `#162447`) with floating ambient glowing blur blobs and a light grid layout. 
*   **Sidebar Dropdown:** Clean list containing **5 Rajasthan Exam Groups** (RSMSSB, Police, Court, Teaching, General Govt). Clicking a group reveals the exams.
*   **Product Cards:** Minimalist card styling using dark slate stylized covers. Card titles are simplified to display **only the exam name** (avoiding long "notes" or "mock tests" text blocks). Cards lift smoothly on hover.
*   **Minimalist Footer:** Near-black background with link lists, WhatsApp support, and a legal disclaimer.
*   **Floating WhatsApp Widget:** Located in the bottom-right corner, linking directly to the support number `7852004401` (AI chatbot is disabled/removed).
*   **Simplified Login:** Clean single-step credentials input (Name/Email) on the cream canvas.

### 🛢️ Step 2: Database Schema & Dynamic Integration (Supabase)
*   **Marketplace Tables (Added in `supabase-schema.sql`):**
    1.  `marketplace_groups`: Exam groups (e.g. `rajasthan-rsmssb-exams`).
    2.  `marketplace_products`: Notes, MCQs, and Mock Tests linked to exams/groups. Contains fields `price`, `sale_price`, `cover_image`, `description`, `language`, `pages`.
    3.  `marketplace_orders`: Captures customer details (name, email), product reference, amount, Razorpay IDs, payment status, and manual delivery status.
*   **Dynamic Fetching:** Write API routes `/api/products` to fetch groups and products dynamically, substituting the mock JSON files.

### 🔑 Step 3: Shopping Cart & Order Checkout
*   LocalState + LocalStorage cart drawer.
*   Secure checkout order record creation in Supabase with payment status `pending`.

### 💳 Step 4: Razorpay & Manual Email Delivery (Jugad)
*   Integrate Razorpay popup on checkout completion.
*   Once payment succeeds, set order status to `paid`.
*   Admin views pending orders, copies the customer's email, and **manually** emails them the Google Drive PDF download link (ensuring absolute security against bypass hacks).

### 👑 Step 5: Admin Panel & Order Management
*   Secure admin view listing customer purchases, emails, and products.
*   Admin dashboard options to mark orders as `delivered` once email has been sent.

---

## 🤝 Local AI (DeepSeek) Workflow
*   Keep [deepseek_handoff.md](file:///c:/Users/Admin/Downloads/mitu's tool/sarkari-saathi/deepseek_handoff.md) updated with modified files.
*   DeepSeek V4 reviews changes locally and logs feedback.
