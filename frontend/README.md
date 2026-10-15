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

