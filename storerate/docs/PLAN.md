> **Design document** — the implementation plan that was reviewed and approved before development started.
> The [README](../README.md) describes the final implementation; where the two differ, the README wins.

# StoreRate — Implementation Plan & Architecture

> Store-rating platform for the **FullStack Intern Coding Challenge (V1.1)**
> Stack: **Express 5 · PostgreSQL 17 · React 19 (Vite)** — plain JavaScript on both ends.
> Status: **DRAFT — awaiting your approval before any code is written.**

---

## 0. Table of contents

1. Goals & scope
2. Tech stack & library choices (with rationale)
3. System architecture
4. Database schema
5. API design
6. Authorization matrix
7. Validation rules (shared by frontend & backend)
8. Backend folder structure
9. Frontend architecture & folder structure
10. UI screen designs (wireframes)
11. Security & best-practice checklist
12. Testing strategy
13. Dev workflow, environment variables & how to run
14. Build order / milestones
15. Decisions made where the spec is silent (please confirm or veto)
16. Out of scope

---

## 1. Goals & scope

Build a web app where users rate registered stores (1–5) with a **single login** and **three roles**:

| Role | Key capabilities |
|---|---|
| **System Administrator** | Dashboard (totals), add users (any role) & stores, list/filter/sort users & stores, view user details (incl. store owner rating) |
| **Normal User** | Self-signup, browse/search stores, submit & modify a rating per store, change password |
| **Store Owner** | Dashboard: average rating of their store + list of users who rated it, change password |

Cross-cutting: shared validation rules, sortable (asc/desc) tables everywhere, clean REST API, sound schema.

---

## 2. Tech stack & library choices

### Backend (`/backend`)
| Concern | Choice | Why |
|---|---|---|
| Runtime / framework | Node 20, **Express 5** | Required option; v5 handles async errors natively (no `asyncHandler` wrapper) |
| Database | **PostgreSQL 17** | Required option; native enums, CHECK constraints, partial/expression indexes |
| DB access | **Knex.js** (`pg` driver) | Built-in migrations + seeds; safe *dynamic* query composition for filters/sorting (a core requirement); raw SQL where it's clearer (aggregates). No code-gen or engine binaries. The migration file doubles as explicit, reviewable schema design. |
| Validation | **zod** | One schema per endpoint, reusable field rules, structured field-level errors |
| Auth | **jsonwebtoken** + **bcryptjs** | Stateless JWT (Bearer); bcryptjs = no native build step |
| Security | **helmet**, **cors**, **express-rate-limit** | Secure headers, origin control, brute-force protection on auth routes |
| Logging | **morgan** (dev) | Request logs |
| Config | **dotenv** + validated `env.js` | Fail fast on missing config |
| Tests | **node:test** (built-in) + **supertest** | Zero extra test framework; integration tests hit a real test DB |

> Alternative considered: **Prisma**. Great DX, but CHECK constraints and expression indexes need hand-written SQL anyway, and it adds a code-gen/engine step. Knex keeps the SQL visible, which suits a "schema best practices" grading criterion. Happy to switch if you prefer Prisma.

### Frontend (`/frontend`)
| Concern | Choice | Why |
|---|---|---|
| Framework / tooling | **React 19 + Vite** | Required option; fast dev server with `/api` proxy |
| Routing | **react-router** (v7, declarative mode) | Nested layouts, role-guarded routes |
| HTTP | **axios** | Interceptors for auth header & 401 auto-logout |
| State | React Context (`AuthContext`) + local component state + a `useListQuery` hook | App is small; no Redux needed. Server data is fetched per page. |
| Styling | **Hand-written CSS** (CSS variables, no UI framework) | Zero external deps, works offline, shows CSS competence; responsive |
| Forms | Controlled components + shared `validators.js` | Transparent; mirrors backend rules exactly |

### Repo tooling
- Root `package.json` with `concurrently` → `npm run dev` starts both apps.
- `docker-compose.yml` (Postgres only) for people who don't have Postgres locally.
- ESLint + Prettier config on both sides.
- `.env.example` files, `README.md` with setup, API docs, demo credentials.

---

## 3. System architecture

```
┌──────────────────────────────┐        ┌─────────────────────────────────────┐        ┌──────────────────┐
│  Browser                     │        │  Backend (Express 5)  :4000          │        │  PostgreSQL 17   │
│  React SPA (Vite :5173)      │  HTTP  │                                      │  SQL   │                  │
│  ───────────────────────     │ ─────▶ │  /api/auth    /api/admin             │ ─────▶ │  users           │
│  AuthContext (JWT in         │  JSON  │  /api/stores  /api/owner             │ (knex) │  stores          │
│  localStorage) → axios       │ ◀───── │  /api/health                         │ ◀───── │  ratings         │
│  Authorization: Bearer <jwt> │        │                                      │        │                  │
└──────────────────────────────┘        └─────────────────────────────────────┘        └──────────────────┘
   In dev, Vite proxies /api/* → localhost:4000 (same-origin for the browser, no CORS pain).
   In prod, the built SPA can be served by any static host (or by Express) with CORS restricted to CLIENT_ORIGIN.
```

### Request lifecycle (backend)
```
request
  → helmet → cors → express.json (10kb limit) → morgan
  → rate-limit (auth routes only)
  → router
      → authenticate      (verify JWT, load req.user {id, role})
      → authorize(roles)  (403 if role not allowed)
      → validate(schema)  (zod: body / query / params → 400 with field errors)
      → controller        (thin: parse input, call service, shape response)
      → service           (business rules, transactions, aggregates)
      → knex → PostgreSQL
  → response JSON
  ✗ any thrown error → notFound / errorHandler → consistent JSON error
```

### Auth flow
1. `POST /api/auth/login` → verify bcrypt hash → sign JWT `{ sub: userId, role }` (expires in 24h).
2. Client stores token + user in `localStorage`; axios interceptor adds `Authorization: Bearer`.
3. On app load, `GET /api/auth/me` re-validates the token and refreshes the user object.
4. `401` from any call → interceptor clears session → redirect to `/login`.
5. Logout = delete token client-side (stateless JWT; no server state to invalidate).

---

## 4. Database schema

### ERD
```
┌───────────────────────┐          ┌───────────────────────┐          ┌───────────────────────┐
│ users                 │          │ stores                │          │ ratings               │
├───────────────────────┤          ├───────────────────────┤          ├───────────────────────┤
│ id            PK      │◀──┐      │ id            PK      │◀──┐      │ id            PK      │
│ name                  │   │ 1..1 │ name                  │   │      │ user_id       FK ─────┼──▶ users.id
│ email        UQ(lower)│   └──────┤ owner_id      FK, UQ  │   └──────┤ store_id      FK      │
│ password_hash         │          │ email        UQ(lower)│          │ rating  1..5          │
│ address               │          │ address               │          │ created_at            │
│ role  enum            │          │ created_at            │          │ updated_at            │
│ created_at            │          │ updated_at            │          │ UQ(user_id, store_id) │
│ updated_at            │          └───────────────────────┘          └───────────────────────┘
└───────────────────────┘
  one store_owner ──owns── exactly one store        one user ──rates── each store at most once
```

### DDL (what the Knex migration will produce)
```sql
CREATE TYPE user_role AS ENUM ('admin', 'user', 'store_owner');

CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL CHECK (char_length(name) BETWEEN 20 AND 60),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address       VARCHAR(400) NOT NULL CHECK (char_length(address) <= 400),
  role          user_role    NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));   -- case-insensitive uniqueness
CREATE INDEX        users_role_idx         ON users (role);

CREATE TABLE stores (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(60)  NOT NULL CHECK (char_length(name) BETWEEN 20 AND 60),
  email       VARCHAR(255) NOT NULL,
  address     VARCHAR(400) NOT NULL CHECK (char_length(address) <= 400),
  owner_id    INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX stores_email_lower_uidx ON stores (lower(email));

CREATE TABLE ratings (
  id          INTEGER  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER  NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  store_id    INTEGER  NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)                       -- one rating per user per store (modify = update)
);
CREATE INDEX ratings_store_id_idx ON ratings (store_id);   -- averages per store

-- updated_at maintained by a trigger on all three tables
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;
```

### Design notes
- **Ratings are never stored redundantly** — "overall rating" is always `ROUND(AVG(rating), 1)` + `COUNT(*)` computed in queries (`LEFT JOIN` on an aggregate subquery). No drift, no triggers to keep in sync.
- **DB-level constraints mirror the form rules** (lengths, 1–5 range, uniqueness) — the API validates first for nice messages; the DB is the last line of defence.
- **`owner_id UNIQUE NOT NULL`** encodes "a store owner has *their* store" (spec language is singular). The service layer additionally verifies the owner's role is `store_owner`.
- **Emails are lower-cased on write** and unique on `lower(email)`.
- `ON DELETE RESTRICT` for store owners (can't orphan a store), `CASCADE` for ratings (deleting a user/store removes their ratings). Deletion endpoints are out of scope, but the schema is ready.
- IDs are integer identities (simple, sortable). Nothing in the app leaks sensitive info via sequential IDs; UUIDs are an easy swap if desired.
- Password hashes never leave the service layer (explicit column selects everywhere).

### Seed data (`npm run db:seed`)
All names are ≥ 20 chars to satisfy the validation rule. Demo credentials (dev only):

| Role | Name | Email | Password |
|---|---|---|---|
| admin | System Administrator Account | admin@storerate.com | `Admin@1234` |
| store_owner ×4 | e.g. "Rajesh Kumar Venkateshwarlu" | owner1..4@storerate.com | `Owner@1234` |
| user ×5 | e.g. "Priya Lakshmi Narasimhan" | user1..5@storerate.com | `User@12345` |

Stores (Hyderabad flavour): "Kukatpally Fresh Mart Supermarket", "Hitech City Electronics Hub Store", "Madhapur Organic Grocery Corner", "Jubilee Hills Bookstore and Cafe" — each owned by one owner, with ~15 ratings spread across users so averages are non-trivial.

---

## 5. API design

### Conventions
- Base path `/api`, JSON in/out, camelCase keys (DB snake_case ↔ camelCase conversion is centralised in the knex config).
- Auth: `Authorization: Bearer <jwt>`.
- Success: resource JSON directly; list endpoints return `{ data: [...], meta: { page, limit, total, totalPages } }`.
- Errors — one shape everywhere:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Validation failed",
               "details": [ { "field": "name", "message": "Name must be 20–60 characters" } ] } }
  ```
  Codes: `VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 (duplicate email / owner already has a store) · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500.
- **List query params** (shared helper, used by every table):
  `sortBy=<whitelisted field>&order=asc|desc&page=1&limit=10` + endpoint-specific filters (`ILIKE %term%`, with `%`/`_` escaped). Unknown `sortBy` → 400 (prevents ORDER BY injection). `limit` capped at 100.

### Endpoints

#### Auth — `/api/auth`
| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/register` | public | `{ name, email, address, password }` | `201 { token, user }` — role is always `user` |
| POST | `/login` | public | `{ email, password }` | `200 { token, user }` |
| GET | `/me` | any logged-in | — | `200 { user }` (+ `store` summary for owners) |
| PATCH | `/password` | any logged-in | `{ currentPassword, newPassword }` | `200 { message }` |
| — | logout | — | client-side (discard token) | — |

#### Admin — `/api/admin` (role: `admin`)
| Method | Path | Query / Body | Response |
|---|---|---|---|
| GET | `/dashboard` | — | `{ totalUsers, totalStores, totalRatings }` |
| GET | `/users` | filters `name, email, address, role`; `unassignedOwners=true` (owners without a store — for the Add Store dropdown); sort `name|email|address|role|createdAt` | `{ data: [{ id, name, email, address, role, createdAt }], meta }` |
| POST | `/users` | `{ name, email, password, address, role }` (`admin|user|store_owner`) | `201 { user }` |
| GET | `/users/:id` | — | `{ user: {…}, store: { id, name, averageRating, ratingCount } \| null }` (store only for owners) |
| GET | `/stores` | filters `name, email, address`; sort `name|email|address|rating|createdAt` | `{ data: [{ id, name, email, address, averageRating, ratingCount, owner: { id, name, email } }], meta }` |
| POST | `/stores` | `{ name, email, address, ownerId }` **or** `{ name, email, address, owner: { name, email, password, address } }` (creates the owner + store in one transaction) | `201 { store }` |

#### Stores & ratings — `/api/stores` (role: `user`)
| Method | Path | Query / Body | Response |
|---|---|---|---|
| GET | `/` | `q` (matches name **or** address), or `name`, `address`; sort `name|address|rating|myRating` | `{ data: [{ id, name, address, averageRating, ratingCount, myRating }], meta }` |
| PUT | `/:storeId/rating` | `{ rating: 1..5 }` — **upsert**: `201` when first submitted, `200` when modified | `{ rating: { id, rating, updatedAt }, store: { id, averageRating, ratingCount } }` |

#### Store owner — `/api/owner` (role: `store_owner`)
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/dashboard` | — | `{ store: { id, name, email, address, averageRating, ratingCount } }` |
| GET | `/ratings` | sort `name|email|rating|createdAt`, page/limit | `{ data: [{ id, rating, createdAt, updatedAt, user: { id, name, email } }], meta }` |

#### Misc
| GET | `/api/health` | → `{ status: "ok", db: "up" }` |

### Example: rating upsert (single SQL round-trip)
```sql
INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)
ON CONFLICT (user_id, store_id) DO UPDATE SET rating = EXCLUDED.rating
RETURNING *, (xmax = 0) AS inserted;   -- tells us 201 vs 200
```

---

## 6. Authorization matrix

| Capability | admin | user | store_owner |
|---|:-:|:-:|:-:|
| Register (self-signup) | — | ✔ (public) | — |
| Login / logout / change password | ✔ | ✔ | ✔ |
| Admin dashboard, add users/stores, list & view users/stores | ✔ | ✗ | ✗ |
| Browse/search stores with own rating | ✗ | ✔ | ✗ |
| Submit / modify a rating | ✗ | ✔ | ✗ |
| Owner dashboard (avg + raters) | ✗ | ✗ | ✔ |

Enforced on the server by `authorize(...roles)`; the client hides/redirects for UX only.

---

## 7. Validation rules (single source of truth on each side)

| Field | Rule | Error message |
|---|---|---|
| name (users **and** stores) | 20–60 chars, trimmed | "Name must be between 20 and 60 characters" |
| email | RFC-style email, lower-cased, ≤255 | "Enter a valid email address" |
| address | required, ≤400 chars | "Address must be at most 400 characters" |
| password | 8–16 chars, ≥1 uppercase, ≥1 special (`!@#$%^&*()_+-=[]{};':"\\|,.<>/?~`) | "Password must be 8–16 characters with at least one uppercase letter and one special character" |
| rating | integer 1–5 | "Rating must be between 1 and 5" |
| role | one of `admin`, `user`, `store_owner` | "Invalid role" |
| newPassword | password rule + ≠ currentPassword | — |

Backend: `src/validation/rules.js` (zod primitives) composed into per-endpoint schemas.
Frontend: `src/utils/validators.js` (same regexes/limits), used for inline, on-blur feedback; server errors are mapped back onto fields too.

---

## 8. Backend folder structure

```
backend/
├── package.json
├── .env.example
├── knexfile.js                     # dev / test / production connections
├── src/
│   ├── server.js                   # boot: validate env → connect DB → listen
│   ├── app.js                      # express app: middleware + routers (exported for tests)
│   ├── config/
│   │   ├── env.js                  # typed, validated env (PORT, DATABASE_URL, JWT_SECRET, …)
│   │   └── db.js                   # knex instance + snake/camel case mapping
│   ├── db/
│   │   ├── migrations/20260101_000_init.js
│   │   └── seeds/01_demo_data.js
│   ├── middleware/
│   │   ├── authenticate.js         # JWT → req.user
│   │   ├── authorize.js            # authorize('admin', 'store_owner')
│   │   ├── validate.js             # validate({ body, query, params })
│   │   ├── rateLimit.js
│   │   ├── notFound.js
│   │   └── errorHandler.js         # ApiError → JSON; pg unique_violation → 409; else 500
│   ├── modules/                    # feature-first; each = routes + controller + service + validation
│   │   ├── auth/      auth.routes.js  auth.controller.js  auth.service.js  auth.validation.js
│   │   ├── admin/     admin.routes.js admin.controller.js admin.service.js admin.validation.js
│   │   ├── stores/    stores.routes.js stores.controller.js stores.service.js stores.validation.js
│   │   └── owner/     owner.routes.js owner.controller.js owner.service.js owner.validation.js
│   ├── utils/
│   │   ├── ApiError.js             # ApiError.badRequest(), .conflict(), …
│   │   ├── listQuery.js            # pagination + whitelisted sorting + ILIKE filters → { data, meta }
│   │   ├── password.js             # hash / verify (bcryptjs, cost 10)
│   │   └── jwt.js                  # sign / verify
│   └── validation/
│       └── rules.js                # name, email, address, password, rating, role (zod)
└── tests/
    ├── helpers/testDb.js           # migrate:latest + truncate between tests
    ├── validation.test.js          # unit: every rule's boundaries
    ├── auth.test.js                # register/login/me/password, 401s
    ├── admin.test.js               # RBAC, create user/store, filters, sorting, dashboard counts
    └── ratings.test.js             # upsert 201→200, average recalculates, owner sees rater
```

---

## 9. Frontend architecture & folder structure

### Routing & guards
```
/                      → RoleRedirect (admin→/admin, user→/stores, store_owner→/owner, guest→/login)
/login, /signup        → PublicOnlyRoute (redirects logged-in users to /)
/change-password       → ProtectedRoute (any role)
/admin                 → RoleRoute('admin')  → AppLayout
   /admin              Dashboard
   /admin/users        Users list   ·  /admin/users/new  Add user  ·  /admin/users/:id  User detail
   /admin/stores       Stores list  ·  /admin/stores/new Add store
/stores                → RoleRoute('user')        → Store browsing + rating
/owner                 → RoleRoute('store_owner') → Owner dashboard
*                      → NotFound
```

### State & data flow
- `AuthContext`: `{ user, token, login(), logout(), updateUser() }`, hydrated from `localStorage`, re-validated via `/auth/me` on load.
- `api/client.js`: axios instance (`baseURL: '/api'`), request interceptor (Bearer), response interceptor (401 → logout; normalises error shape).
- `useListQuery()`: holds `{ filters, sortBy, order, page, limit }`, syncs them to the URL query string (shareable/bookmarkable, survives refresh), debounces filter input (300 ms), exposes `toggleSort(field)`.
- Each page fetches its own data with a tiny `useFetch`-style pattern (loading / error / data) — no global server cache needed.

### Folder structure
```
frontend/
├── index.html
├── vite.config.js                  # host 0.0.0.0, /api proxy → :4000, allowedHosts for preview
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx                     # router + providers
    ├── api/
    │   ├── client.js               # axios instance + interceptors
    │   ├── auth.api.js  admin.api.js  stores.api.js  owner.api.js
    ├── context/AuthContext.jsx
    ├── hooks/
    │   ├── useAuth.js  useListQuery.js  useDebounce.js  useToast.js
    ├── components/
    │   ├── layout/   AppLayout.jsx  Navbar.jsx  PageHeader.jsx
    │   ├── routing/  ProtectedRoute.jsx  RoleRoute.jsx  PublicOnlyRoute.jsx  RoleRedirect.jsx
    │   ├── table/    DataTable.jsx  SortableHeader.jsx  Pagination.jsx  FilterBar.jsx  EmptyState.jsx
    │   ├── forms/    FormField.jsx  PasswordField.jsx  PasswordRules.jsx  SelectField.jsx
    │   ├── ui/       Button.jsx  Card.jsx  StatCard.jsx  Badge.jsx  Modal.jsx  Spinner.jsx  Toast.jsx  Alert.jsx
    │   └── rating/   StarRating.jsx (interactive, keyboard-accessible)  RatingDisplay.jsx ("4.3 ★ · 12 ratings")
    ├── pages/
    │   ├── auth/     LoginPage.jsx  SignupPage.jsx
    │   ├── account/  ChangePasswordPage.jsx
    │   ├── admin/    AdminDashboardPage.jsx  UsersPage.jsx  AddUserPage.jsx  UserDetailPage.jsx
    │   │             StoresPage.jsx  AddStorePage.jsx
    │   ├── user/     BrowseStoresPage.jsx  RateStoreModal.jsx
    │   ├── owner/    OwnerDashboardPage.jsx
    │   └── NotFoundPage.jsx
    ├── utils/   validators.js  roles.js (labels/colours)  format.js (dates, ratings)
    └── styles/  variables.css  global.css  components.css
```

### Visual language
- Palette: indigo primary `#4f46e5`, slate neutrals, amber stars `#f59e0b`, green/red for status. System font stack.
- Layout: fixed top navbar (brand + role-specific links + user chip with role badge + Change password + Logout), max-width content container, cards and tables with generous whitespace.
- Responsive: tables scroll horizontally on small screens; forms are single-column.
- Accessibility: labelled inputs, error text linked with `aria-describedby`, star rating as a radio group with arrow-key support, focus-visible styles.

---

## 10. UI screen designs (wireframes)

### 10.1 Login (`/login`) and Signup (`/signup`)
```
┌───────────────────────────────────────────────┐   ┌───────────────────────────────────────────────┐
│                 ★ StoreRate                   │   │                 ★ StoreRate                   │
│           Sign in to your account             │   │              Create your account              │
│ ┌───────────────────────────────────────────┐ │   │ ┌───────────────────────────────────────────┐ │
│ │ Email     [ you@example.com             ] │ │   │ │ Full name [                             ] │ │
│ │ Password  [ ••••••••••            (👁)  ] │ │   │ │           20–60 characters                │ │
│ │                                           │ │   │ │ Email     [                             ] │ │
│ │ [            Sign in                    ] │ │   │ │ Address   [                             ] │ │
│ │                                           │ │   │ │           [                             ] │ │
│ │ New here?  Create an account →            │ │   │ │ Password  [                       (👁)  ] │ │
│ └───────────────────────────────────────────┘ │   │ │   ✔ 8–16 chars  ✘ uppercase  ✘ special    │ │
│  Demo accounts (dev only): admin · user ·     │   │ │ [           Create account              ] │ │
│  owner — click to fill                        │   │ │ Already registered? Sign in →             │ │
└───────────────────────────────────────────────┘   │ └───────────────────────────────────────────┘ │
                                                    └───────────────────────────────────────────────┘
```
- Inline validation on blur; server errors (e.g. "Email already registered") shown on the field.
- Successful login redirects by role.

### 10.2 App shell (all logged-in pages)
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ★ StoreRate   Dashboard  Users  Stores            [Priya L… ▾ ADMIN]  Change password  Logout │
└──────────────────────────────────────────────────────────────────────────────────────┘
  admin links:  Dashboard · Users · Stores        user links: Stores        owner links: My store
```

### 10.3 Admin dashboard (`/admin`)
```
┌─ Dashboard ───────────────────────────────────────────────────────────────┐
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│ │ 👥 USERS      │  │ 🏬 STORES    │  │ ★ RATINGS    │                       │
│ │    12         │  │    4         │  │    38        │                       │
│ └──────────────┘  └──────────────┘  └──────────────┘                       │
│ Quick actions:  [+ Add user]  [+ Add store]  [View users]  [View stores]   │
└───────────────────────────────────────────────────────────────────────────┘
```

### 10.4 Admin → Users list (`/admin/users`)
```
┌─ Users ──────────────────────────────────────────────────────── [+ Add user] ┐
│ Filters: Name [________]  Email [________]  Address [________]  Role [All ▾] [Clear] │
│ ┌──────────────────────────┬──────────────────────┬──────────────────┬────────────┬───────┐ │
│ │ Name ▲                   │ Email                │ Address          │ Role       │       │ │
│ ├──────────────────────────┼──────────────────────┼──────────────────┼────────────┼───────┤ │
│ │ Priya Lakshmi Narasimhan │ user1@storerate.com  │ Kukatpally, Hyd… │ ● User     │ View  │ │
│ │ Rajesh Kumar Venkatesh…  │ owner1@storerate.com │ Madhapur, Hyd…   │ ● Owner    │ View  │ │
│ │ System Administrator Ac… │ admin@storerate.com  │ Gachibowli, Hyd… │ ● Admin    │ View  │ │
│ └──────────────────────────┴──────────────────────┴──────────────────┴────────────┴───────┘ │
│ Showing 1–10 of 12                                   [‹ Prev]  Page 1 / 2  [Next ›]  10 ▾  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```
- Click any header to sort asc → desc (▲/▼ indicator). Filters debounce and reset to page 1. All state lives in the URL.

### 10.5 Admin → Add user (`/admin/users/new`)
```
┌─ Add user ────────────────────────────────────────────┐
│ Full name  [                                        ] │
│ Email      [                                        ] │
│ Password   [                                 (👁)   ] │  ✔/✘ rule checklist
│ Address    [                                        ] │
│            [                                        ] │
│ Role       [ Normal User ▾ ]  (Normal User / System Administrator / Store Owner) │
│                               [Cancel]  [Create user] │
└───────────────────────────────────────────────────────┘
```

### 10.6 Admin → User detail (`/admin/users/:id`)
```
┌─ ← Back to users ─────────────────────────────────────┐
│ Rajesh Kumar Venkateshwarlu            ● Store Owner  │
│ Email    owner1@storerate.com                         │
│ Address  12-3-45 Madhapur, Hyderabad 500081           │
│ Joined   03 Oct 2026                                  │
│ ┌─ Store ─────────────────────────────────────────┐   │   ← only when role = store_owner
│ │ Madhapur Organic Grocery Corner                  │   │
│ │ Rating  ★ 4.3  (12 ratings)                      │   │
│ └──────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

### 10.7 Admin → Stores list (`/admin/stores`)
```
┌─ Stores ────────────────────────────────────────────────────── [+ Add store] ┐
│ Filters: Name [________]  Email [________]  Address [________]  [Clear]       │
│ ┌────────────────────────────┬───────────────────────┬──────────────┬──────────────────┬───────────────┐ │
│ │ Name ▲                     │ Email                 │ Address      │ Owner            │ Rating ▼      │ │
│ ├────────────────────────────┼───────────────────────┼──────────────┼──────────────────┼───────────────┤ │
│ │ Kukatpally Fresh Mart Su…  │ fresh@kphb.com        │ KPHB Phase 1…│ Rajesh Kumar V…  │ ★ 4.3 (12)    │ │
│ │ Hitech City Electronics H… │ hello@hitechhub.com   │ Hitech City… │ Anita Sharma R…  │ ★ 3.8 (9)     │ │
│ │ Jubilee Hills Bookstore a… │ books@jubilee.com     │ Road No 36…  │ Mohammed Imran…  │ No ratings    │ │
│ └────────────────────────────┴───────────────────────┴──────────────┴──────────────────┴───────────────┘ │
│ Showing 1–4 of 4                                                                                          │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.8 Admin → Add store (`/admin/stores/new`)
```
┌─ Add store ────────────────────────────────────────────────┐
│ Store name  [                                            ] │
│ Store email [                                            ] │
│ Address     [                                            ] │
│                                                            │
│ Owner       (•) Assign existing store owner                │
│                 [ Select an owner without a store ▾ ]      │
│             ( ) Create a new store-owner account           │
│                 Name [            ] Email [            ]   │
│                 Password [        ] Address [          ]   │
│                                   [Cancel]  [Create store] │
└────────────────────────────────────────────────────────────┘
```

### 10.9 Normal user → Browse stores (`/stores`)
```
┌─ Stores ─────────────────────────────────────────────────────────────────────┐
│ 🔍 Search by name or address [________________________]                       │
│ ┌────────────────────────────────┬───────────────────┬──────────────┬────────────────┬──────────────┐ │
│ │ Store ▲                        │ Address           │ Overall ▼    │ Your rating    │              │ │
│ ├────────────────────────────────┼───────────────────┼──────────────┼────────────────┼──────────────┤ │
│ │ Kukatpally Fresh Mart Superm…  │ KPHB Phase 1, Hyd │ ★ 4.3 (12)   │ ★★★★☆ 4        │ [Edit rating]│ │
│ │ Hitech City Electronics Hub…   │ Hitech City, Hyd  │ ★ 3.8 (9)    │ Not rated      │ [Rate]       │ │
│ │ Jubilee Hills Bookstore and…   │ Road No 36, Hyd   │ No ratings   │ Not rated      │ [Rate]       │ │
│ └────────────────────────────────┴───────────────────┴──────────────┴────────────────┴──────────────┘ │
│ Showing 1–4 of 4                                                                                      │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘

   Rate modal (opened by [Rate] / [Edit rating]):
   ┌─ Rate "Hitech City Electronics Hub Store" ─────┐
   │  How was your experience?                       │
   │        ☆  ☆  ☆  ☆  ☆    (hover/keyboard)        │
   │        1  2  3  4  5                            │
   │                     [Cancel]  [Submit rating]   │   ← "Update rating" when editing
   └─────────────────────────────────────────────────┘
   After save: row updates in place (your rating + overall), toast "Rating saved".
```

### 10.10 Store owner → Dashboard (`/owner`)
```
┌─ My store ───────────────────────────────────────────────────────────────┐
│ Madhapur Organic Grocery Corner                                          │
│ grocery@madhapur.com · 12-3-45 Madhapur, Hyderabad                       │
│ ┌──────────────────────┐  ┌──────────────────────┐                        │
│ │ AVERAGE RATING       │  │ TOTAL RATINGS        │                        │
│ │   ★ 4.3 / 5          │  │   12                 │                        │
│ └──────────────────────┘  └──────────────────────┘                        │
│ Users who rated your store                                                │
│ ┌──────────────────────────┬──────────────────────┬──────────┬──────────────┐ │
│ │ Name ▲                   │ Email                │ Rating ▼ │ Submitted    │ │
│ ├──────────────────────────┼──────────────────────┼──────────┼──────────────┤ │
│ │ Priya Lakshmi Narasimhan │ user1@storerate.com  │ ★★★★★ 5  │ 02 Oct 2026  │ │
│ │ Karthik Reddy Annapureddy│ user2@storerate.com  │ ★★★★☆ 4  │ 01 Oct 2026  │ │
│ └──────────────────────────┴──────────────────────┴──────────┴──────────────┘ │
│ Empty state: "No ratings yet — share your store with customers!"            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 10.11 Change password (`/change-password`, all roles)
```
┌─ Change password ─────────────────────────────┐
│ Current password  [                    (👁)  ] │
│ New password      [                    (👁)  ] │
│   ✔ 8–16 characters ✘ one uppercase ✘ one special │
│ Confirm password  [                    (👁)  ] │
│                        [Cancel] [Update password] │
└───────────────────────────────────────────────┘
```
Global touches: loading skeleton/spinner per table, friendly empty states, toast notifications, 404 page, confirm-free logout (instant, redirects to `/login`).

---

## 11. Security & best-practice checklist

- [x] Passwords hashed with bcrypt (cost 10); hashes never selected into API responses.
- [x] JWT signed with a strong secret from env; 24h expiry; verified on every protected request.
- [x] Role checks on the **server** for every route (client guards are UX only).
- [x] All input validated with zod *before* touching the DB; DB constraints as a second layer.
- [x] Parameterised queries only; `sortBy` whitelisted; `ILIKE` wildcards escaped.
- [x] helmet headers, CORS restricted to `CLIENT_ORIGIN`, JSON body limit, rate-limit on login/register.
- [x] Consistent error envelope; no stack traces in production responses; unexpected errors logged server-side.
- [x] Transactions for multi-step writes (create owner + store).
- [x] Config via env with fail-fast validation; `.env` git-ignored; `.env.example` provided.
- [x] Frontend: no secrets, token only in `localStorage` (documented trade-off vs httpOnly cookies), auto-logout on 401, forms disabled while submitting, server field errors surfaced inline.
- [x] Code quality: feature-module structure, thin controllers / fat services, ESLint + Prettier, meaningful naming, README.

---

## 12. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Backend unit | `node:test` | Every validation rule at its boundaries (19/20/60/61 chars; password combos; email cases; rating 0/1/5/6); `listQuery` sort whitelist & escaping |
| Backend integration | `node:test` + `supertest` + test DB (`storerate_test`) | Register → login → me; wrong password 401; user hits `/admin/*` → 403; admin creates user/store (incl. duplicate email → 409, owner already has store → 409); filters & sorting on `/admin/users`; rating upsert 201→200 and average recalculation; owner dashboard shows rater; change password flow |
| Frontend | Vitest (light) | `validators.js` mirrors backend rules |
| Manual | Live preview | Full walkthrough of all three roles (script in README) |

Commands: `npm test` in `backend/` runs migrations on the test DB, then all tests.

---

## 13. Dev workflow, environment & how to run

### Environment variables (`backend/.env`)
```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgres://storerate:storerate@localhost:5432/storerate
TEST_DATABASE_URL=postgres://storerate:storerate@localhost:5432/storerate_test
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
BCRYPT_ROUNDS=10
```
`frontend/.env` (optional): `VITE_API_BASE_URL=/api`, `VITE_SHOW_DEMO_CREDENTIALS=true`.

### Scripts
```
root:      npm run dev            # backend + frontend concurrently
           npm run setup          # install both, migrate, seed
backend:   npm run dev | start | db:migrate | db:rollback | db:seed | db:reset | test | lint
frontend:  npm run dev | build | preview | test | lint
```

### Running locally (your machine)
1. `docker compose up -d` (Postgres 17) — or point `DATABASE_URL` at an existing Postgres.
2. `cp backend/.env.example backend/.env` and set `JWT_SECRET`.
3. `npm run setup && npm run dev` → open http://localhost:5173, sign in with a demo account.

### Running here (sandbox live preview)
Install PostgreSQL 17 via apt, create the role/databases, run the exact same scripts; backend on `0.0.0.0:4000`, Vite on `0.0.0.0:5173` with the `/api` proxy and `allowedHosts` set so the preview URL works.

---

## 14. Build order / milestones

| # | Milestone | Deliverable |
|---|---|---|
| 1 | Repo scaffold, Postgres, Knex config, **migration + seeds** | `db:reset` produces a seeded DB |
| 2 | App skeleton: env, error handling, `ApiError`, `validate`, `authenticate`/`authorize`, health route | `GET /api/health` |
| 3 | **Auth module** (register, login, me, change password) + rate limit | curl-able auth flow |
| 4 | **Admin module** (dashboard, users CRUD-lite, stores, filters, sorting, pagination) | all admin endpoints |
| 5 | **Stores/ratings module** (list with avg + my rating, upsert) | user endpoints |
| 6 | **Owner module** | owner endpoints |
| 7 | Backend tests green | `npm test` |
| 8 | Frontend scaffold: Vite, router, AuthContext, axios client, layout, design system, DataTable/FilterBar/Pagination | shell renders |
| 9 | Auth pages + change password | login/signup works end-to-end |
| 10 | Admin pages (dashboard, users, add user, user detail, stores, add store) | |
| 11 | User store browsing + rate modal | |
| 12 | Owner dashboard | |
| 13 | Polish: loading/empty/error states, responsiveness, a11y pass, lint clean | |
| 14 | README (setup, API reference, demo creds, screenshots), `.http` request collection, final end-to-end verification in live preview | ✅ hand-off |

---

## 15. Decisions made where the spec is silent — please confirm or veto

| # | Decision | Alternative |
|---|---|---|
| D1 | **Knex + hand-written migration** for DB access | Prisma |
| D2 | **Express 5** (native async error handling) | Express 4 |
| D3 | **Store names follow the same 20–60 rule** as user names (spec lists Name validation globally). Implemented as one constant → trivial to relax for stores. | Separate, looser store-name rule (e.g. 2–60) |
| D4 | **Address is required** in signup / add-user / add-store forms (max 400) | Optional address |
| D5 | **Exactly one store per owner** (`owner_id UNIQUE NOT NULL`). Owners are created either via *Add user → role Store Owner* or inline from *Add store*. | Many stores per owner; store without owner |
| D6 | **Only Normal Users can rate**; one rating per user per store; `PUT …/rating` upserts (201 first time, 200 on modify) | Separate POST/PATCH endpoints |
| D7 | Admin **Users list shows all roles** with a Role filter (covers "normal and admin users" and lets admins open store owners to see their rating) | Hide store owners from the list |
| D8 | **Change password requires the current password**; available to all roles (spec mentions user & owner) | New password only |
| D9 | **JWT (24h) stored in `localStorage`**, Bearer header; logout is client-side | httpOnly cookie session + CSRF token |
| D10 | **Server-side pagination (10/page, max 100)** on all tables, in addition to sort/filter | Return everything, paginate client-side |
| D11 | Overall rating = **average rounded to 1 decimal + count**; "No ratings yet" when none | Integer rounding / no count |
| D12 | **Emails are case-insensitive unique** (lower-cased on save) | Case-sensitive |
| D13 | Demo credentials are shown on the login page **only when `VITE_SHOW_DEMO_CREDENTIALS=true`** | Never show |
| D14 | App name **"StoreRate"** (easy to rename) | Your choice |

---

## 16. Out of scope (not requested; schema/API leave room for them)

Editing/deleting users, stores or ratings · password reset via email · refresh tokens · profile editing · image uploads · admin impersonation · deployment pipeline (a Dockerfile/Compose for the full stack can be added on request).

---

**Next step:** reply with "approved" (optionally with any vetoes/changes to section 15) and I'll start building milestone 1 → 14 end-to-end, finishing with a running live preview.
