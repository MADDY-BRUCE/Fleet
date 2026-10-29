# FleetWise — Kovai Central Dispatch Yard
> *"Every van accounted for. Every driver on the clock. Nothing double-booked."*

Built for **IT HAPPENS @ RAALE #13 (Logistics Track)**.

FleetWise is a full-stack warehouse and delivery dispatch management platform that replaces error-prone spreadsheets, phone calls, and memory with an atomic, conflict-proof dispatch engine.

---

## 1. Quick Start & Commands

```bash
# 1. Install all dependencies
npm install

# 2. Seed database with factory test fleet & manifest
npm run seed

# 3. Start full-stack application (server + React client on port 3000)
npm run dev

# 4. Run automated test suite verifying all 14 core rules (T1 to T14)
npm test

# 5. Run 20-thread concurrency race-condition stress test
npx tsx scripts/concurrency-test.ts
```

The application runs at `http://localhost:3000`.

---

## 2. Demo Credentials

| Role | Username / ID | Password | Access Area |
|---|---|---|---|
| **Dispatch Administrator** | `admin` | `Admin@123` | Admin Control Room (Live Yard Map, Assignment Console, Delivery Desk, Fleet & Crew, Rule Tests, Judge Walkthrough, Audit Log) |
| **Driver 1 (Arun)** | `D101` | `Driver@101` | Driver Gate (Driver Card, Vehicle Status, Live Trip Execution, Completed Trips) |
| **Driver 2 (Meena)** | `D102` | `Driver@102` | Driver Gate |
| **Driver 3 (Karthik)** | `D103` | `Driver@103` | Driver Gate |
| **Driver 4 (Priya - Off-duty)** | `D104` | `Driver@104` | Driver Gate (Currently marked unavailable) |
| **Driver 5 (Suresh)** | `D105` | `Driver@105` | Driver Gate |
| **Driver 6 (Divya)** | `D106` | `Driver@106` | Driver Gate |

*(Quick auto-fill buttons are provided on both login screens for convenience).*

---

## 3. System Architecture

```
                  ┌─────────────────────────────────────────┐
                  │    REACT SPA FRONTEND (Vite, TSX)       │
                  │   · Freight Yard Industrial Theme       │
                  │   · CAD Yard Map & Metric Gauges        │
                  │   · Assignment Console with Guardrails  │
                  └───────────────────▲─────────────────────┘
                                      │ REST API / JWT
                  ┌───────────────────▼─────────────────────┐
                  │    EXPRESS DISPATCH ENGINE (Node.js)    │
                  │   · Strict Role Authorization           │
                  │   · Atomic State Transitions            │
                  │   · Automatic Resource Release          │
                  └───────────────────▲─────────────────────┘
                                      │ BEGIN IMMEDIATE Tx
                  ┌───────────────────▼─────────────────────┐
                  │     SQLITE DATABASE (better-sqlite3)    │
                  │   · Partial UNIQUE indexes on active    │
                  │   · WAL mode for high concurrency       │
                  │   · Disk persistence across restarts    │
                  └─────────────────────────────────────────┘
```

---

## 4. Key Endpoints

- `GET /health` — Service health, database status, and uptime.
- `POST /api/auth/login` — Driver and Admin authentication.
- `POST /api/deliveries/:id/assign` — Atomic assignment transaction (`BEGIN IMMEDIATE`).
- `PATCH /api/deliveries/:id/status` — State machine transition with automatic resource release.
- `GET /api/deliveries/:id/recommend` — Smart vehicle & driver match recommendation.
- `POST /api/tests/run` — Executes in-engine rule suite (T1-T14).
- `POST /api/reset-demo` — Restores factory seed database.
