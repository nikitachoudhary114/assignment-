# E-commerce Store

Full-stack TypeScript e-commerce demo with cart, checkout, and a reward-based discount system. nnnnnnnnnnnnn

## Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | Node.js, Express, TypeScript, Prisma |
| Frontend | Next.js 15, React 19, TypeScript    |
| Database | PostgreSQL 16 (Docker)              |
| Tests    | Vitest (core discount logic)        |

## Features

- **Cart** — Add, update, and remove items (session-based via `x-session-id` header)
- **Checkout** — Validates stock, applies discount codes, decrements inventory
- **Discount system** — Every Nth order (default: 3) earns a coupon for X% off (default: 10%)
- **Admin APIs** — Generate discount if eligible; view revenue, items sold, and discount stats
- **Frontend** — Shop, cart/checkout UI, and admin dashboard

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 4. Run migrations and seed

```bash
npm run db:generate -w backend
npm run db:push -w backend
npm run db:seed -w backend
```

### 5. Start dev servers

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Health check:** http://localhost:3001/health

## API reference

All cart/checkout routes require header: `x-session-id: <uuid>`

### Store

| Method | Endpoint                      | Description              |
| ------ | ----------------------------- | ------------------------ |
| GET    | `/api/products`               | List products            |
| GET    | `/api/cart`                   | Get cart                 |
| POST   | `/api/cart/items`             | Add item `{ productId, quantity }` |
| PATCH  | `/api/cart/items/:productId`  | Update quantity          |
| DELETE | `/api/cart/items/:productId`  | Remove item              |
| POST   | `/api/discount/validate`      | Validate code `{ code }` |
| POST   | `/api/checkout`               | Place order `{ discountCode? }` |

### Admin

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/api/admin/discount/generate`  | Generate code if Nth order met |
| GET    | `/api/admin/stats`              | Items sold, revenue, discounts |

## Environment variables

| Variable                 | Default                                      | Description                    |
| ------------------------ | -------------------------------------------- | ------------------------------ |
| `DATABASE_URL`           | `postgresql://ecommerce:ecommerce@localhost:5432/ecommerce` | PostgreSQL connection string   |
| `DISCOUNT_EVERY_NTH_ORDER` | `3`                                        | Issue coupon every N orders    |
| `DISCOUNT_PERCENTAGE`    | `10`                                         | Coupon discount %              |
| `PORT`                   | `3001`                                       | Backend port                   |
| `CORS_ORIGIN`            | `http://localhost:3000`                      | Allowed frontend origin        |
| `NEXT_PUBLIC_API_URL`    | `http://localhost:3001`                      | Backend URL for frontend       |

## Tests

```bash
npm test
```

Unit tests cover discount eligibility and calculation logic in `backend/src/services/discount.logic.test.ts`.

## Project structure

```
├── backend/
│   ├── prisma/          # Schema, seed
│   └── src/
│       ├── routes/      # HTTP handlers
│       └── services/    # Business logic
├── frontend/
│   └── app/             # Next.js pages
├── docker-compose.yml
├── DECISIONS.md
└── README.md
```

## Discount flow

1. Customer completes checkout → order count increments
2. If order count is a multiple of N → a new discount code is auto-generated
3. Admin can also call `/api/admin/discount/generate` to create one for the latest qualifying order
4. Customer applies code at checkout → validated (exists, unused) → discount applied

See [DECISIONS.md](./DECISIONS.md) for design rationale.
