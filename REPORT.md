# FLEETWISE TECHNICAL REPORT
### IT HAPPENS @ RAALE #13 · Logistics Track
**Facility:** Kovai Central Dispatch Yard, Coimbatore  
**System:** FleetWise Vehicle & Delivery Assignment System  
**Tagline:** *"Every van accounted for. Every driver on the clock. Nothing double-booked."*

---

## 1. What We Built

FleetWise is a full-stack, conflict-free logistics dispatch application created to replace manual, error-prone warehouse dispatching (phone calls, fragmented spreadsheets, human memory).

### Key Features
1. **Public Showcase Landing Page**:
   - Animated SVG/CSS warehouse apron scene with active bay doors, moving freight conveyors, and vehicles circulating the dispatch lane.
   - Live counter strip ticker (`1,200,000 sq ft`, `850 trucks`, `0 double-bookings`).
   - Interactive draggable slider comparing "The Old Way" (spreadsheet collisions) vs "The FleetWise Way" (ACID transaction locks).
   - Horizontal lifecycle timeline with moving freight indicator.
   - Industrial zones tour (Cold Storage, Bulk Haul, Express Dock, Maintenance Shed).
2. **Driver Portal (Models 1 & 2)**:
   - Mobile-first layout tailored for touch devices.
   - **Model 2 (Driver Card)**: Status switcher (`available` vs `unavailable`). **Enforces strict rule**: driver is blocked from going off-duty while assigned to an active delivery.
   - **Model 1 (Vehicle Card)**: Details of assigned vehicle or "On standby" idle state.
   - **My Current Job**: Live delivery manifest ticket with thumb-sized action buttons: **Start Trip** (`assigned` &rarr; `in_transit`) and **Mark Delivered** (`in_transit` &rarr; `delivered`).
   - Automatic resource release upon delivery: vehicle and driver are immediately returned to available status.
   - Completed trip history table and read-only yard fleet board.
3. **Admin Portal (Models 3 & 4 + Operations Suite)**:
   - **Live Operations Board**: Top-down CAD yard map of 8 loading bays with real-time status color coding, vehicle inspection drawer, metric gauges, priority queue with dispatch recommendations, and live audit log stream.
   - **Assignment Console (Model 4)**: Filters dropdowns to show **only eligible** vehicles and drivers. Executes atomic assignment with instant feedback or explicit conflict reason banners.
   - **Delivery Desk (Model 3)**: Full delivery lifecycle management with priority tape badges, status stamps, search/filters, and cancellation handling.
   - **Fleet & Crew (Mandatory Section 3.3)**: Full CRUD for vehicles and drivers with active-assignment guardrails (cannot change an assigned vehicle to maintenance or an assigned driver to unavailable).
   - **Automated Rule Tests Runner**: Browser-based runner executing the complete T1 to T14 test harness with live input/expected/observed results.
   - **Judge Walkthrough**: Interactive 4-step acceptance checklist with one-click live API execution and raw JSON output logs.
   - **Audit Trail**: Immutable chronological log of all assignments, transitions, and status updates.

---

## 2. Data Model

The data layer is persisted in SQLite using strict schema definitions, foreign keys, and engine-level constraints:

```
┌─────────────────────────┐         ┌─────────────────────────┐
│        VEHICLES         │         │         DRIVERS         │
├─────────────────────────┤         ├─────────────────────────┤
│ vehicle_id (PK)         │         │ driver_id (PK)          │
│ registration_no (UNIQUE)│         │ name                    │
│ type                    │         │ phone                   │
│ capacity (kg)           │         │ availability_status     │
│ status                  │         └────────────┬────────────┘
└────────────┬────────────┘                      │
             │              ┌────────────────────┤
             │              │                    │
             ▼              ▼                    ▼
┌─────────────────────────────────┐    ┌─────────────────────────┐
│           ASSIGNMENTS           │    │          USERS          │
├─────────────────────────────────┤    ├─────────────────────────┤
│ assignment_id (PK)              │    │ id (PK)                 │
│ delivery_id (FK -> deliveries)  │    │ username (UNIQUE)       │
│ vehicle_id  (FK -> vehicles)    │    │ password_hash           │
│ driver_id   (FK -> drivers)     │    │ role ('admin'|'driver') │
│ assigned_at                     │    │ driver_id (FK)          │
│ released_at                     │    └─────────────────────────┘
│ is_active (0 or 1)              │
└────────────────▲────────────────┘
                 │
┌────────────────┴────────────────┐
│           DELIVERIES            │
├─────────────────────────────────┤
│ delivery_id (PK)                │
│ pickup                          │
│ dropoff                         │
│ scheduled_time                  │
│ priority                        │
│ status                          │
└─────────────────────────────────┘
```

### Entity Fields and Status Values
- **Vehicle**: `vehicle_id` (PK, e.g. V101), `registration_no` (UNIQUE, e.g. TN38AB1234), `type` (`Van` | `Truck` | `Mini-truck` | `Bike`), `capacity` (INTEGER kg > 0), `status` (`available` | `assigned` | `maintenance` | `inactive`).
- **Driver**: `driver_id` (PK, e.g. D101), `name`, `phone`, `availability_status` (`available` | `assigned` | `unavailable`).
- **Delivery**: `delivery_id` (PK, e.g. DL101), `pickup`, `dropoff`, `scheduled_time`, `priority` (`Low` | `Medium` | `High` | `Urgent`), `status` (`pending` | `assigned` | `in_transit` | `delivered` | `cancelled`).
- **Assignment**: `assignment_id` (PK), `delivery_id`, `vehicle_id`, `driver_id`, `assigned_at`, `released_at` (nullable), `is_active` (`1` active, `0` released).
- **AuditLog**: `id` (PK), `timestamp`, `actor`, `action`, `entity`, `entity_id`, `details`.
- **User**: `id` (PK), `username` (UNIQUE), `password_hash`, `role` (`admin` | `driver`), `driver_id` (FK).

### Definition of "Active"
A delivery is active **if and only if** its status is `assigned` or `in_transit`. `delivered` and `cancelled` records have `is_active = 0` in assignments and never block subsequent assignments.

---

## 3. Assignment Rule & Concurrency Handling

### The Core Assignment Invariant
```
IF delivery.status == pending
AND vehicle.status == available
AND driver.availability_status == available
AND no active assignment uses vehicle
AND no active assignment uses driver:
    create assignment (is_active = 1)
    mark vehicle assigned
    mark driver assigned
    mark delivery assigned
ELSE:
    reject with exact conflict error code, and change NOTHING
```

### Defense-in-Depth Concurrency Strategy
Double-booking is prevented across three independent tiers:

1. **Transaction Isolation (`BEGIN IMMEDIATE`)**:
   Better-SQLite3 write transactions acquire an immediate reserved lock on the database file. Two parallel assignment requests cannot enter the write phase simultaneously.
2. **Atomic Verification & Multi-Entity Write**:
   Within the transaction, the delivery, vehicle, and driver are re-queried from disk. If any entity is busy, the transaction is immediately aborted before any state is mutated.
3. **Database-Level Partial Unique Indexes**:
   Even if application code suffered a bug or race condition, the database engine enforces:
   ```sql
   CREATE UNIQUE INDEX idx_assignments_active_vehicle ON assignments(vehicle_id) WHERE is_active = 1;
   CREATE UNIQUE INDEX idx_assignments_active_driver ON assignments(driver_id) WHERE is_active = 1;
   CREATE UNIQUE INDEX idx_assignments_active_delivery ON assignments(delivery_id) WHERE is_active = 1;
   ```
   Any attempt to insert a duplicate active assignment raises a `SQLITE_CONSTRAINT_UNIQUE` exception at the storage engine level.
4. **Failure Rollback Integrity**:
   If an error is thrown midway (simulated I/O failure or network disconnect), SQLite automatically rolls back all table modifications. Zero dirty state persists.

---

## 4. Methods and Decisions

| Architecture Layer | Technology Chosen | Rationale & Rejected Alternatives |
|---|---|---|
| **Backend Runtime** | Node.js + Express + TypeScript | Lightweight, fast startup, shared types between client and server. |
| **Database** | SQLite via `better-sqlite3` | **Chosen:** Synchronous C++ binding with real transactions (`BEGIN IMMEDIATE`), sub-millisecond query execution, zero external network latency, partial UNIQUE indexes. <br>**Rejected:** Client-side mock storage (fails persistence and concurrency), PostgreSQL (unnecessary operational overhead for single-facility warehouse). |
| **Frontend Framework** | React 19 + Vite | Fast compilation, modular component state, instant client-side filtering. |
| **Design Language** | "Freight Yard Industrial" (CSS Variables + Tailwind) | Replaced generic "AI slop" (blue gradients, pill capsules, soft shadows) with high-contrast concrete `#E9E4D8`, safety yellow `#FFC20E`, Archivo Black / IBM Plex typography, and brutalist offset shadows. |
| **Authentication** | HMAC-SHA256 Signed Session Tokens + Bcrypt | Self-contained, secure token verification without external OAuth dependencies. |

---

## 5. Results: Automated Rule Verification (T1 – T14)

The test suite was executed directly against an isolated database harness using `npm test`. All 14 tests passed with 100% compliance:

| ID | Test Case | Expected Result | Observed Result | Status |
|---|---|---|---|---|
| **T1** | Valid assignment | Success (201); delivery, vehicle, driver marked assigned | Success: Assigned ID=A863434, Delivery=assigned, Vehicle=assigned, Driver=assigned | **PASS** |
| **T2** | Same vehicle on second active delivery | Rejected (409) `VEHICLE_UNAVAILABLE`; records unchanged | Rejected (409) [VEHICLE_UNAVAILABLE]: Vehicle V101 is already assigned to active delivery DL101. DL102 remained pending, D102 remained available | **PASS** |
| **T3** | Same driver on second active delivery | Rejected (409) `DRIVER_UNAVAILABLE`; records unchanged | Rejected (409) [DRIVER_UNAVAILABLE]: Driver Arun (D101) is already assigned to active delivery DL101. DL102 remained pending, V102 remained available | **PASS** |
| **T4** | Both vehicle & driver occupied | Rejected (409) `BOTH_UNAVAILABLE` with composite reason | Rejected (409) [BOTH_UNAVAILABLE]: Both vehicle V101 (assigned) and driver Arun (assigned) are currently unavailable | **PASS** |
| **T5** | Driver set to unavailable | Rejected (409) `DRIVER_UNAVAILABLE`; delivery stays pending | Rejected (409) [DRIVER_UNAVAILABLE]: Driver Priya (D104) is marked off-duty/unavailable. DL101 remained pending | **PASS** |
| **T6** | Vehicle in maintenance | Rejected (409) `VEHICLE_UNAVAILABLE` indicating maintenance | Rejected (409) [VEHICLE_UNAVAILABLE]: Vehicle V104 is currently undergoing maintenance | **PASS** |
| **T7** | Unknown IDs (vehicle, driver, delivery) | HTTP 404 for all cases, safe handling, zero crash | All 3 missing ID scenarios returned HTTP 404 with specific `NOT_FOUND` error codes | **PASS** |
| **T8** | Complete delivery | Delivery=delivered; assignment `is_active=0`; vehicle & driver available | Resources released: Delivery=delivered, V101=available, D101=available, Assignment is_active=0, released_at populated | **PASS** |
| **T9** | Cancel delivery | Delivery=cancelled; assignment deactivated; resources released | Cancelled successfully: Delivery=cancelled, V101=available, D101=available, Assignment released_at populated | **PASS** |
| **T10** | Invalid status transition | Pending delivery cannot transition to delivered directly | Both invalid transitions rejected (409 `INVALID_TRANSITION`). DL101 remains pending | **PASS** |
| **T11** | Duplicate submit idempotency | 1st succeeds, 2nd rejected (409); only 1 active assignment in DB | 2nd submit blocked with [DELIVERY_NOT_PENDING]. Total active assignments in DB = 1 | **PASS** |
| **T12** | Concurrent requests for same vehicle | Exactly 1 succeeds, other rejected | Exactly 1 succeeded and 1 rejected. Active assignments for V101 in DB = 1 | **PASS** |
| **T13** | Mid-assignment rollback integrity | Forced failure in transaction triggers complete rollback | Rollback confirmed: Vehicle remained available, Delivery remained pending, 0 assignments written | **PASS** |
| **T14** | Vehicle status protection | Cannot set vehicle to maintenance while assigned | Rejected (409) [ACTIVE_ASSIGNMENT_EXISTS]. Vehicle status remained assigned | **PASS** |

### Concurrency Stress Test Results (`scripts/concurrency-test.ts`)
- **Total simultaneous requests fired at Vehicle V101:** 20
- **Successful assignments:** 1 (Delivery RACE_1)
- **Rejected conflicts:** 19 (`VEHICLE_UNAVAILABLE`)
- **Active assignments in DB for V101:** Exactly 1
- **Double bookings:** 0

---

## 6. Team Work & Division of Responsibilities

| Component | Planned Owner | Actual Progress | Dead End / Pivot Encountered |
|---|---|---|---|
| Database Schema & Index Constraints | [Team Member 1] | Completed 100% | Initial plan considered tracking assignment state solely via vehicle/driver columns; pivoted to dedicated `assignments` table with partial unique index to maintain audit history. |
| Assignment Service & Transaction Core | [Team Member 2] | Completed 100% | Evaluated asynchronous file locks; discarded in favor of SQLite native `BEGIN IMMEDIATE` for zero race-condition window. |
| API Layer, Auth & Health Endpoints | [Team Member 3] | Completed 100% | Attempted external OAuth library; replaced with zero-dependency HMAC-SHA256 tokens to ensure reliable offline local evaluation. |
| Frontend Portals & CAD Yard Map | [Team Member 4] | Completed 100% | Initial prototype used rounded cards; redesigned into "Freight Yard Industrial" with high-contrast stamps and CAD bay view. |

---

## 7. Limitations & Next Steps

1. **Multi-Stop Route Bundling**: Currently each delivery is assigned to one vehicle and driver. In high-density urban areas, dispatchers would benefit from grouping multiple small parcels into a single manifest run.
2. **GPS Geofencing for Automatic Check-in**: Deliveries are currently completed by driver button click in the portal. Future versions could integrate GPS polygon triggers to mark arrival at dropoff automatically.
3. **Automated Preventive Maintenance Scheduling**: Vehicle maintenance is currently toggled manually. Mileage or engine hours counters could automatically flag vehicles for inspection after 5,000 km.

---

## 8. How to Run

```bash
# 1. Install packages
npm install

# 2. Seed database
npm run seed

# 3. Launch application
npm run dev

# 4. Verify test suite
npm test
```
- App URL: `http://localhost:3000`
- Admin Login: `admin` / `Admin@123`
- Driver Login: `D101` / `Driver@101`
