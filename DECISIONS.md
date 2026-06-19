# Design Decisions

This document records key architectural choices for the e-commerce assignment.

---

## Decision: Monorepo with npm workspaces

**Context:** The project has a Node.js API and a Next.js frontend that share types and deployment docs.

**Options Considered:**
- Option A: Separate repositories for backend and frontend
- Option B: Single monorepo with npm workspaces (`backend` + `frontend`)

**Choice:** Option B — npm workspaces monorepo

**Why:** One clone, one README, and shared scripts (`npm run dev` starts both). For an assignment-sized project this reduces setup friction without the overhead of Turborepo or Nx. Each package still has its own `package.json` and can be deployed independently later.

---

## Decision: Express for the backend

**Context:** The assignment asks for working APIs with good code quality; Express is the most widely used Node.js HTTP framework.

**Options Considered:**
- Option A: Express — largest ecosystem, most tutorials, familiar middleware model
- Option B: Fastify — higher throughput, built-in JSON schema validation hooks

**Choice:** Option A — Express

**Why:** Express keeps the stack familiar and easy to review for an assignment. Request validation is handled with Zod at the route layer, and route modules use `Router` for clean separation. The performance difference is negligible at this scale.

---

## Decision: Session-based carts via `x-session-id` header

**Context:** Carts need to persist across requests without building full user authentication.

**Options Considered:**
- Option A: JWT / user accounts with login
- Option B: Anonymous session ID stored in localStorage, sent as `x-session-id` header
- Option C: Server-side cookies only

**Choice:** Option B — client-generated UUID in header

**Why:** No auth scope for this assignment. The header is explicit and easy to test with curl/Postman. The frontend generates and persists a UUID in `localStorage`. Carts are keyed by `sessionId` in the database. Trade-off: no cross-device cart sync, which is acceptable for a demo.

---

## Decision: Pure functions for discount logic + integration in service layer

**Context:** Unit tests are required for core business logic; discount rules must be correct and testable.

**Options Considered:**
- Option A: Test everything through HTTP/integration tests only
- Option B: Extract pure functions (`shouldEarnDiscount`, `calculateDiscount`) and unit test them; services orchestrate DB calls

**Choice:** Option B — pure logic module + service layer

**Why:** `discount.logic.ts` has zero DB dependencies, so Vitest tests run instantly without Docker. The service layer (`store.service.ts`) handles Prisma transactions, stock checks, and code generation. This separation makes the Nth-order rule obvious and verifiable.

---

## Decision: Auto-generate discount on checkout + admin manual trigger

**Context:** Every Nth order should earn a coupon; admin API must also generate a code when the condition is satisfied.

**Options Considered:**
- Option A: Only admin manually generates codes after checking order count
- Option B: Auto-generate on checkout when order number is divisible by N; admin endpoint as backup/idempotent trigger

**Choice:** Option B — auto on checkout + admin endpoint

**Why:** Customers get immediate feedback (`earnedDiscountCode` in checkout response). The admin endpoint is idempotent — if a code already exists for the qualifying order, it returns the existing code instead of duplicating. Configurable via `DISCOUNT_EVERY_NTH_ORDER` and `DISCOUNT_PERCENTAGE` env vars.

---

## Decision: Denormalized `StoreStats` table for admin metrics

**Context:** Admin API must return items purchased, revenue, total discounts, and list of discount codes quickly.

**Options Considered:**
- Option A: Compute aggregates on every admin request (`SUM` over orders)
- Option B: Maintain a single `StoreStats` row updated atomically during checkout

**Choice:** Option B — incremental stats row

**Why:** For a demo store, admin reads are instant without scanning all orders. Checkout already runs in a transaction, so incrementing stats is consistent. Discount code list still comes from the `discount_codes` table for full detail. Trade-off: stats could drift if data is edited manually — acceptable here; production would use DB aggregates or event sourcing.

---

## Decision: Next.js App Router for the frontend

**Options Considered:**
- Option A: Vite + React SPA
- Option B: Next.js 15 App Router with client components for interactive pages

**Choice:** Option B — Next.js App Router

**Why:** File-based routing (`/`, `/cart`, `/admin`), built-in metadata, and easy env handling for `NEXT_PUBLIC_API_URL`. Interactive pages use `"use client"` where needed; no SSR complexity required for this API-driven UI.
