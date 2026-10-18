# Multi-Tenant, Multi-Branch Clothing Retail POS (Frontend)

Production-ready frontend foundation for a multi-tenant, multi-branch clothing retail POS tailored for the Bangladesh retail market.

Built with **Next.js (App Router)**, **TypeScript (Strict)**, **Tailwind CSS**, **TanStack Query (React Query)**, **React Hook Form + Zod**, and **Zustand** (strictly scoped for auth and branch context).

---

## Table of Contents
1. [Quick Start & Running Locally](#quick-start--running-locally)
2. [Environment Variables](#environment-variables)
3. [Folder Structure & Architecture Conventions](#folder-structure--architecture-conventions)
4. [How-To Guides](#how-to-guides)
   - [How to Add a New Page](#1-how-to-add-a-new-page)
   - [How to Add a Sidebar Menu Item](#2-how-to-add-a-sidebar-menu-item)
   - [How to Add a Permission Guard](#3-how-to-add-a-permission-guard)
5. [Backend Endpoints Reference](#backend-endpoints-reference)
6. [Design Decisions & Architectural Notes](#design-decisions--architectural-notes)

---

## Quick Start & Running Locally

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x (or npm >= 10.x)
- Running Backend instance (NestJS) on port 4000

### 1. Start the Backend
```bash
cd backend
npm install
npm run start:dev
# Running at http://localhost:4000 (API prefix: /api/v1)
```

### 2. Start the Frontend
```bash
cd frontend
pnpm install
pnpm dev
# Running at http://localhost:3000
```

### 3. Run Tests
```bash
# Frontend test suite (Vitest + React Testing Library)
cd frontend
pnpm test

# Production build verification
pnpm build
```

---

## Environment Variables

Create `.env.local` inside the `frontend` folder (or copy from `.env.example`):

```bash
# Public API URL used by browser client
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Internal API URL used by Next.js Route Handlers (BFF proxy)
INTERNAL_API_URL=http://localhost:4000/api/v1
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000/api/v1` | Target base URL for direct client-side fetch calls (if any) |
| `INTERNAL_API_URL` | Yes | `http://localhost:4000/api/v1` | Server-to-server endpoint for Next.js BFF proxy (`/api/auth/*`) |

---

## Folder Structure & Architecture Conventions

The project follows a **domain-driven, feature-based architecture** under `src/`:

```
frontend/
├── src/
│   ├── app/                                 # Next.js App Router
│   │   ├── (public)/                        # Public layout (Landing, Login, Register, Forgot Password)
│   │   │   ├── layout.tsx                   # Public navbar + footer
│   │   │   ├── page.tsx                     # Landing / Home page
│   │   │   ├── login/page.tsx               # Login with rememberMe & error mapping
│   │   │   ├── register/page.tsx            # Shop onboarding (business + owner + first branch)
│   │   │   └── forgot-password/page.tsx     # Password reset flow placeholder
│   │   ├── (app)/                           # Authenticated App Shell layout
│   │   │   ├── layout.tsx                   # ProtectedRoute + AppShell (Sidebar, TopBar, Breadcrumbs)
│   │   │   ├── dashboard/page.tsx           # Main POS dashboard overview
│   │   │   ├── roles/page.tsx               # Roles & permissions matrix
│   │   │   ├── users/page.tsx               # User management & branch access editor
│   │   │   └── profile/page.tsx             # Profile, password reset, active sessions list
│   │   ├── api/auth/                        # Next.js BFF Route Handlers (Cookie Proxy)
│   │   │   ├── login/route.ts               # Sets httpOnly pos_token cookie
│   │   │   ├── logout/route.ts              # Revokes token & clears cookie
│   │   │   └── session/route.ts             # Restores session via /auth/me
│   │   ├── dev/components/page.tsx          # Component showcase & documentation page
│   │   ├── error.tsx                        # Global error boundary (500)
│   │   ├── not-found.tsx                    # Custom 404 page
│   │   ├── layout.tsx                       # Root layout with Noto Sans Bengali font & Providers
│   │   └── globals.css                      # Tailwind v4 theme & base typography
│   ├── components/                          # UI & Layout Components
│   │   ├── auth/                            # ProtectedRoute, Auth guards
│   │   ├── feedback/                        # Toast, OnlineIndicator, SuspendedNotice, PlanLimitDialog, 403
│   │   ├── layout/                          # AppSidebar, AppTopBar, Breadcrumbs, PublicNavbar, Footer
│   │   ├── shared/                          # Reusable building blocks:
│   │   │   ├── ConfirmDialog.tsx            # Dialog with standard & required reason variants
│   │   │   ├── DataTable.tsx                # Server-paginated table with sorting & empty states
│   │   │   ├── FormFieldWrapper.tsx         # Input wrapper with field error mapping
│   │   │   ├── PermissionGate.tsx           # Permission conditional renderer & usePermission hook
│   │   │   ├── PhoneInput.tsx               # BD (+880) phone input with live normalization
│   │   │   ├── SearchInput.tsx              # Debounced search input
│   │   │   └── StatusBadge.tsx              # Consistent status chips
│   │   ├── ui/                              # Primitive UI components (Button, Input, Badge, Skeleton)
│   │   └── providers/                       # AppProviders (QueryClient, Theme, I18n, Toast)
│   ├── lib/
│   │   ├── api/                             # API Client & Error Handling
│   │   │   ├── client.ts                    # Unified fetcher (token + x-branch-id injection, body sanitizing)
│   │   │   ├── endpoints.ts                 # Strongly typed backend API methods
│   │   │   └── errors.ts                    # Normalized ApiError hierarchy (401, 403, 409, 422, SUSPENDED)
│   │   ├── config/
│   │   │   ├── env.ts                       # Validated environment configuration
│   │   │   └── navigation.ts                # Single source of truth for sidebar menu items & permissions
│   │   ├── i18n/                            # Bilingual translation system (Bangla default, English)
│   │   │   ├── translations/
│   │   │   │   ├── bn.ts                    # Bangla language dictionary
│   │   │   │   └── en.ts                    # English language dictionary
│   │   │   └── index.tsx                    # I18nProvider, useTranslation hook
│   │   ├── store/                           # Zustand Stores (strictly scoped)
│   │   │   ├── auth-store.ts                # User, business, permissions, token, subscription status
│   │   │   └── branch-store.ts              # Branches, active branch, switchBranch (with query cache clear)
│   │   ├── theme/                           # Light/dark theme provider & hook
│   │   └── utils/                           # Formatters, BD phone normalization, idempotency key
│   └── test/                                # Vitest test suites
```

---

## How-To Guides

### 1. How to Add a New Page

1. Create a new directory and `page.tsx` file inside `src/app/(app)/<your-route>/page.tsx`.
2. Add `'use client'` at the top (to support offline capabilities and client-side interactions).
3. If the page requires a specific permission, pass it into `ProtectedRoute` or use `<PermissionGate>`:

```tsx
'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { PermissionGate } from '@/components/shared/PermissionGate';

export default function MyNewPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permission="inventory.view"
      fallback={<div className="p-4">আপনি এই পেজটি দেখতে অনুমোদিত নন।</div>}
    >
      <div className="space-y-4">
        <h1 className="text-xl font-bold">আমার নতুন পেজ</h1>
        <p className="text-slate-600 dark:text-slate-400">কনটেন্ট এখানে লিখুন...</p>
      </div>
    </PermissionGate>
  );
}
```

### 2. How to Add a Sidebar Menu Item

All sidebar items are defined in **ONE place**: `src/lib/config/navigation.ts`.

1. Open `src/lib/config/navigation.ts`.
2. Add a new item to `NAVIGATION_ITEMS`:

```typescript
{
  route: '/inventory',
  labelKey: 'nav.inventory', // Translation key from bn.ts / en.ts
  icon: 'Layers',           // Any icon key from Lucide
  requiredPermission: 'inventory.view', // Optional: hides the item if user lacks this code
}
```

3. Add the translation string in `src/lib/i18n/translations/bn.ts` and `en.ts`:
   - `bn.ts`: `'nav.inventory': 'ইনভেন্টরি'`
   - `en.ts`: `'nav.inventory': 'Inventory'`

The sidebar and mobile drawer will automatically reflect the item and filter it by user permissions.

### 3. How to Add a Permission Guard

#### Method A: Component Guard (`<PermissionGate />`)
Wrap any UI action, button, or section:
```tsx
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';

// Hides completely if permission missing:
<PermissionGate permission="users.create">
  <Button onClick={openCreateModal}>নতুন ইউজার তৈরি করুন</Button>
</PermissionGate>

// Or disables the button instead of hiding:
<PermissionGate permission="users.edit" disableOnly>
  <Button onClick={handleEdit}>সম্পাদনা</Button>
</PermissionGate>
```

#### Method B: React Hook (`usePermission`)
Check programmatically within logic:
```tsx
import { usePermission } from '@/components/shared/PermissionGate';

const { hasPermission } = usePermission('roles.delete');

if (!hasPermission) {
  // block action
}
```

---

## Backend Endpoints Reference

All API calls are routed through `src/lib/api/client.ts` which automatically:
- Injects `Authorization: Bearer <token>`
- Injects `x-branch-id: <active-branch-uuid>`
- Strips any accidental `business_id` or `branch_id` from request bodies
- Normalizes server error formats (401, 403, 409, 422, `SUBSCRIPTION_SUSPENDED`, `PLAN_LIMIT_REACHED`)

| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/auth/login` | POST | Existing | Accepts identifier (email/phone), password, optional slug |
| `/auth/me` | GET | Existing | Returns user info, business, roles, and flattened permissions array |
| `/auth/profile` | PATCH | **Added to Backend** | Updates user's first/last name, phone, email |
| `/auth/change-password` | POST | Existing | Changes password for current session |
| `/auth/sessions` | GET | Existing | Lists all active device sessions for current user |
| `/auth/sessions/:id` | DELETE | Existing | Revokes specific session |
| `/auth/sessions` | DELETE | Existing | Revokes all active sessions |
| `/onboarding/register` | POST | Existing | Registers business + owner + initial branch |
| `/branches` | GET | Existing | Lists accessible branches for current business |
| `/branches` | POST | Existing | Creates a new branch (protected by plan limits) |
| `/permissions` | GET | **Added to Backend** | Lists all available system permissions grouped by module |
| `/roles` | GET | **Added to Backend** | Lists all roles for business, with counts and permissions |
| `/roles` | POST | **Added to Backend** | Creates custom role with permission assignments |
| `/roles/:id` | GET | **Added to Backend** | Retrieves role details |
| `/roles/:id` | PATCH | **Added to Backend** | Updates role name, description, and permissions |
| `/roles/:id` | DELETE | **Added to Backend** | Deletes role (prevents deletion of System roles or in-use roles) |
| `/users` | GET | **Added to Backend** | Lists users with search, role filter, branch filter, pagination |
| `/users` | POST | **Added to Backend** | Creates user with role and branch assignments (enforces plan limit) |
| `/users/:id` | GET | **Added to Backend** | Retrieves user details with branch assignments |
| `/users/:id` | PATCH | **Added to Backend** | Updates user info and role |
| `/users/:id/status` | PATCH | **Added to Backend** | Toggles isActive (prevents deactivating owner or self) |
| `/users/:id/branches` | PUT | **Added to Backend** | Updates branch access (enforces at least 1 branch & 1 default) |
| `/users/:id/reset-password` | POST | **Added to Backend** | Administrative password reset for user |

*Endpoints marked as **Added to Backend** were implemented in `backend/src/modules/role` and `backend/src/modules/user` adhering to all existing Prisma schema rules, plan limit checks, and audit logging.*

---

## Design Decisions & Architectural Notes

### 1. Token Storage: HttpOnly Cookie Proxy via Route Handler
- **Decision**: In production web applications, storing JWTs directly in `localStorage` exposes them to XSS attacks. We implemented Next.js Route Handlers (`/api/auth/login`, `/api/auth/logout`, `/api/auth/session`) that act as a BFF (Backend-for-Frontend) proxy.
- **Mechanism**:
  - Upon successful login, the Route Handler sets a `pos_token` cookie with `httpOnly: true`, `secure: true` (in production), `sameSite: 'lax'`, and `path: '/'`.
  - When the frontend reloads, `/api/auth/session` validates the cookie against backend `/auth/me` and returns the session.
  - The access token is simultaneously held in-memory in Zustand for instant client-side header dispatch.
  - No tokens are ever written to `localStorage` or printed in console logs.

### 2. Multi-Branch Isolation & Cache Eviction
- **Rule**: Never leak data from Branch A into Branch B when a manager or cashier switches branches.
- **Implementation**:
  - `useBranchStore.switchBranch(branch)` immediately invokes `queryClient.clear()`.
  - This purges all TanStack Query in-memory caches (inventory, sales, cart, users, reports) so stale data from the previous branch can never be rendered.
  - The newly active `branch.id` is sent as the `x-branch-id` HTTP header on all subsequent requests.

### 3. Body Sanitization Rule
- **Rule**: `business_id` and `branch_id` must never be sent in JSON request bodies.
- **Implementation**:
  - In `lib/api/client.ts`, an automatic sanitizer clones any payload and strips `business_id`, `branch_id`, `businessId`, and `branchId` before serialization.
  - The backend derives tenancy solely from the verified JWT `business_id` and the `x-branch-id` header.

### 4. Idempotency Key Handling
- Create operations (sales, transfers, onboarding) generate a UUID v4 via `generateIdempotencyKey()` once when the form opens.
- If a network error occurs or user retries submission, the exact same key is reused, preventing duplicate transactions on the backend.

### 5. Localization & Typography
- Primary default locale is **Bangla (`bn`)** with a one-click toggle to English (`en`).
- All strings are structured in `src/lib/i18n/translations/`.
- Uses Google Fonts **Noto Sans Bengali** with clean font weights (`300`, `400`, `500`, `600`, `700`) and fallback to Inter/system sans for English.
- Phone numbers follow the Bangladesh national numbering plan (`013`-`019`), accepting raw formats (`+8801...`, `8801...`, `01...`) and displaying a normalized standard format.
- Currency is formatted using the BDT symbol (`৳`) with standard South Asian numbering format.

### 6. Security Headers & CSP
- `next.config.ts` enforces strict HTTP headers:
  - `Content-Security-Policy`: Disallows unsafe inline scripts/eval, restricts connect sources to API origins.
  - `X-Frame-Options: DENY`: Prevents clickjacking.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`.

---

## Phase F2 - Catalog & Inventory UI Reference

### 1. Catalog Routes & Screens

| Route | Purpose | Key Capabilities |
|---|---|---|
| `/catalog/master-data` | Business-wide Master Data management | Category hierarchical tree view (blocks delete if children/products exist), Brand, Season, Size (sort order), Color (hex swatch picker), Unit (allow_decimal toggle). System presets marked read-only. |
| `/products` | Product Catalog List | Server-side paginated DataTable, multi-branch chips (Admin only), stock in current branch, retail price ranges, quick barcode search shortcut, CSV export with formula injection prevention, batch CSV import. |
| `/products/new` | Single-page Product Create | Basic garment attributes, bulk variant generator (sizes x colors Cartesian product), single variant toggle, advisory price warning, branch assignment (multi-select for admin, auto-bound for branch staff), 409 field mapping. |
| `/products/[id]` | Product Detail Hub | 6 comprehensive tabs: Overview, Variants, Stock (with cost gating & admin multi-branch matrix), Branches (activate/deactivate with force stock override), Barcode Labels shortcut, Movement History (live stock ledger). |
| `/products/[id]/edit` | Product Edit Form | Modify attributes, add new variants, deactivate existing variants, change tracking mode with safety confirmations. |
| `/catalog/barcodes` | Thermal & Sheet Barcode Designer | Thermal presets (50x30mm, 38x25mm), A4 24-label sheet grid, custom mm dimensions, field toggles, audit print logging (`INITIAL_PRINT` vs `REPRINT` with mandatory reason), client-side SVG rendering via JsBarcode. |
| `/catalog/lookup` | Scanner-Aware Barcode Tool | Handles hardware scanner keystrokes (<45ms) vs manual typing. Renders 3 discrete cases: active in branch, `PRODUCT_IN_OTHER_BRANCH` (`OtherBranchStockPanel`), and 404 with pre-filled create shortcut. |
| `/catalog/price-lists` | Custom Price Lists | Business-wide price list management (Retail, Wholesale tiers, Festive campaigns). |
| `/catalog/price-lists/[id]` | Price List Items Editor | Variant price overrides table, bulk price adjustments (% or fixed BDT) using `decimal.js`, CSV import & export with validation. |

---

### 2. Phase F2 Backend Endpoints Used

| Endpoint | Method | Backend Status | Frontend Implementation Notes |
|---|---|---|---|
| `/api/v1/catalog/categories` | GET, POST | Existing | Lists category tree / creates new category |
| `/api/v1/catalog/categories/:id` | PATCH, DELETE | Existing | Updates category / Deletes category (400 if children exist) |
| `/api/v1/catalog/brands` | GET, POST, PATCH, DELETE | Existing | Full Brand CRUD |
| `/api/v1/catalog/seasons` | GET, POST, PATCH, DELETE | Existing | Full Season CRUD |
| `/api/v1/catalog/sizes` | GET, POST, PATCH, DELETE | Existing | Full Size CRUD with `sortOrder` |
| `/api/v1/catalog/colors` | GET, POST, PATCH, DELETE | Existing | Full Color CRUD with `hexCode` |
| `/api/v1/catalog/units` | GET, POST, PATCH, DELETE | Existing | Full Unit CRUD with `allowDecimal` |
| `/api/v1/catalog/products` | GET | Existing | Paginated listing with search, filters, branch context |
| `/api/v1/catalog/products` | POST | Existing | Single request creates product + variants + branch activation |
| `/api/v1/catalog/products/:id` | GET, PATCH, DELETE | Existing | Retrieves product detail, variants, branch balances |
| `/api/v1/catalog/product-branches/activate` | POST | Existing | Admin-only activation of product in another branch |
| `/api/v1/catalog/product-branches/deactivate` | POST | Existing | Admin-only deactivation; rejects if branch has stock unless `force: true` |
| `/api/v1/catalog/barcodes/print` | POST | Existing | Audit log for label printing; enforces reason on `REPRINT` |
| `/api/v1/catalog/barcodes/lookup/:barcode` | GET | Existing | Scans barcode and returns branch status and stock |
| `/api/v1/catalog/price-lists` | GET, POST | Existing | List and create price lists |
| `/api/v1/catalog/price-lists/:id` | GET, PATCH | Existing | Retrieve price list and update settings |
| `/api/v1/catalog/price-lists/:id/items` | POST | Existing | Set or update item price override |
| `/api/v1/catalog/price-lists/:id/items/:variantId` | DELETE | Existing | Remove variant override from price list |
| `/api/v1/inventory/stock/all-branches-summary` | GET | Existing | Admin-only stock summary across all branches (used for matrix) |
| `/api/v1/inventory/stock/movements` | GET | Existing | Stock movement ledger (used for History tab) |

*Note on Missing Backend Endpoints: No dedicated bulk product CSV import endpoint exists on the backend. The frontend implements client-side parsing, validation, and batched creation.*

---

### 3. Key Design Decisions

#### Cost Visibility & Role Gating
- The backend catalog API does not expose a discrete `products.view_cost` permission.
- **Rule applied**: Average cost prices and total inventory valuation figures are strictly hidden from users unless they possess the `products:update` permission or are a business owner (`user.isOwner`). Cashiers and read-only sales staff see retail and wholesale prices only.

#### CSV Import & Formula Injection Protection
- **Approach**: In the absence of a server-side bulk import endpoint, the frontend parses CSV files client-side, validates headers and rows, presents a preview table with per-row validation errors, and posts records in sequential batches of 5 with an animated progress bar.
- **Security (CWE-1236)**: Every cell exported to CSV is evaluated for spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`). If detected, the cell is prepended with a single quote (`'`) to neutralize formula execution in Microsoft Excel or Google Sheets.

#### Label Printing & CSS Architecture
- Label printing uses a dedicated global `@media print` stylesheet.
- **Thermal printers (50x30mm, 38x25mm, custom)**:
  - `@page { size: <width>mm <height>mm; margin: 0; }`
  - `.printable-label { break-after: page; page-break-after: always; }`
  - Ensures each label feeds cleanly on thermal roll printers without margin drift.
- **A4 Sheets**:
  - `@page { size: A4 portrait; margin: 10mm; }`
  - Uses CSS Grid (`grid-template-columns: repeat(3, 1fr)`) with `break-inside: avoid` for 24-label sheets.
- **Bangla Support**: Uses Google Fonts Noto Sans Bengali with embedded web fonts to guarantee clean typographic rendering on thermal and ink/laser printers.

---

## Phase F3 - Purchasing & Stock UI Reference

### 1. Purchasing & Stock Routes & Screens

| Route | Purpose | Key Capabilities |
|---|---|---|
| `/purchases/suppliers` | Suppliers Management | Business-wide supplier list, search, status filter, current balance column (styled in red if we owe money), create/edit modal with auto code generator, PhoneInput, opening balance (create only), soft delete with confirm, 409 conflict field mapping, formula-injection safe CSV export. |
| `/purchases/suppliers/[id]` | Supplier Detail Hub | Profile card with balance KPIs, running ledger tab (Purchases, Returns, Payments, date range filter, CSV export with formula injection guard), quick action shortcuts (New Purchase, Pay Supplier, Return Goods). |
| `/purchases/orders` | Purchase Orders List | Status filter tabs (`DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, `COMPLETED`, `CANCELLED`), search, issue action, cancel action with required reason, and "Receive Goods" shortcut pre-filling remaining quantities. |
| `/purchases/orders/new` | Create Purchase Order | Create PO in `DRAFT` status: supplier selector with inline quick-create, expected delivery date, notes, variant search or hardware barcode scan, duplicate-variant merging, quantity input, unit cost, decimal math totals. Pre-fills items from low-stock report if `?source=low_stock`. |
| `/purchases/orders/[id]` | Purchase Order Detail | Line items with ordered vs received quantities, visual progress bars, issue and cancel actions, and "Receive Goods" shortcut opening purchase form pre-filled with remaining quantities. |
| `/purchases` | Purchases (Goods Receipts) List | Date range filter, supplier filter, status filter, search, page totals summary row, Cancel Purchase (with required reason, showing backend refusal when stock was already sold), Add Payment action shortcut. |
| `/purchases/new` | Purchase (Goods Receipt) Form | **High-speed receiving screen**: supplier with inline quick-create, invoice #, purchase date, optional PO link. Hardware barcode scanner auto-increments quantity or adds row. Duplicate-variant merge. Whole-number enforcement for tracked items. Unit cost divergence >20% advisory warning banner. Landed cost checkbox. Totals preview via `decimal.js`. Payment now (validated `<= total`). Draft persistence in `localStorage` keyed by `(branchId, userId)`. Idempotency key per form open. Post-success screen with "Print Barcode Labels for These Units" linking to label printer pre-filled with returned `ProductUnit` barcodes. |
| `/purchases/[id]` | Purchase Detail Hub | Header info, line items, applied payments list, return memos, tracked individual product units grid with barcode badges, cancel and payment action shortcuts. |
| `/purchases/payments` | Supplier Payments List | Payment records list, supplier filter, search, CSV export, record payment modal with overpayment protection (`payAmount <= purchaseDue`). |
| `/purchases/payments/[id]` | Printable Payment Voucher | Payment receipt voucher with `@media print` styling and Bangla-safe typography. |
| `/purchases/returns` | Purchase Returns List | Returns list with status filters (`DRAFT`, `COMPLETED`, `CANCELLED`), search, printable return note shortcut. |
| `/purchases/returns/new` | Create Purchase Return | Standalone or pre-filled from purchase with `maxReturnable = purchased - already returned`. Server validation error display when return exceeds limit. |
| `/purchases/returns/[id]` | Purchase Return Detail | Return detail with items list, Complete (DRAFT -> COMPLETED) and Cancel actions, printable debit note with print CSS. |
| `/inventory/stock` | Branch Stock Overview | DataTable of variants: product, size, color, brand, category, quantity, allocated, available, status chip (`OK`, `Low`, `Zero`, `Negative`), totals footer (qty and value from server), CSV export. Cost columns permission-gated. Admin All-Branches matrix view with brand/category grouping toggle. Movement history drawer with source document route links. |
| `/inventory/stock/low-stock` | Low Stock & Reorder Suggestions | Variants below or at reorder level, shortage calculation (`reorder_level - available`), checkbox multi-selection with "Create Purchase Order from Selected" shortcut pre-filling PO. CSV export. |
| `/inventory/stock/valuation` | Stock Valuation Report | Permission-gated branch valuation report: total cost value (BDT), total units, category and brand breakdown tables, CSV export. |
| `/inventory/opening` | Opening Stock Entry | Screen to enter initial stock and unit cost: barcode scan, catalog search, bulk entry table, CSV import with validation and per-row errors. Shows backend refusal message when movements already exist with a shortcut button to create a Stock Adjustment. |
| `/inventory/transfers` | Stock Transfers Hub | Outgoing tab, Incoming tab (with 60-second polling for live transfer requests), and All tab (Admin only). Status filters (`PENDING`, `IN_TRANSIT`, `RECEIVED`, `REJECTED`, `CANCELLED`). Action awaiting indicators. Auto badge for POS sales cross-branch transfers. |
| `/inventory/transfers/new` | Initiate Stock Transfer | Destination branch selector (strictly excludes current branch), variant search and barcode scanning, available stock in source branch display, quantity validation (`<= available`), notes, submits as `PENDING`. |
| `/inventory/transfers/[id]` | Stock Transfer Detail & Receive | Status timeline (Created -> Dispatched -> Received / Rejected / Cancelled). Dispatch action (source). Cancel action (source). Receive modal (destination users only): sent vs received quantity, mandatory discrepancy note when `received < sent`, discrepancy summary. Reject action with mandatory reason. Printable transfer slip. |
| `/inventory/adjustments` | Stock Adjustments List | Adjustments list with status filters (`DRAFT`, `APPROVED`, `CANCELLED`), search, link to detail. |
| `/inventory/adjustments/new` | Create Stock Adjustment | Reason dropdown (`PHYSICAL_COUNT_DISCREPANCY`, `DAMAGED_EXPIRED`, `DATA_ENTRY_CORRECTION`, `INTERNAL_USE`, `OTHER`), notes, variant scan/search, system quantity snapshot, physical count input, computed difference preview (+/-), unit cost from server. Submits as `DRAFT`. Supports pre-fill from opening stock refusal (`?variantId=...&suggestedQty=...`). |
| `/inventory/adjustments/[id]` | Stock Adjustment Detail | Items list showing +/- quantity and value impact from server. Approve action only for users with `stock:approve` (hidden for non-owner creator to prevent self-approval conflicts). Cancel action for drafts. |
| `/inventory/stocktake` | Physical Stocktake Audit | Automatically resumes active `IN_PROGRESS` stocktake for the current branch or starts a new one with optional category/brand filter. High-speed counting screen: barcode scan increments counted quantity (+1) immediately, manual quantity edit, progress indicator, search, "Show only uncounted" and "Show only discrepancies" filters, debounced autosave batches (600ms) with visible saving indicator. Complete action with checkbox to auto-generate DRAFT Stock Adjustment from discrepancies. Cancel action with confirm. |
| `/inventory/damaged` | Damaged Stock Management | List of damaged reports with status (`PENDING`, `APPROVED`, `WRITTEN_OFF`), total loss KPI card from server (permission-gated). Report damaged stock modal (barcode scan, quantity, reason). Approve action (PENDING -> APPROVED). Write-off action (APPROVED -> WRITTEN_OFF, executes DAMAGE stock-out movement at exact current WAC). |
| `/inventory/consistency` | Consistency Verification Tool | Admin-only read-only audit tool. Calls `/api/v1/inventory/stock/consistency-check`. Compares `StockBalance.quantity` against the sum of `StockMovement` ledger and tracked `ProductUnit` barcodes. Shows mismatch flags, read-only (no auto-fix), and formula-injection safe CSV export. |

---

### 2. Phase F3 Backend Endpoints Used

| Endpoint | Method | Backend Controller | Frontend Implementation Notes |
|---|---|---|---|
| `/api/v1/inventory/suppliers` | GET, POST | `SupplierController` | List suppliers / Create supplier with auto code and opening balance |
| `/api/v1/inventory/suppliers/:id` | GET, PATCH, DELETE | `SupplierController` | Detail / Update / Soft delete (409 conflict handled) |
| `/api/v1/inventory/suppliers/:id/ledger` | GET | `SupplierController` | Supplier ledger entries (Purchases, Returns, Payments) with running balance |
| `/api/v1/inventory/purchase-orders` | GET, POST | `PurchaseOrderController` | List purchase orders / Create PO in `DRAFT` |
| `/api/v1/inventory/purchase-orders/:id` | GET, PATCH | `PurchaseOrderController` | PO details / Update DRAFT items and delivery date |
| `/api/v1/inventory/purchase-orders/:id/issue` | POST | `PurchaseOrderController` | Transition PO from DRAFT to ISSUED |
| `/api/v1/inventory/purchase-orders/:id/cancel` | POST | `PurchaseOrderController` | Cancel PO with reason |
| `/api/v1/inventory/purchases` | GET, POST | `PurchaseController` | List purchases / Receive goods purchase with landed cost, tax, units |
| `/api/v1/inventory/purchases/:id` | GET | `PurchaseController` | Purchase detail with line items, payments, returns, and ProductUnits |
| `/api/v1/inventory/purchases/:id/cancel` | POST | `PurchaseController` | Cancel purchase; backend throws 400 if stock was already sold or moved |
| `/api/v1/inventory/supplier-payments` | GET, POST | `SupplierPaymentController` | List payments / Record payment against purchase or general advance |
| `/api/v1/inventory/supplier-payments/:id` | GET | `SupplierPaymentController` | Payment detail (used for printable voucher) |
| `/api/v1/inventory/purchase-returns` | GET, POST | `PurchaseReturnController` | List returns / Create purchase return with items and reason |
| `/api/v1/inventory/purchase-returns/:id` | GET | `PurchaseReturnController` | Return detail view |
| `/api/v1/inventory/purchase-returns/:id/complete` | POST | `PurchaseReturnController` | Finalize DRAFT return -> COMPLETED |
| `/api/v1/inventory/purchase-returns/:id/cancel` | POST | `PurchaseReturnController` | Cancel DRAFT return |
| `/api/v1/inventory/stock` | GET | `StockController` | Current branch stock list with filters and totals footer |
| `/api/v1/inventory/stock/all-branches-summary` | GET | `StockController` | All-branches stock matrix for multi-branch admins / owners |
| `/api/v1/inventory/stock/movements` | GET | `StockController` | Variant stock movement history ledger |
| `/api/v1/inventory/stock/low-stock-report` | GET | `StockController` | Low stock report with reorder levels and shortage calculations |
| `/api/v1/inventory/stock/valuation` | GET | `StockController` | Branch valuation report with category and brand breakdown |
| `/api/v1/inventory/stock/opening` | POST | `StockController` | Enter opening stock; rejects if movements already exist |
| `/api/v1/inventory/stock/consistency-check` | GET | `StockController` | Read-only verification of stock balance vs ledger & units |
| `/api/v1/inventory/transfers` | GET, POST | `StockTransferController` | List transfers / Initiate transfer (status `PENDING`) |
| `/api/v1/inventory/transfers/:id` | GET | `StockTransferController` | Transfer detail with items, status timeline, and discrepancies |
| `/api/v1/inventory/transfers/:id/dispatch` | POST | `StockTransferController` | Dispatch goods (`PENDING` -> `IN_TRANSIT`, reduces source stock) |
| `/api/v1/inventory/transfers/:id/receive` | POST | `StockTransferController` | Receive goods (`IN_TRANSIT` -> `RECEIVED`, destination users only) |
| `/api/v1/inventory/transfers/:id/reject` | POST | `StockTransferController` | Reject transfer (returns stock to origin branch) |
| `/api/v1/inventory/transfers/:id/cancel` | POST | `StockTransferController` | Cancel transfer (returns stock to origin branch) |
| `/api/v1/inventory/adjustments` | GET, POST | `StockAdjustmentController` | List adjustments / Create adjustment draft (`DRAFT`) |
| `/api/v1/inventory/adjustments/:id` | GET | `StockAdjustmentController` | Adjustment detail with +/- differences and value impact |
| `/api/v1/inventory/adjustments/:id/approve` | POST | `StockAdjustmentController` | Approve adjustment (creator cannot approve unless owner) |
| `/api/v1/inventory/adjustments/:id/cancel` | POST | `StockAdjustmentController` | Cancel DRAFT adjustment |
| `/api/v1/inventory/stocktakes` | GET | `StocktakeController` | List stocktakes for current branch |
| `/api/v1/inventory/stocktakes/start` | POST | `StocktakeController` | Start stocktake with snapshot (only one `IN_PROGRESS` allowed) |
| `/api/v1/inventory/stocktakes/:id` | GET | `StocktakeController` | Stocktake details with counted and discrepancy lines |
| `/api/v1/inventory/stocktakes/:id/counts` | POST | `StocktakeController` | Record batch physical counts (used by debounced autosave) |
| `/api/v1/inventory/stocktakes/:id/complete` | POST | `StocktakeController` | Complete stocktake and optionally generate DRAFT adjustment |
| `/api/v1/inventory/stocktakes/:id/cancel` | POST | `StocktakeController` | Cancel active stocktake session |
| `/api/v1/inventory/damaged-stock` | GET, POST | `DamagedStockController` | List damaged stock / Report damage (`PENDING`) |
| `/api/v1/inventory/damaged-stock/:id/approve` | POST | `DamagedStockController` | Approve damaged report (`PENDING` -> `APPROVED`) |
| `/api/v1/inventory/damaged-stock/:id/write-off` | POST | `DamagedStockController` | Write-off damaged stock (executes DAMAGE stock movement) |

*All 38 endpoints mapped cleanly to existing NestJS controllers in `backend/src/modules/inventory/controllers`.*

---

### 3. Key Design Decisions

#### 1. Purchase Form Draft Persistence
- **Storage Strategy**: Local drafts are persisted to browser `localStorage` under the key:
  `purchase_draft_${currentBranchId}_${user.id}`
- **Security & Branch Isolation**: Scoped strictly per branch and per user ID. If the user changes active branches or logs out, drafts from other branches or users are never loaded or mixed.
- **Lifecycle**:
  - Saved automatically on form changes (with a 500ms debounce).
  - Prompts with a visual toast when an existing draft is detected and restored.
  - Cleared immediately upon successful purchase creation or explicit form reset.
- **Idempotency Key**: Generated once per form open using `crypto.randomUUID()`. Reused across retries or double-clicks to protect backend creation idempotency, and regenerated upon successful submission.

#### 2. Cost Visibility & Valuation Permissions
- **Rule Followed (F2 Convention)**:
  - Users have access to view unit costs, average costs (WAC), inventory valuation, and total loss values if and only if:
    `user?.isOwner || permissions?.includes('products:update') || permissions?.includes('*')`
  - When false:
    - Average cost (`avg_cost_price`) and total cost value columns are omitted from the Stock Overview DataTable.
    - Net value impact columns are hidden in Stock Adjustments and Stocktake review screens.
    - Direct access to `/inventory/stock/valuation` displays a permission-denied banner and redirects.

#### 3. Stocktake Autosave & Batching Approach
- **Speed & Reliability**: Built for rapid barcode scanning where warehouse staff may scan items in rapid succession.
- **Queue & Debounce**:
  - Scanning increments the local count in React state immediately (`<16ms`).
  - Updates are staged in a mutable `pendingUpdatesRef` map (`itemId -> countedQty`).
  - A 600ms debounce timer flushes the staged updates in a single batch request to `POST /api/v1/inventory/stocktakes/:id/counts`.
  - An autosave status indicator displays "Saving counts..." while network requests are in flight and transitions to "Saved" with a green checkmark once confirmed.
- **Active Session Resume**: On visiting `/inventory/stocktake`, the client queries `api.inventory.stocktakes.list({ status: 'IN_PROGRESS', limit: 1 })`. If an active session exists, it immediately loads and resumes counting instead of prompting to start a new one.

#### 4. Stock Adjustment Self-Approval Conflict Protection
- **Backend Mirroring**: The backend restricts `approveAdjustment` so that the creator cannot approve their own adjustment unless `isOwner: true`.
- **UI Guard**: The "Approve Adjustment" button is hidden if `adjustment.created_by === user.id && !user.isOwner`, and an informational banner is displayed explaining that another authorized staff member or business owner must approve it.

#### 5. Destination Branch Isolation in Transfers
- **Source vs Destination**: When initiating a transfer, the destination branch dropdown filters out `branches.filter(b => b.id !== currentBranchId)`.
- **Receipt Authorization**: The "Receive Goods" and "Reject Transfer" buttons are hidden unless `currentBranchId === transfer.to_branch_id || user.isOwner`.
- **Discrepancy Note**: The Receive modal enforces that if `receivedQty < sentQty`, the discrepancy note input is strictly mandatory before the confirmation button can be submitted.

---

## Phase F4 - POS Screen, Customers & Receipts Reference

### 1. POS & Sales Routes & Screens

| Route | Purpose | Key Capabilities |
|---|---|---|
| `/pos` | High-Speed POS Terminal | Full-screen minimal-chrome terminal. **Register Session Gate**: blocks selling if no open register shift (dropdown of branch cash registers + MoneyInput opening balance); displays register code, opened time, and cashier in top bar. **Scanner-Aware BarcodeInput**: always-focused input, auto-clears on scan, audio feedback (Web Audio chirps/buzzes, toggleable). Autocomplete product search dropdown. Catalog Quick-Pick tab with category filter. Tracked-individually product units (1 unit per line, blocks repeat scans with `UNIT_ALREADY_ADDED`). Debounced `/sales/calculate` calls (latest wins); local Decimal.js preview replaced by authoritative server totals. Line discount & price override (permission `sale.discount` gated). Retail vs Wholesale toggle. Customer selection with phone lookup & quick-create. Hold sale (F8), retrieve held cart (F9) with fresh catalog re-pricing. Cross-branch auto-transfer dialog. Split payment tender modal (CASH, BKASH, NAGAD, CARDS, BANK, CHEQUE). Post-sale invoice success screen with auto-print & SMS queue. |
| `/pos/register/close` | Shift Close & Reconciliation Placeholder | Placeholder page linking to Phase F5 (cash drawer reconciliation, X/Z reports). |
| `/sales` | Sales History & Invoices List | Branch-scoped sales table (multi-branch badge for admins). Filters: invoice search, status (`COMPLETED`, `PARTIALLY_PAID`, `DUE`, `VOIDED`), sale type (`RETAIL`, `WHOLESALE`), customer, date range. Summary KPI cards from server (total sales amount, paid amount, due amount). Quick Reprint action with COPY banner. |
| `/sales/[id]` | Full Sale Detail Hub | Comprehensive invoice review: customer card (ledger due balance), outlet & cash register details, items table with permission-gated WAC cost price and profit margins (`cost.view` / owner), cross-branch auto-transfers notice (source branch + transfer #), payments tender breakdown, reprint receipt button, link to F5 Return/Exchange, and **Void Sale** action (permission `sale.void`, mandatory reason input, displays backend refusal when outside 48hr window or returns exist, reverses stock movements and customer ledger). |
| `/sales/[id]/return` | Sale Return / Exchange Placeholder | Placeholder page linking to Phase F5 (barcode-driven return items, refund vouchers). |
| `/customers/[id]/collect-due` | Customer Debt Collection Placeholder | Placeholder page linking to Phase F5 (customer due settlement across cash/MFS tenders). |
| `/settings/printer` | Device-Level Printer & Receipt Settings | Configures local device printing saved in `localStorage`: default format (`THERMAL_80`, `THERMAL_58`, `A4`), auto-print trigger, number of copies, paper width fine-tuning (mm), font size scaling (small, medium, large), Bangla numerals toggle (`toBanglaDigits`), monochrome logo upload (data URL, size-capped <200KB), receipt policy footer text. "Test Print Receipt" and "Test Print Barcode" action buttons. Step-by-step Chrome Kiosk mode setup guide. |

---

### 2. POS Keyboard Shortcuts Reference

Designed for high-speed checkout without touching the mouse:

| Shortcut | Action | Description |
|---|---|---|
| **F2** | Focus Scanner Input | Focuses the main barcode scanner and product search input. |
| **F4** | Customer Selection | Opens customer lookup modal with phone-first search and quick-create. |
| **F8** | Hold Sale | Prompts for a reference name / customer note and holds the active cart. |
| **F9** | Recall Held Sales | Opens the held sales modal to inspect and retrieve parked carts with fresh prices. |
| **F10** or **Ctrl+Enter** | Pay Now | Opens split payment tender modal with authoritative server payable total. |
| **+** or **=** | Increment Quantity | Increments quantity by 1 on the currently selected cart line. |
| **-** or **_** | Decrement Quantity | Decrements quantity by 1 on the currently selected cart line. |
| **Del** / **Delete** | Remove Item | Removes the currently selected line from the cart. |
| **Esc** | Dismiss / Close | Closes active modals and dismisses autocomplete popups. |

---

### 3. Chrome Kiosk Silent Printing Setup

To enable silent, zero-click thermal printing without browser print preview dialog prompts:

1. Right-click your Google Chrome or Microsoft Edge desktop shortcut and choose **Properties**.
2. In the **Target** field, append `--kiosk --kiosk-printing` at the end:
   ```cmd
   chrome.exe --kiosk --kiosk-printing
   ```
3. Set your 80mm or 58mm thermal receipt printer as the **Default Windows Printer**.
4. In the POS, when the cashier taps "Pay Now", the receipt feeds immediately without any modal prompt.

---

### 4. Phase F4 Backend Endpoints Used

| Endpoint | Method | Backend Controller | Implementation Notes |
|---|---|---|---|
| `/api/v1/sales/register-sessions/current` | GET | `RegisterSessionController` | Checks active open shift for current user; returns 404 if no session open. |
| `/api/v1/sales/register-sessions/open` | POST | `RegisterSessionController` | Opens session with `cashRegisterId` and `openingBalance`. |
| `/api/v1/sales/calculate` | POST | `SaleController` | Authoritative calculation of cart subtotal, line discounts, coupons, taxes, round-off, and totals. |
| `/api/v1/sales` | POST | `SaleController` | Atomic sale creation: stock movements, WAC cost, payments, auto-transfers, loyalty, SMS. |
| `/api/v1/sales` | GET | `SaleController` | Paginated sales list with filters and financial summary. |
| `/api/v1/sales/:id` | GET | `SaleController` | Complete sale detail by UUID or invoice number. |
| `/api/v1/sales/:id/void` | POST | `SaleController` | Single-transaction invoice void: reverses stock movements, restores tracked units, reverses customer due. |
| `/api/v1/sales/held` | POST | `HeldSaleController` | Holds cart without allocating stock. |
| `/api/v1/sales/held` | GET | `HeldSaleController` | Lists unretrieved held sales for branch. |
| `/api/v1/sales/held/:id/retrieve` | POST | `HeldSaleController` | Retrieves held cart and re-calculates prices via pricing service. |
| `/api/v1/sales/held/:id` | DELETE | `HeldSaleController` | Deletes a held sale. |
| `/api/v1/customers/lookup` | GET | `CustomerController` | Phone-first lookup supporting various BD formats (`01...`, `+8801...`, `8801...`). |
| `/api/v1/customers/quick` | POST | `CustomerController` | Quick customer registration with name + phone only. |
| `/api/v1/customers` | GET | `CustomerController` | List and search customers by name or phone. |
| `/api/v1/catalog/barcodes/lookup/:barcode` | GET | `BarcodeController` | Scans barcode: returns variant if active in branch, or `PRODUCT_IN_OTHER_BRANCH` with other branch stock. |

*Zero endpoint shapes were guessed; all request bodies, query params, and response DTOs match the verified NestJS backend controllers.*

---

### 5. Key Architectural & Design Decisions

#### 1. Cart Persistence & Multi-Branch Safety
- **Storage Strategy**: Cart state is persisted in `localStorage` under `pos_cart_${branchId}_${userId}`.
- **Branch Switching Protection**:
  - `useBranchStore.switchBranch` and `BranchSwitcher` check `useCartStore.getState().items.length > 0`.
  - If the cart has items, a `ConfirmDialog` blocks the switch with the warning: *"Switching branches with items in your cart will clear the cart. Do you want to continue?"*.
  - Upon confirmation, the cart is cleared and the branch switch executes with query cache invalidation.
- **No Cart Mixing**: Carts from branch A are never shown or mixed into branch B.

#### 2. Authoritative Server Totals & Debounced Calculation
- **Rule Followed**: The frontend NEVER computes authoritative money.
- **Implementation**:
  - A fast local preview is computed using `Decimal.js` for immediate UI response.
  - Every cart modification triggers a debounced call (250ms) to `POST /api/v1/sales/calculate`.
  - Calculation requests track a sequential `latestCalculateRequestId` to ensure late responses are dropped (latest-wins).
  - The server values (`subtotal`, `lineDiscountTotal`, `couponDiscount`, `taxAmount`, `roundOff`, `totalAmount`) strictly replace local preview values.

#### 3. Idempotency Key & Safe Network-Error Retry
- **One Key per Cart Intent**: Generated via `crypto.randomUUID()` when a new cart begins.
- **Reuse on Retries**: Kept identical on retries, double-clicks, and network timeouts.
- **Network Error Safety**: If connection drops during checkout, the payment modal remains open with a "Retry (Safe)" button using the exact same `idempotencyKey`. The backend caches the idempotency response and returns the existing invoice without duplicate stock deductions or charges.
- **Regeneration**: Regenerated only after a confirmed successful sale or after the cashier explicitly clears the cart.

#### 4. PrinterAdapter Architecture & Receipt Rendering
- **PrinterAdapter Interface**:
  ```ts
  export interface PrinterAdapter {
    printReceipt(htmlContent: string, options?: PrintJobOptions): Promise<boolean>;
  }
  ```
- **BrowserPrintAdapter**: Employs a hidden detached iframe (`#__pos_print_iframe__`) to inject generated HTML and trigger `window.print()`. This guarantees the main POS viewport never reflows or scrolls during print execution.
- **Future Extensibility**: A native desktop wrapper (e.g. Electron, ESC/POS over USB or Raw Bluetooth) can implement `PrinterAdapter` without changing a single line of POS UI code.
- **Print CSS Widths**:
  - `THERMAL_80`: `@page { size: 80mm auto; margin: 0; }` with `width: 80mm;`
  - `THERMAL_58`: `@page { size: 58mm auto; margin: 0; }` with `width: 58mm;`
  - `A4`: `@page { size: A4; margin: 12mm; }` with full table invoice styling.
- **Bangla Font Embedding**: Embeds Google Font `Noto Sans Bengali` in the print HTML stylesheet to prevent missing glyphs or ugly fallback font rendering on thermal printers. Includes Latin-to-Bangla digit conversion (`toBanglaDigits`).
- **Reprint Marker**: Automatically renders `*** COPY / DUPLICATE RECEIPT ***` header banner whenever `isReprint: true`.

---

## Phase F5: Returns, Exchange, Due Collection, Expenses, Cash Movements, Register Close & Reports

### 1. New Pages & Routes Added in Phase F5

| Route | Page Component | Description & Key Features |
|---|---|---|
| `/sales/:id/return` | `app/(app)/sales/[id]/return/page.tsx` | Production Sales Return form with server max returnable check, condition selection (`RESELLABLE` / `DAMAGED`), tracked-unit barcodes, server due-first split preview, cross-branch banner & permission gating (`return.cross_branch`), and printable return slip. |
| `/sales/returns` | `app/(app)/sales/returns/page.tsx` | Returns History list with Find Sale scanner/search input, date filters, branch scope, and reprint copy slip trigger. |
| `/sales/returns/:id` | `app/(app)/sales/returns/[id]/page.tsx` | Detail view of a completed sales return with item condition logs, debt adjustment audit, and reprint slip. |
| `/sales/exchange` | `app/(app)/sales/exchange/page.tsx` | 4-Step Guided Product Exchange wizard: Step 1 Find Sale -> Step 2 Choose Return Items -> Step 3 Pick New Items (POS catalog & scanner) -> Step 4 Review financial balance (`EVEN`, `CUSTOMER_PAYS`, `SHOP_REFUNDS`), atomic submission with single idempotency key, and exchange voucher print. |
| `/sales/exchanges` | `app/(app)/sales/exchanges/page.tsx` | Product Exchanges history linking the return voucher with the newly generated sale invoice. |
| `/customers/due` | `app/(app)/customers/due/page.tsx` | Customer Due Collections Hub with business-wide phone-first lookup, credit limit indicators, per-branch debt split, and quick collection entry. |
| `/customers/:id/collect-due` | `app/(app)/customers/[id]/collect-due/page.tsx` | Dedicated Due Collection form with quick "Full Due" / "Half" buttons, advance payment blocking, oldest-first FIFO debt allocation breakdown, open cash shift check, and printable money receipt. |
| `/customers/due/aging` | `app/(app)/customers/due/aging/page.tsx` | Customer Due Aging Report with 0-30, 31-60, 61-90, 90+ day aging buckets, per-branch split, formula-injection safe CSV export, and bulk reminder SMS confirmation dialog. |
| `/expenses` | `app/(app)/expenses/page.tsx` | Showroom Expenses management with category filters, date picker, server totals row, CSV export (formula injection safe), category CRUD modal, and reason-mandatory audit delete dialog. |
| `/expenses/reports` | `app/(app)/expenses/reports/page.tsx` | Expense Analytics & Summary reports grouped by category, branch, and top payees/vendors with responsive SVG charts and data table fallback. |
| `/pos/register/close` | `app/(app)/pos/register/close/page.tsx` | 3-Step Cash Register Shift Close (Z Report) wizard: Step 1 physical cash breakdown by Bangladeshi denominations (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1 notes & coins via Decimal.js) or direct entry -> Step 2 live server expected balance & discrepancy review -> Step 3 mandatory notes & final closure confirm. Includes manager view for closing peer shifts (`register.close_any`) and printable Z reports (`THERMAL_58`, `THERMAL_80`, `A4`). |
| `/pos/register/cash-book` | `app/(app)/pos/register/cash-book/page.tsx` | Branch Daily Cash Book auditing all shifts for a date with opening float, expected cash, counted cash, net variance, and CSV export. |
| `/reports/profit` | `app/(app)/reports/profit/page.tsx` | Profit & Loss Analysis report with Asia/Dhaka period filters (today, yesterday, this week, this month, custom), side-by-side branch comparisons, combined totals, and permission-gated cost/profit metrics (`report.view_profit`). |
| `/reports/collections` | `app/(app)/reports/collections/page.tsx` | Collections Summary report tracking cash, bKash, Nagad, Bank, and Cards received (sales + due collections - refunds) per branch and across tender channels. |

---

### 2. Permissions Used & Enforced in UI

| Permission Code | UI Enforcement & Gating |
|---|---|
| `return.create` | Access to Sales Return form, return buttons on sale detail, and return submission. |
| `return.cross_branch` | Allows processing returns for sales originally transacted at another branch. Displays alert banner informing that refund is paid from and stock returned to current branch. Without this permission, cross-branch return is blocked with a friendly explanation. |
| `exchange.create` | Access to Product Exchange guided wizard and atomic checkout. |
| `due.collect` | Access to Due Collections Hub and customer due settlement forms. |
| `expense.view` | Access to Showroom Expenses list and expense details. |
| `expense.create` | Button to record new expense vouchers and create expense categories. |
| `expense.update` | Button to edit expense vouchers; requires mandatory reason if linked register shift is closed. |
| `expense.delete` | Button to delete expense vouchers; triggers `ConfirmDialog` requiring an audit reason. |
| `expense.approve` | Enables recording expenses exceeding the approval threshold and displays approval badges. |
| `cash.move` | Opens Pay-In and Pay-Out dialogs in POS header. |
| `register.close` | Access to close cashier's own register shift (Z report). |
| `register.close_any` | Manager feature allowing selection and closure of any open register shift in the branch. |
| `report.view` | Access to Reports Hub, Aging reports, Daily Cash Book, and Collections summary. |
| `report.view_profit` | Specifically gates COGS, Gross Profit, and Net Profit columns. If user lacks this permission, these metrics are completely hidden and a security banner is shown. |

---

### 3. Backend Endpoints Used in Phase F5

| Endpoint | Method | Backend Controller / Service | Status | Implementation Notes |
|---|---|---|---|---|
| `/api/v1/sales/returns` | POST | `SaleReturnController` | Verified | Atomic sales return: stock restoration by condition, refund payment, and customer due reduction. |
| `/api/v1/sales/returns` | GET | `SaleReturnController` | Verified | Paginated returns list with filters by sale, customer, and date. |
| `/api/v1/sales/returns/:id` | GET | `SaleReturnController` | Verified | Single return details including returned item condition and refund split. |
| `/api/v1/sales/returns/:id/slip` | GET | `SaleReturnController` | Verified | Returns formatted return slip payload for thermal and A4 printers. |
| `/api/v1/sales/exchanges` | POST | `ExchangeController` | Verified | Atomic exchange in ONE request: returns items, deducts new items, calculates net difference, handles difference payment/refund. |
| `/api/v1/sales/exchanges` | GET | `ExchangeController` | Verified | Lists completed exchanges linking original and new sales. |
| `/api/v1/sales/exchanges/:id` | GET | `ExchangeController` | Verified | Detail view of single exchange transaction. |
| `/api/v1/sales/due-collections` | POST | `DueCollectionController` | Verified | Collects debt with oldest-first FIFO sale invoice settlement and register link. |
| `/api/v1/sales/due-collections` | GET | `DueCollectionController` | Verified | Paginated due collections history. |
| `/api/v1/sales/due-collections/:id` | GET | `DueCollectionController` | Verified | Single due collection detail with full invoice allocation breakdown. |
| `/api/v1/sales/due-collections/:id/receipt` | GET | `DueCollectionController` | Verified | Money receipt printable payload. |
| `/api/v1/sales/due-collections/reports/outstanding` | GET | `DueCollectionController` | Verified | Customer due aging breakdown by buckets (0-30, 31-60, 61-90, 90+ days). |
| `/api/v1/sales/due-collections/reports/branch-split` | GET | `DueCollectionController` | Verified | Customer due balances split across business branches. |
| `/api/v1/expenses` | POST | `ExpenseController` | Verified | Records showroom expense voucher, computes tax and total, checks drawer cash link. |
| `/api/v1/expenses` | GET | `ExpenseController` | Verified | Paginated branch expenses list with filters. |
| `/api/v1/expenses/:id` | GET | `ExpenseController` | Verified | Expense voucher detail with attachments. |
| `/api/v1/expenses/:id` | PUT | `ExpenseController` | Verified | Updates expense voucher; enforces reason if session closed. |
| `/api/v1/expenses/:id` | DELETE | `ExpenseController` | Verified | Deletes expense voucher after capturing immutable snapshot in AuditLog. |
| `/api/v1/expenses/reports/summary` | GET | `ExpenseController` | Verified | Expense analytics summarized by category, branch, and top vendors. |
| `/api/v1/expenses/categories` | GET | `ExpenseCategoryController` | Verified | Lists business-wide expense categories. |
| `/api/v1/expenses/categories` | POST | `ExpenseCategoryController` | Verified | Creates expense category with unique code check (maps 409). |
| `/api/v1/sales/register-sessions/summary` | GET | `RegisterSessionController` | Verified | Live non-mutating X Report summary for active shift with full cash ledger breakdown. |
| `/api/v1/sales/register-sessions/:id/summary` | GET | `RegisterSessionController` | Verified | Live X Report for specific shift UUID. |
| `/api/v1/sales/register-sessions/cash-movements` | POST | `RegisterSessionController` | Verified | Records manual PAY_IN or PAY_OUT with live expected drawer cash limit check. |
| `/api/v1/sales/register-sessions/cash-movements` | GET | `RegisterSessionController` | Verified | Lists manual cash movements for session. |
| `/api/v1/sales/register-sessions/close` | POST | `RegisterSessionController` | Verified | Closes shift (Z Report): discrepancy check, threshold notes enforcement, unsynced sales blocker. |
| `/api/v1/sales/register-sessions/cash-book` | GET | `RegisterSessionController` | Verified | Daily branch cash book showing all open and closed shifts for an accounting date. |
| `/api/v1/sales/reports/profit` | GET | `ReportController` | Verified | Branch & combined P&L report: gross sales, returns, COGS, gross/net profit. |
| `/api/v1/sales/reports/collections` | GET | `ReportController` | Verified | Tender summary: cash, bKash, Nagad, bank received minus refunds per branch per day. |

*No endpoint shapes were guessed; all backend endpoints, DTO properties, and HTTP status codes match the verified NestJS backend modules.*

---

### 4. Architectural & Design Decisions (Phase F5)

#### 1. Return Refund Split Presentation
- **Authoritative Server Split**: The frontend never computes how a refund is partitioned. When the server calculates or confirms a refund, it returns `dueReduction` and `payoutAmount`.
- **UI Display**: The return form and confirmation dialog present this clearly:
  - *Reduces Customer Due First: BDT X.XX* (deducted directly from customer's account balance).
  - *Paid Back to Customer: BDT Y.YY* (cash drawer disbursement or MFS payout).
- This ensures cashiers can immediately explain to customers why they may not receive the full return amount in cash if they purchased on credit.

#### 2. Exchange Credit Wording & Visual Clarity
- **Strictly Labelled as Credit**: In the Exchange wizard and printed slips, the returned merchandise value is prominently labelled as:
  `Exchange Credit (Returned Items Value)`.
- **Customer Expectation Protection**: A clear explanatory notice states: *"Exchange credit is applied directly toward new items. It is not paid in cash."*
- **Financial Balance Cases**:
  - `EVEN`: Both totals match; no monetary transfer.
  - `CUSTOMER_PAYS`: New items total exceeds credit; cashier opens payment dialog for the difference.
  - `SHOP_REFUNDS`: Returned credit exceeds new items; drawer cash refund is issued (requires open shift).

#### 3. Denomination Counter Storage Format
- **Structured JSON in `closing_notes`**: In the Z Report shift close wizard, cashier physical cash counts across all Bangladeshi currency denominations (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1 notes and coins) are serialized as clean JSON text inside the `closing_notes` database column:
  ```json
  {
    "mode": "DENOMINATIONS",
    "notesCount": { "1000": 5, "500": 4, "200": 10, "100": 15, "50": 10, "20": 5, "10": 8, "5": 4, "2": 5, "1": 0 },
    "coinsCount": { "5": 6, "2": 5, "1": 4 },
    "countedTotal": 11254,
    "expectedBalance": 11254,
    "discrepancy": 0,
    "userNotes": "Shift handover balanced."
  }
  ```
- This satisfies the backend schema without requiring any database migrations while providing rich historical audit records.

#### 4. Report Charting Approach
- **Lightweight SVG Visualizers**: We opted for pure, responsive SVG bar and progress metrics instead of external chart libraries (e.g. Chart.js or Recharts).
- **Benefits**:
  - Zero React 19 compatibility issues.
  - 0 KB bundle weight overhead.
  - Instantaneous rendering and hydration.
  - Seamless dark mode support through Tailwind CSS classes.
  - 100% full table fallback with exportable data.

#### 5. Formula Injection Safe CSV Exports (CWE-1236)
- All CSV download helpers across Expenses, Cash Book, Due Aging, Profit, and Collections reports sanitize cell contents via `escapeCsvCell`.
- Any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prepended with a single quote (`'`), neutralizing spreadsheet formula injection vulnerabilities.

---

## Phase F6 - Offline PWA, Sync Engine, Notifications & Dashboards

### 1. How Offline Mode Works Step-by-Step

#### A. For Cashiers:
1. **Connection Awareness**:
   - The header displays an interactive connection status pill:
     - `ONLINE` (green): Live server connectivity and normal POS operations.
     - `OFFLINE` (amber): Operating from local IndexedDB cache.
     - `SYNCING` (blue pulsing): Outbox transactions actively transmitting to backend.
   - Shows real-time counters of pending unsynced sales and any conflicts requiring manager attention.
2. **Selling Offline**:
   - **Local Catalog & Barcode Lookup**: Barcode scanning and product searches match instantaneously against IndexedDB (indexed by barcode, SKU, and product name).
   - **Provisional Pricing**: Totals, line discounts, coupons, taxes, and round-offs are computed locally using Decimal.js.
   - **Provisional Receipt**: Prints thermal/A4 receipts with prominent header marker:
     `*** OFFLINE / PROVISIONAL INVOICE ***`
     `*** অফলাইন / খসড়া রসিদ ***`
   - **Invoice Numbers**: Consumes sequential numbers from the locally reserved pool (e.g. `INV-DHK-000101`). If exhausted, the UI prevents new sales and guides the cashier to reconnect.
   - **Stock Snapshot**: Quantity shown with an informative *"may be outdated"* hint. Offline sales proceed even if stock temporarily dips negative.
3. **Reconnection & Sync Reconcilation**:
   - The moment internet connectivity returns, the Sync Engine automatically pushes the FIFO outbox queue in batches.
   - The server recalculates authoritative amounts and replaces provisional totals. If a price changed on the server while the terminal was offline, the difference is flagged on the sale record for manager review.
4. **Shift & Logout Safety Guard**:
   - Cashiers cannot close their shift register or log out while unsynced sales exist in the outbox.
   - If logout is attempted with unsynced sales, a warning dialog appears requiring explicit confirmation, with an emergency **"Export JSON"** button to back up pending items before wiping the device cache.

#### B. For Developers:
1. **Multi-Tenant IndexedDB Architecture (`db.ts`)**:
   - Local databases are strictly namespaced: `pos_db_${businessId}_${branchId}_${userId}`.
   - Prevents any data cross-contamination when multiple users or branches share the same device.
   - Schema version 1 manages: `products`, `customers`, `priceLists`, `coupons`, `settings`, `reservedInvoices`, `outboxQueue`, `offlineSales`, `idMappings`, and `diagnostics`.
2. **Multi-Tab Leader Election**:
   - Uses the browser's native **Web Locks API** (`navigator.locks.request('pos_outbox_push')`) so that only one open browser tab processes and pushes the outbox at a time.
3. **Outbox Batch Processing**:
   - Outbox items carry an immutable UUID `client_sync_id`.
   - `PROCESSED`: Local sale marked `SYNCED`, provisional difference recorded, item purged from outbox.
   - `CONFLICT`: Retained in queue, flagged for manager resolution at `/sync/conflicts`.
   - `FAILED`: Exponential backoff (`min(2^retry * 5s, 300s)`). One failed item never blocks subsequent independent items.
4. **Offline Customer Reconciliation**:
   - Offline customers receive client references (`cust-offline-...`). Upon sync, the backend maps them to existing or newly created server customer IDs; the Sync Engine automatically updates the local ID mappings table.

---

### 2. PWA Installation & Service Worker Lifecycle

- **Web App Manifest (`public/manifest.json`)**: Configured with `display: "standalone"`, POS start URL (`/pos`), theme color `#10b981`, and high-resolution icons (192x192 and 512x512 PNG/SVG).
- **Service Worker (`public/sw.js`)**:
  - Precaches essential static assets and app shell navigation.
  - Employs a network-first strategy for dynamic POS navigation with an offline fallback cache.
- **Cart-Guarded Update Policy (`PwaUpdatePrompt.tsx`)**:
  - When a new service worker version is detected, the "New update available, reload" prompt **only renders when the shopping cart is completely empty** (`useCartStore.items.length === 0`).
  - Ensures a cashier in the middle of a customer checkout is never interrupted or prompted to reload.

---

### 3. Kiosk Printing Tips (Unchanged)

For dedicated POS counter stations running Chrome/Edge on Windows:
```bash
chrome.exe --kiosk --kiosk-printing --disable-print-preview --app=http://localhost:3000/pos
```
- Direct thermal printing bypasses system dialogs and cuts receipt automatically.

---

### 4. How to Simulate Offline Mode

Developers and testers can simulate offline scenarios using three methods:
1. **In-App Dev Switch**: Click the connection indicator in the header to open the Sync Status Popover, and toggle **"Dev: Simulate Offline"**.
2. **Manual Work Offline**: Toggle **"Work Offline Mode"** in the same popover to test cashier-initiated offline operation.
3. **Browser DevTools**: Open Chrome DevTools -> `Network` tab -> select `Offline` from the throttling dropdown.

---

### 5. Local Data Wipe Rules & Security Trade-Offs

- **No Sensitive Credentials Stored**: Tokens, password hashes, and user secrets are NEVER saved in IndexedDB.
- **Selective Caching**: Customer directory is paginated and capped. Cost prices are hidden unless the user holds explicit profit/cost permissions.
- **Isolation on Scope Switch**: Switching branches or users dynamically unbinds and re-namespaces the database connection, preventing data leakage.
- **Logout Wipe**:
  - If the outbox queue is completely empty: the local database namespace is deleted cleanly upon logout.
  - If unsynced items exist: the logout guard modal blocks exit and requires explicit cashier override with mandatory JSON export fallback.

---

### 6. Shared Pricing Fixtures

- **Fixtures Location**: [`frontend/test/fixtures/pricing-fixtures.json`](file:///d:/Projects/shop%20management%20sass%20project/frontend/test/fixtures/pricing-fixtures.json)
- **Unit Test Suite**: [`frontend/test/local-pricing.test.ts`](file:///d:/Projects/shop%20management%20sass%20project/frontend/test/local-pricing.test.ts)
- Contains shared test vectors for Retail/Wholesale pricing, item discounts, percentage coupons, tax calculations, and integer round-off. Both frontend Decimal.js engine and backend pricing service validate against these identical vectors.

---

### 7. Backend Endpoints Reference (Phase F6)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Lightweight connectivity and server heartbeat check |
| `GET` | `/sync/bootstrap` | Initial and incremental catalog/customer cache bootstrap |
| `POST` | `/sync/reserve-invoice-numbers` | Reserves blocks of consecutive offline invoice numbers |
| `POST` | `/sync/push` | Idempotent FIFO outbox push (`client_sync_id`) |
| `GET` | `/sync/status` | Branch-wide sync queue and conflict metrics |
| `GET` | `/sync/conflicts` | List unresolved sync conflicts |
| `POST` | `/sync/conflicts/:id/retry` | Retry sync for a conflicting outbox item |
| `POST` | `/sync/conflicts/:id/resolve` | Resolve conflict manually with audit note |
| `GET` | `/sync/negative-stock` | List variants that went negative after offline sync |
| `GET` | `/notifications` | Paginated notification list with type filtering |
| `GET` | `/notifications/unread-count` | Unread notifications badge counter |
| `PATCH` | `/notifications/:id/read` | Mark single notification as read |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read |
| `GET` | `/notifications/stream` | Authenticated Server-Sent Events (SSE) live push stream |
| `GET` | `/dashboards/business` | Management metrics (Sales, Profit, Due, Payable, Stock) |
| `GET` | `/dashboards/cashier` | Cashier shift overview and daily personal sales |
| `GET` | `/audit-logs` | Audit trail with field-level change diff viewer |
| `GET` | `/exports/sales` | Streaming CSV export of filtered sales records |
| `GET` | `/exports/stock` | Streaming CSV export of current branch inventory |
| `GET` | `/exports/expenses` | Streaming CSV export of branch expenses |
| `GET` | `/exports/customer-due` | Streaming CSV export of customer due balances |
| `GET` | `/exports/sms-logs` | Streaming CSV export of SMS transmission logs |
| `GET` | `/exports/audit-logs` | Streaming CSV export of security audit logs |
| `GET` | `/sms/logs` | Paginated SMS delivery logs |
| `POST` | `/sms/due-reminders/preview` | Preview target audience and due balance for SMS campaign |
| `POST` | `/sms/due-reminders/send` | Dispatches SMS payment reminders |
| `POST` | `/sms/promotional/send` | Dispatches targeted promotional SMS with segment tracking |

*No backend shapes were guessed; all endpoint contracts align strictly with NestJS backend modules.*

---

### 8. Architectural & Design Decisions (Phase F6)

#### 1. Offline Token Expiry & Session Continuity Rule
- **Design Decision**: When internet connectivity drops, the browser cannot reach the server to refresh expiring JWT access tokens.
- **Rule**: If the token expires while offline, the frontend preserves the active POS session in a restricted "Offline Working Mode". Cashiers can continue scanning, cart building, and provisional receipt printing uninterrupted.
- **Trade-off & Resolution**:
  - To prevent security risks, sensitive operations (password changes, role modifications, financial exports) remain blocked.
  - The moment network connectivity is re-established, the API client silently invokes `/api/auth/session` to obtain fresh tokens before transmitting queued outbox items. Queued sales are never purged due to an expired token.

#### 2. Provisional Pricing Module & Divergence Resolution
- **Design Decision**: The server is the sole financial authority; however, cashiers must print receipts offline without network round-trips.
- **Rule**: `LocalPricingEngine` mirrors the backend's exact rounding, tax, and discount algorithms using `decimal.js`.
- **Divergence Handling**:
  - All offline receipts bear the explicit watermark: `*** OFFLINE / PROVISIONAL INVOICE ***`.
  - When synced, the server's calculated total replaces the provisional total. If backend prices or tax rates were updated in the database while the terminal was offline, the UI computes and displays `provisionalDifference` (e.g. `Server total +BDT 50.00 vs provisional`). Managers can inspect these differences directly in the sale history.

#### 3. Blocked Offline Operations & Rationale
To guarantee ledger integrity, the following operations are strictly blocked offline:
- **Cross-Branch Auto-Transfers**: Stock balance in other branches cannot be locked or verified locally.
- **Voiding Online Sales**: An online sale might have already been returned or modified on another terminal.
- **Customer Due Collection**: Live account balance cannot be verified; due collection requires server validation.
- **Register Shift Closure**: Closing a shift with pending outbox sales would leave cash drawer discrepancies un-reconciled.

#### 4. SMS Segment Calculation Standard
- **GSM 7-bit (English/Standard ASCII)**: 160 characters for single SMS; 153 characters per concatenated segment.
- **Unicode UTF-16 (Bangla & Emojis)**: 70 characters for single SMS; 67 characters per concatenated segment.
- Integrated directly into the SMS Campaign Composer with live segment countdown, preview, and estimated cost estimation (BDT 0.35/segment).

---

## Phase F7: Billing, Support & Platform Administration

### 1. Platform Admin Setup & First SUPER_ADMIN Creation

The Platform Administration Console operates as an independent control plane built into the same codebase, isolated under `/(platform)`.

#### Creating the Initial SUPER_ADMIN
Before accessing `/platform/login`, a platform administrator account must exist in PostgreSQL. Create one via Prisma CLI or a NestJS seed script:

```bash
# In the backend directory:
node -e '
const { PrismaClient, SuperAdminRole } = require("./dist/generated/prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash("PlatformAdmin123!", 10);
  const admin = await prisma.superAdmin.upsert({
    where: { email: "admin@platform.pos" },
    update: {},
    create: {
      email: "admin@platform.pos",
      password_hash: hash,
      first_name: "Master",
      lastName: "Supervisor",
      role: SuperAdminRole.SUPER_ADMIN,
      is_active: true,
    },
  });
  console.log("SUPER_ADMIN provisioned:", admin.email);
}
seed().then(() => prisma.$disconnect());
'
```

Once provisioned, navigate to `http://localhost:3000/platform/login` and log in.

---

### 2. Dual-App Architecture & Security Boundary (Rule 1)

1. **Two Separate Apps Inside One Codebase**:
   - **Tenant Application**: Mounted under `/(app)`. Uses teal/emerald accents, standard app shell, branch switcher, and POS sales engine.
   - **Platform Admin Console**: Mounted under `/(platform)`. Uses slate-950 dark theme with deep indigo branding, persistent "PLATFORM ADMIN" warning badge, and strictly isolated route trees.
2. **Token & Storage Key Isolation**:
   - Tenant tokens use `pos_token` (HTTP-only cookie & BFF session).
   - Platform tokens use `pos_platform_token` in client storage.
   - Logging in or out of one application has zero effect on the other.
3. **Dedicated API Client (`platformApiClient`)**:
   - Targets `/platform/*` routes (not `/api/v1/*`).
   - Strictly omits `x-branch-id` headers.
   - Sends `Authorization: Bearer <pos_platform_token>`.
   - On 401 Unauthorized, redirects exclusively to `/platform/login`.
   - Tenant JWT tokens fail backend `PlatformAuthGuard` validation (`payload.aud === 'platform'`), preventing cross-app token reuse.

---

### 3. Platform Role-Based Access Control (RBAC) Matrix

| Route / Capability | SUPER_ADMIN | BILLING_ADMIN | PLATFORM_SUPPORT |
|---|:---:|:---:|:---:|
| **Platform Dashboard** (`/platform/dashboard`) | Read | Read | Read |
| **Business Directory** (`/platform/businesses`) | Full | Read | Read + Suspend/Reactivate |
| **Business Detail** (`/platform/businesses/:id`) | Full | Full | Read Only |
| **Suspend / Reactivate Business** | Yes | No | Yes (with reason) |
| **Subscription Overrides** (Create/Expire) | Yes | Yes (with reason) | No |
| **Global Invoices** (`/platform/invoices`) | Full | Full | Read Only |
| **Record Payment** (Manual / MFS / Bank) | Yes (Idempotency Key) | Yes (Idempotency Key) | No |
| **Void Invoice / Mark Overdue** | Yes | Yes | No |
| **Support Desk** (`/platform/support`) | Full | Full | Full (Assign & Reply) |
| **Subscription Plans** (`/platform/plans`) | Create, Edit, Delete | Create, Edit | No |
| **System Settings & Secrets** (`/platform/settings`) | Full (Write-Only replace) | No | No |
| **Platform Admins** (`/platform/admins`) | Full (Create/Roles/Status) | No | No |
| **Platform Audit Logs** (`/platform/audit-logs`) | Read + CSV Export | Read + CSV Export | Read + CSV Export |

#### Administrative Safeguards:
- **Self-Demotion / Self-Disable Ban**: Administrators cannot modify their own active role or deactivate their own account.
- **Last Active SUPER_ADMIN Protection**: If only one active `SUPER_ADMIN` exists in the system, deactivation and role modification are permanently locked in both UI and backend.

---

### 4. Tenant Subscription State Machine & Banners

The tenant app (`/(app)`) continuously verifies subscription state:
- **`TRIAL`**: Non-intrusive trial banner indicating days remaining and link to `/billing`.
- **`PAYMENT_DUE` / `GRACE`**: Persistent orange/amber warning banner displaying days until service cutoff, amount due, and direct CTA to invoice.
- **`SUSPENDED` / `CANCELLED`**: Full-screen locked barrier on all operational screens (`/pos`, `/products`, `/purchases`, `/inventory`, `/roles`, etc.). Access is strictly permitted only to:
  1. `/billing` — To review invoices, payment instructions, and confirm payment tickets.
  2. `/support` — To communicate with platform support specialists.
- **Auto-Recheck**: Subscription state is re-evaluated on every internal navigation and on browser window focus.

---

### 5. Backend Endpoints Reference (Phase F7)

#### Tenant Subscription & Support APIs (`/api/v1/*`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/subscription/current` | Active subscription details, plan limits, overrides, and current usage |
| `GET` | `/subscription/invoices` | Paginated subscription invoice history |
| `GET` | `/subscription/invoices/:id` | Detailed invoice breakdown with payments received |
| `POST` | `/subscription/upgrade` | Request plan upgrade/downgrade with billing cycle selection |
| `POST` | `/subscription/cancel` | Cancel subscription with required cancellation reason |
| `POST` | `/support/tickets` | Open support ticket (with optional invoice reference) |
| `GET` | `/support/tickets` | Paginated ticket thread list for current business |
| `GET` | `/support/tickets/:id` | Full message thread between shop and platform admins |
| `POST` | `/support/tickets/:id/messages` | Append reply to ticket thread |
| `POST` | `/support/tickets/:id/close` | Mark ticket closed by merchant |

#### Platform Control Plane APIs (`/platform/*`)
| Method | Endpoint | Role Guard | Description |
|---|---|---|---|
| `POST` | `/platform/auth/login` | Public | Platform admin login with JWT issuance |
| `POST` | `/platform/auth/logout` | Authenticated | Invalidate platform session |
| `GET` | `/platform/auth/me` | Authenticated | Inspect current platform admin identity |
| `POST` | `/platform/auth/change-password` | Authenticated | Rotate platform admin password |
| `GET` | `/platform/admins` | SUPER_ADMIN | List all platform administrative accounts |
| `POST` | `/platform/admins` | SUPER_ADMIN | Provision a new platform admin |
| `PATCH` | `/platform/admins/:id` | SUPER_ADMIN | Alter platform admin role or active status |
| `GET` | `/platform/dashboard` | All Platform | Aggregated MRR, subscriber counts, overdue amounts, SMS volume |
| `GET` | `/platform/businesses` | All Platform | Search & filter tenant businesses with pagination |
| `GET` | `/platform/businesses/:id` | All Platform | Tenant detail: plan, usage, users, branches, overrides |
| `POST` | `/platform/businesses/:id/suspend` | SUPER_ADMIN, PLATFORM_SUPPORT | Suspend tenant with mandatory audit reason |
| `POST` | `/platform/businesses/:id/reactivate` | SUPER_ADMIN, PLATFORM_SUPPORT | Reactivate tenant with mandatory audit reason |
| `POST` | `/platform/overrides` | SUPER_ADMIN, BILLING_ADMIN | Grant custom price, discount, free access, or extra limits |
| `PATCH` | `/platform/overrides/:id/expire` | SUPER_ADMIN, BILLING_ADMIN | Expire active override immediately |
| `GET` | `/platform/plans` | All Platform | List subscription plans with resource limits |
| `POST` | `/platform/plans` | SUPER_ADMIN, BILLING_ADMIN | Create a new subscription pricing tier |
| `PATCH` | `/platform/plans/:id` | SUPER_ADMIN, BILLING_ADMIN | Update pricing tier, trial duration, or quota limits |
| `DELETE` | `/platform/plans/:id` | SUPER_ADMIN | Delete plan (blocked if subscriptions exist) |
| `GET` | `/platform/invoices` | All Platform | Global cross-tenant invoices with status filters |
| `POST` | `/platform/invoices/:id/void` | SUPER_ADMIN, BILLING_ADMIN | Void unpaid subscription invoice |
| `POST` | `/platform/invoices/:id/mark-overdue` | SUPER_ADMIN, BILLING_ADMIN | Transition invoice to OVERDUE status |
| `POST` | `/platform/invoices/:id/pay` | SUPER_ADMIN, BILLING_ADMIN | Record payment (amount, method, transactionId) |
| `GET` | `/platform/revenue/summary` | SUPER_ADMIN, BILLING_ADMIN | MRR estimate, collected this month, overdue receivables |
| `GET` | `/platform/tickets` | All Platform | Cross-tenant support desk queue with priority filters |
| `GET` | `/platform/tickets/:id` | All Platform | Inspect complete merchant conversation thread |
| `PATCH` | `/platform/tickets/:id/assign` | All Platform | Assign ticket to an admin |
| `PATCH` | `/platform/tickets/:id/status` | All Platform | Update ticket status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) |
| `POST` | `/platform/tickets/:id/messages` | All Platform | Dispatch official admin reply (triggers push notification) |
| `GET` | `/platform/settings` | SUPER_ADMIN | Inspect system settings (encrypted values masked) |
| `POST` | `/platform/settings` | SUPER_ADMIN | Upsert setting or rotate encrypted secret |
| `GET` | `/platform/audit-logs` | All Platform | Global platform audit trail with entity/action filters |

---

### 6. Missing Endpoints & Handled Fallbacks

Per Phase F7 guidelines, the following endpoints are missing from the backend and were handled without breaking constraints:

1. **`GET /api/v1/public/plans` or `GET /api/v1/subscription/plans`**:
   - *Status*: Missing. Tenants can only inspect their current plan via `/api/v1/subscription/current`.
   - *Resolution*: Provided static fallback seed configuration in `src/lib/config/pricing-plans.ts` with Starer, Pro, and Enterprise tiers for the public pricing page (`/pricing`) and plan comparison.
2. **`POST /platform/invoices/issue` (Manual Invoice Creation)**:
   - *Status*: Missing. Backend subscription invoices are generated automatically by cron jobs (`SubscriptionBillingService`) upon billing cycle rollover or plan upgrades.
   - *Resolution*: Handled via automated schedule; documented for platform operators.
3. **`GET /platform/payments/webhook-logs`**:
   - *Status*: Missing. The backend exposes the headless webhook receiver `POST /platform/payments/webhook` with HMAC validation, but no queryable log table exists.
   - *Resolution*: Skipped UI view as instructed; recorded transactions appear under `/platform/invoices`.
4. **`GET /platform/sms/overview`**:
   - *Status*: Missing. Cross-business breakdown of SMS logs does not exist under `/platform/sms`.
   - *Resolution*: Platform dashboard displays aggregate `smsVolume` returned by `/platform/dashboard`.

---

### 7. Key Design Decisions

1. **Tenant / Platform Token Isolation**:
   - Platform authentication stores credentials exclusively in `pos_platform_token`.
   - API client strictly segregates headers: tenant calls include `x-branch-id` and tenant bearer token; platform calls point to `/platform/*` with platform token and zero tenant headers.
   - Platform JWTs carry `aud: platform`, ensuring the tenant backend rejects them if forged.
2. **Platform Idle Timeout (15 Minutes)**:
   - Every administrative API request and mouse/keyboard interaction updates `lastActivity`.
   - Inactivity exceeding 15 minutes automatically clears credentials and redirects to `/platform/login` with an expiry warning.
3. **Zero-Exposure Secret Management**:
   - Backend masks encrypted system settings as `'******'` upon retrieval.
   - The UI replaces secrets in **Write-Only** mode: the previous key is never revealed in devtools, network payloads, or logs. New secrets are encrypted with AES-256-GCM server-side.
4. **Downgrade Validation Rule**:
   - When a tenant attempts to downgrade plans, the frontend evaluates current usage metrics against the target plan's quotas (e.g. branches, users, products, variants).
   - If any current metric exceeds target limits, the downgrade submission is blocked in the UI with a descriptive warning detailing exact excess resources.
5. **Payment Instructions & TrxID Verification Flow**:
   - Tenant billing displays official bKash Merchant number, Nagad, and Bank direct deposit instructions.
   - The "I Have Paid" flow allows the merchant to submit their Transaction ID and optional invoice reference as a dedicated support ticket, alerting platform operators to verify funds and record the payment.
6. **Strict Ban on Impersonation ("Login as Shop")**:
   - No route, button, helper, or backend proxy exists to impersonate tenant shops. Platform operators view only aggregate usage counts and manage subscription states from the outside.





