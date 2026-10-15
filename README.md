# Multi-Tenant, Multi-Branch Clothing Retail POS (Bangladesh Market)

A SaaS platform for multi-branch clothing retail businesses in Bangladesh.

## Project Structure

```
shop-management-sass-project/
├── backend/    # NestJS, Prisma 7, PostgreSQL, Redis, ESM, Vitest (Port 4000)
└── frontend/   # Next.js (App Router), Tailwind CSS, TanStack Query, Zustand, Vitest (Port 3000)
```

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm install
npm run start:dev
# API available at http://localhost:4000/api/v1
```

To run backend tests:
```bash
cd backend
npm run test
# 110 passing unit and integration tests
```

### 2. Start the Frontend
```bash
cd frontend
pnpm install
pnpm dev
# Web application available at http://localhost:3000
```

To run frontend tests:
```bash
cd frontend
pnpm test
# 31 passing tests (Vitest + React Testing Library)
```

To build frontend for production:
```bash
cd frontend
pnpm build
```

## Documentation
- Detailed frontend guide, architecture conventions, and backend endpoint mapping: [Frontend README](frontend/README.md)
- Component showcase in browser: `http://localhost:3000/dev/components`
