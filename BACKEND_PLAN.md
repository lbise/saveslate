# SaveSlate Backend Implementation Plan

## Architecture Decisions

| Decision               | Choice                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Backend framework      | FastAPI (Python, async)                                             |
| Database               | PostgreSQL 16                                                       |
| ORM                    | SQLAlchemy (async) + asyncpg                                        |
| Migrations             | Alembic                                                             |
| Auth                   | Email/password + JWT (httpOnly cookie)                              |
| User model             | Multi-user with per-user data isolation (`user_id` FK everywhere)   |
| Data flow              | Server-authoritative (no offline sync)                              |
| Frontend data layer    | React Query (TanStack Query)                                        |
| Entity IDs             | UUIDs (server-generated)                                            |
| Deployment             | Docker Compose (self-hosted): API + PostgreSQL + nginx              |
| Repo layout            | Monorepo (`backend/` directory)                                     |
| Data migration         | Start fresh (no localStorage migration)                             |
| Category seeding       | System-only on registration; user picks preset during onboarding    |
| Backend tests          | pytest + httpx (async test client)                                  |
| Frontend serving       | nginx reverse proxy (static files + `/api` proxy)                   |

---

## Project Structure

```
saveslate/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI app, CORS, router includes
│   │   ├── config.py              # Pydantic BaseSettings (env vars)
│   │   ├── database.py            # Async engine, sessionmaker, Base
│   │   ├── deps.py                # FastAPI dependencies (get_db, get_current_user)
│   │   ├── models/                # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── category.py
│   │   │   ├── category_group.py
│   │   │   ├── goal.py
│   │   │   ├── tag.py
│   │   │   ├── automation_rule.py
│   │   │   ├── csv_parser.py
│   │   │   └── import_batch.py
│   │   ├── schemas/               # Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── category.py
│   │   │   ├── category_group.py
│   │   │   ├── goal.py
│   │   │   ├── tag.py
│   │   │   ├── automation_rule.py
│   │   │   ├── csv_parser.py
│   │   │   └── import_batch.py
│   │   ├── routers/               # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── accounts.py
│   │   │   ├── transactions.py
│   │   │   ├── categories.py
│   │   │   ├── category_groups.py
│   │   │   ├── goals.py
│   │   │   ├── tags.py
│   │   │   ├── automation_rules.py
│   │   │   ├── csv_parsers.py
│   │   │   ├── import_batches.py
│   │   │   ├── analytics.py
│   │   │   └── settings.py
│   │   └── services/              # Business logic
│   │       ├── __init__.py
│   │       ├── auth.py            # Password hashing, JWT creation/validation
│   │       ├── automation.py      # Rule engine (port from TypeScript)
│   │       ├── analytics.py       # Stats computation (SQL aggregations)
│   │       └── category_seed.py   # Category/group preset seeding
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py            # Test DB, async fixtures, test client
│   │   └── ...
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml             # API + PostgreSQL + nginx
├── nginx.conf                     # Reverse proxy config
├── src/                           # Existing frontend (unchanged initially)
└── ...
```

---

## Database Schema

All tables use **UUID** primary keys (`gen_random_uuid()`). All entity tables (except `users`) have a `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE` column for multi-user data isolation.

### `users`

| Column                   | Type                    | Notes                                |
| ------------------------ | ----------------------- | ------------------------------------ |
| id                       | UUID PK                 |                                      |
| email                    | VARCHAR(255) UNIQUE     | NOT NULL                             |
| name                     | VARCHAR(255)            | NOT NULL                             |
| password_hash            | VARCHAR(255)            | NOT NULL (bcrypt)                    |
| avatar_url               | VARCHAR(500)            | Nullable                             |
| default_currency         | VARCHAR(3)              | DEFAULT 'CHF'                        |
| onboarding_completed_at  | TIMESTAMPTZ             | NULL = not completed                 |
| category_preset          | VARCHAR(10)             | 'custom', 'minimal', 'full'         |
| created_at               | TIMESTAMPTZ             | DEFAULT NOW()                        |
| updated_at               | TIMESTAMPTZ             | DEFAULT NOW()                        |

### `accounts`

| Column              | Type           | Notes                                                    |
| ------------------- | -------------- | -------------------------------------------------------- |
| id                  | UUID PK        |                                                          |
| user_id             | UUID FK        | → users(id) ON DELETE CASCADE                            |
| name                | VARCHAR(255)   | NOT NULL                                                 |
| type                | VARCHAR(20)    | CHECK: checking, savings, credit, cash, investment, retirement |
| balance             | DECIMAL(15,2)  | Opening/starting balance. DEFAULT 0                      |
| currency            | VARCHAR(3)     | DEFAULT 'CHF'                                            |
| icon                | VARCHAR(50)    | Lucide icon name. DEFAULT 'Wallet'                       |
| account_identifier  | VARCHAR(255)   | IBAN, account number (nullable)                          |
| created_at          | TIMESTAMPTZ    |                                                          |
| updated_at          | TIMESTAMPTZ    |                                                          |

### `transactions`

| Column              | Type           | Notes                                                    |
| ------------------- | -------------- | -------------------------------------------------------- |
| id                  | UUID PK        |                                                          |
| user_id             | UUID FK        | → users(id) ON DELETE CASCADE                            |
| transaction_id      | VARCHAR(255)   | Bank-provided ID for deduplication (nullable)            |
| amount              | DECIMAL(15,2)  | NOT NULL. Positive = income, negative = expense          |
| currency            | VARCHAR(3)     | NOT NULL                                                 |
| category_id         | UUID FK        | → categories(id) ON DELETE SET NULL                      |
| description         | TEXT           | NOT NULL                                                 |
| date                | DATE           | NOT NULL                                                 |
| time                | TIME           | Nullable                                                 |
| account_id          | UUID FK        | → accounts(id) ON DELETE CASCADE. NOT NULL               |
| transfer_pair_id    | VARCHAR(255)   | Links two mirrored transfer legs (nullable)              |
| transfer_pair_role  | VARCHAR(20)    | CHECK: 'source', 'destination' (nullable)                |
| goal_id             | UUID FK        | → goals(id) ON DELETE SET NULL (nullable)                |
| import_batch_id     | UUID FK        | → import_batches(id) ON DELETE SET NULL (nullable)       |
| split_info          | JSONB          | `{ withPerson, ratio, status }` (nullable)               |
| metadata            | JSONB          | `[{ key, value, source }]` array (nullable)              |
| raw_data            | JSONB          | Original CSV row data (nullable)                         |
| created_at          | TIMESTAMPTZ    |                                                          |
| updated_at          | TIMESTAMPTZ    |                                                          |

### `transaction_tags` (junction table)

| Column          | Type    | Notes                                    |
| --------------- | ------- | ---------------------------------------- |
| transaction_id  | UUID FK | → transactions(id) ON DELETE CASCADE     |
| tag_id          | UUID FK | → tags(id) ON DELETE CASCADE             |
| PK              |         | (transaction_id, tag_id)                 |

### `categories`

| Column      | Type          | Notes                                          |
| ----------- | ------------- | ---------------------------------------------- |
| id          | UUID PK       |                                                |
| user_id     | UUID FK       | → users(id) ON DELETE CASCADE                  |
| name        | VARCHAR(255)  | NOT NULL                                       |
| icon        | VARCHAR(50)   | Lucide icon name                               |
| group_id    | UUID FK       | → category_groups(id) ON DELETE SET NULL        |
| is_default  | BOOLEAN       | DEFAULT false                                  |
| source      | VARCHAR(10)   | CHECK: 'system', 'preset', 'custom'            |
| is_hidden   | BOOLEAN       | DEFAULT false. System categories are hidden     |
| created_at  | TIMESTAMPTZ   |                                                |
| updated_at  | TIMESTAMPTZ   |                                                |

### `category_groups`

| Column      | Type          | Notes                                          |
| ----------- | ------------- | ---------------------------------------------- |
| id          | UUID PK       |                                                |
| user_id     | UUID FK       | → users(id) ON DELETE CASCADE                  |
| name        | VARCHAR(255)  | NOT NULL                                       |
| icon        | VARCHAR(50)   | Lucide icon name                               |
| order       | INTEGER       | Display sort order                             |
| is_default  | BOOLEAN       | DEFAULT false                                  |
| source      | VARCHAR(10)   | CHECK: 'system', 'preset', 'custom'            |
| is_hidden   | BOOLEAN       | DEFAULT false                                  |
| created_at  | TIMESTAMPTZ   |                                                |
| updated_at  | TIMESTAMPTZ   |                                                |

### `goals`

| Column                 | Type           | Notes                                       |
| ---------------------- | -------------- | ------------------------------------------- |
| id                     | UUID PK        |                                             |
| user_id                | UUID FK        | → users(id) ON DELETE CASCADE               |
| name                   | VARCHAR(255)   | NOT NULL                                    |
| description            | TEXT           | Nullable                                    |
| icon                   | VARCHAR(50)    | Lucide icon name                            |
| starting_amount        | DECIMAL(15,2)  | DEFAULT 0                                   |
| target_amount          | DECIMAL(15,2)  | DEFAULT 0                                   |
| has_target             | BOOLEAN        | DEFAULT true                                |
| expected_contribution  | JSONB          | `{ amount, frequency }` (nullable)          |
| deadline               | DATE           | Nullable                                    |
| is_archived            | BOOLEAN        | DEFAULT false                               |
| created_at             | TIMESTAMPTZ    |                                             |
| updated_at             | TIMESTAMPTZ    |                                             |

### `tags`

| Column      | Type          | Notes                                          |
| ----------- | ------------- | ---------------------------------------------- |
| id          | UUID PK       |                                                |
| user_id     | UUID FK       | → users(id) ON DELETE CASCADE                  |
| name        | VARCHAR(255)  | NOT NULL. Unique per user (case-insensitive)    |
| color       | VARCHAR(7)    | Hex color from preset palette                  |
| created_at  | TIMESTAMPTZ   |                                                |
| updated_at  | TIMESTAMPTZ   |                                                |

### `automation_rules`

| Column      | Type          | Notes                                          |
| ----------- | ------------- | ---------------------------------------------- |
| id          | UUID PK       |                                                |
| user_id     | UUID FK       | → users(id) ON DELETE CASCADE                  |
| name        | VARCHAR(255)  | NOT NULL                                       |
| is_enabled  | BOOLEAN       | DEFAULT true                                   |
| triggers    | JSONB         | `['on-import', 'manual-run', 'on-create']`     |
| match_mode  | VARCHAR(5)    | CHECK: 'all', 'any'                            |
| conditions  | JSONB         | `[{ id, field, operator, value }]`             |
| actions     | JSONB         | `[{ type, categoryId?, goalId?, ... }]`        |
| created_at  | TIMESTAMPTZ   |                                                |
| updated_at  | TIMESTAMPTZ   |                                                |

### `csv_parsers`

| Column      | Type          | Notes                                          |
| ----------- | ------------- | ---------------------------------------------- |
| id          | UUID PK       |                                                |
| user_id     | UUID FK       | → users(id) ON DELETE CASCADE                  |
| name        | VARCHAR(255)  | NOT NULL                                       |
| config      | JSONB         | Full parser config (delimiter, mappings, etc.) |
| created_at  | TIMESTAMPTZ   |                                                |
| updated_at  | TIMESTAMPTZ   |                                                |

### `import_batches`

| Column       | Type          | Notes                                         |
| ------------ | ------------- | --------------------------------------------- |
| id           | UUID PK       |                                               |
| user_id      | UUID FK       | → users(id) ON DELETE CASCADE                 |
| file_name    | VARCHAR(255)  | NOT NULL                                      |
| name         | VARCHAR(255)  | Optional custom name                          |
| imported_at  | TIMESTAMPTZ   | NOT NULL                                      |
| parser_name  | VARCHAR(255)  |                                               |
| parser_id    | UUID          | Reference (not FK — parser may be deleted)    |
| row_count    | INTEGER       |                                               |
| account_id   | UUID FK       | → accounts(id) ON DELETE SET NULL             |
| created_at   | TIMESTAMPTZ   |                                               |

### Indexes

- `transactions(user_id, date)` — Most common query pattern
- `transactions(user_id, account_id)`
- `transactions(user_id, category_id)`
- `transactions(user_id, goal_id)`
- `transactions(user_id, import_batch_id)`
- `transactions(user_id, transfer_pair_id)`
- `categories(user_id, source)`
- `tags(user_id)` + unique on `(user_id, lower(name))`

---

## API Endpoints

All endpoints under `/api` prefix. All entity endpoints require authentication (JWT from httpOnly cookie). All entity queries are scoped to the authenticated user.

### Auth

| Method | Path                  | Description                              |
| ------ | --------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`  | Create user, seed system categories, set cookie |
| POST   | `/api/auth/login`     | Verify credentials, set JWT cookie       |
| POST   | `/api/auth/logout`    | Clear JWT cookie                         |
| GET    | `/api/auth/me`        | Return current user profile              |
| PUT    | `/api/auth/me`        | Update name, email, avatar               |

CSRF protection via double-submit cookie pattern (since JWT is in httpOnly cookie).

### Accounts

| Method | Path                | Description                                        |
| ------ | ------------------- | -------------------------------------------------- |
| GET    | `/api/accounts`     | List all accounts (includes computed balances)      |
| POST   | `/api/accounts`     | Create account                                     |
| GET    | `/api/accounts/:id` | Get single account with computed balance            |
| PUT    | `/api/accounts/:id` | Update account                                     |
| DELETE | `/api/accounts/:id` | Delete account (cascades to transactions)           |

### Transactions

| Method | Path                       | Description                                     |
| ------ | -------------------------- | ----------------------------------------------- |
| GET    | `/api/transactions`        | List with filtering, sorting, pagination        |
| POST   | `/api/transactions`        | Create single transaction                       |
| GET    | `/api/transactions/:id`    | Get single (with details: category, account, goal) |
| PUT    | `/api/transactions/:id`    | Update transaction                              |
| DELETE | `/api/transactions/:id`    | Delete transaction                              |
| POST   | `/api/transactions/bulk`   | Bulk create (for CSV import)                    |
| DELETE | `/api/transactions/bulk`   | Bulk delete (by ID list)                        |

**Query params for GET `/api/transactions`**:
- `search` — description substring
- `type` — income, expense, transfer
- `accountId` — filter by account
- `categoryId` — filter by category
- `goalId` — filter by goal
- `tagIds` — filter by tags (comma-separated)
- `importBatchId` — filter by import batch
- `startDate`, `endDate` — date range
- `sortBy` — date, amount, description (default: date)
- `sortOrder` — asc, desc (default: desc)
- `page`, `pageSize` — pagination (default: page=1, pageSize=50)

### Categories

| Method | Path                       | Description                                      |
| ------ | -------------------------- | ------------------------------------------------ |
| GET    | `/api/categories`          | List all (filter: `visible=true` to exclude hidden) |
| POST   | `/api/categories`          | Create custom category                           |
| PUT    | `/api/categories/:id`      | Update category (blocked for system source)      |
| DELETE | `/api/categories/:id`      | Delete category (blocked for system source)      |
| POST   | `/api/categories/seed`     | Seed from preset: `{ preset: 'minimal' | 'full' }` |

### Category Groups

| Method | Path                          | Description                                   |
| ------ | ----------------------------- | --------------------------------------------- |
| GET    | `/api/category-groups`        | List all                                      |
| POST   | `/api/category-groups`        | Create custom group                           |
| PUT    | `/api/category-groups/:id`    | Update group (blocked for system source)      |
| DELETE | `/api/category-groups/:id`    | Delete group (blocked for system source)      |

### Goals

| Method | Path              | Description                                       |
| ------ | ----------------- | ------------------------------------------------- |
| GET    | `/api/goals`      | List all (filter: `archived=true/false`)          |
| POST   | `/api/goals`      | Create goal                                       |
| GET    | `/api/goals/:id`  | Get single goal                                   |
| PUT    | `/api/goals/:id`  | Update goal (including archive/unarchive)         |
| DELETE | `/api/goals/:id`  | Delete goal (unlinks transactions: goal_id → NULL)|

### Tags

| Method | Path             | Description                                        |
| ------ | ---------------- | -------------------------------------------------- |
| GET    | `/api/tags`      | List all                                           |
| POST   | `/api/tags`      | Create tag                                         |
| PUT    | `/api/tags/:id`  | Update tag                                         |
| DELETE | `/api/tags/:id`  | Delete tag (cascades: removes from transaction_tags)|

### Automation Rules

| Method | Path                          | Description                              |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/api/automation-rules`       | List all rules                           |
| POST   | `/api/automation-rules`       | Create rule                              |
| PUT    | `/api/automation-rules/:id`   | Update rule                              |
| DELETE | `/api/automation-rules/:id`   | Delete rule                              |
| POST   | `/api/automation-rules/run`   | Manual rule execution on existing transactions |

### CSV Parsers

| Method | Path                   | Description                                 |
| ------ | ---------------------- | ------------------------------------------- |
| GET    | `/api/csv-parsers`     | List all parsers                            |
| POST   | `/api/csv-parsers`     | Create parser                               |
| GET    | `/api/csv-parsers/:id` | Get single parser                           |
| PUT    | `/api/csv-parsers/:id` | Update parser                               |
| DELETE | `/api/csv-parsers/:id` | Delete parser                               |

### Import

| Method | Path                        | Description                                    |
| ------ | --------------------------- | ---------------------------------------------- |
| POST   | `/api/import/csv`           | Upload CSV + parser ID + account ID → parse, create transactions, create batch, apply rules |
| GET    | `/api/import-batches`       | List import batches                            |
| PUT    | `/api/import-batches/:id`   | Rename batch                                   |
| DELETE | `/api/import-batches/:id`   | Delete batch + linked transactions             |

### Analytics

| Method | Path                                | Description                               |
| ------ | ----------------------------------- | ----------------------------------------- |
| GET    | `/api/analytics/monthly-stats`      | Income, expenses, transfers, savings rate |
| GET    | `/api/analytics/category-spending`  | Spending by category for date range       |
| GET    | `/api/analytics/goal-progress`      | Progress for each active goal             |

**Query params**: `month` (YYYY-MM), `startDate`, `endDate`

### Settings

| Method | Path              | Description                         |
| ------ | ----------------- | ----------------------------------- |
| GET    | `/api/settings`   | Get user settings (currency, etc.)  |
| PUT    | `/api/settings`   | Update settings                     |

---

## Onboarding Flow (Backend-Adapted)

The existing frontend onboarding gate (`OnboardingGate.tsx`) stays as-is visually. The backend changes:

1. **Registration** (`POST /api/auth/register`):
   - Create user with `onboarding_completed_at = NULL`
   - Seed `'custom'` preset: Uncategorized category + System group

2. **Frontend detects new user**:
   - `GET /api/auth/me` returns `onboarding_completed_at: null`
   - `OnboardingContext` shows the gate overlay

3. **User completes onboarding**:
   - Frontend calls `PUT /api/settings` with `{ defaultCurrency: 'EUR' }`
   - Frontend calls `POST /api/categories/seed` with `{ preset: 'minimal' }` (or `'full'`)
   - Backend seeds categories/groups, sets `onboarding_completed_at = NOW()`

4. **Subsequent logins**:
   - `onboarding_completed_at` is set → gate doesn't render

---

## Frontend Changes Summary

| Area               | Current                                  | After                                          |
| ------------------ | ---------------------------------------- | ---------------------------------------------- |
| Data fetching      | `DataService` singleton (sync)           | React Query hooks (`useQuery`/`useMutation`)   |
| Persistence        | localStorage                             | API calls via `fetch`                          |
| Auth               | Stub (hardcoded user)                    | Real JWT auth (httpOnly cookie)                |
| Onboarding state   | `OnboardingContext` → localStorage       | `OnboardingContext` → API                      |
| Settings state     | `SettingsContext` → localStorage         | `SettingsContext` → API                        |
| Loading UX         | None (sync data)                         | Skeleton loaders, error boundaries             |
| ID format          | `{entity}-{timestamp}-{random6}`         | UUIDs (server-generated)                       |
| Analytics          | Client-side computation                  | Server-side SQL aggregation                    |
| CSV parsing        | Client-side                              | Server-side (upload file to API)               |
| Automation engine  | Client-side (TypeScript)                 | Server-side (Python port)                      |

---

## Implementation Phases

### Phase 1: Backend Foundation ✅

- [x] Initialize Python project (`backend/pyproject.toml` with dependencies)
- [x] Create FastAPI app entry point (`app/main.py`)
- [x] Set up config with Pydantic BaseSettings (`app/config.py`)
- [x] Set up async SQLAlchemy engine and session (`app/database.py`)
- [x] Create all SQLAlchemy models (11 tables)
- [x] Set up Alembic and generate initial migration
- [x] Create Dockerfile for the API
- [x] Create `docker-compose.yml` (API + PostgreSQL)
- [x] Create `.env.example` with all config vars
- [x] Verify: containers start, migration runs, DB schema is correct

### Phase 2: Auth

- [x] Create user Pydantic schemas (register, login, response)
- [x] Implement password hashing service (bcrypt)
- [x] Implement JWT creation and validation service
- [x] Create auth router (`POST /register`, `POST /login`, `POST /logout`, `GET /me`, `PUT /me`)
- [x] Implement `get_current_user` dependency (extract JWT from httpOnly cookie)
- [x] Add CSRF protection (double-submit cookie)
- [x] Seed system categories on registration
- [x] Write auth tests (register, login, protected endpoints, invalid tokens)

### Phase 3: Core CRUD APIs

- [x] Accounts: schemas + router + tests
- [x] Categories: schemas + router + seed endpoint + tests
- [x] Category Groups: schemas + router + tests
- [x] Goals: schemas + router + tests
- [x] Tags: schemas + router + delete cascade + tests
- [x] Transactions: schemas + router + filtering/sorting/pagination + tests
- [x] Transaction tags: junction table handling in transaction CRUD
- [x] Import Batches: schemas + router + delete cascade + tests
- [x] CSV Parsers: schemas + router + tests

### Phase 4: Business Logic APIs

- [x] Computed account balances (SQL subquery in accounts endpoint)
- [x] Analytics: monthly stats endpoint (SQL aggregation)
- [x] Analytics: category spending endpoint
- [x] Analytics: goal progress endpoint
- [x] Port automation rule engine from TypeScript to Python
- [x] Automation rules: manual run endpoint
- [x] CSV import endpoint (upload, parse, create transactions, apply rules)
- [x] Transfer pair validation logic
- [x] Write integration tests for business logic

### Phase 5: Frontend Integration ✅

- [x] Install `@tanstack/react-query`
- [x] Create API client (`src/lib/api-client.ts`) with fetch, cookie auth, error handling
- [x] Create React Query provider setup
- [x] Create query/mutation hooks for all entities
- [x] Update `UserContext` → real auth (login, register, logout, session check)
- [x] Update `OnboardingContext` → API-backed state
- [x] Update `SettingsContext` → API-backed state (removed — settings derived from user context)
- [x] Update Dashboard page to use React Query hooks
- [x] Update Transactions page to use React Query hooks
- [x] Update Accounts page to use React Query hooks
- [x] Update Categories page to use React Query hooks
- [x] Update Goals page to use React Query hooks
- [x] Update Tags (in Transactions page) to use React Query hooks
- [x] Update Rules page to use React Query hooks
- [x] Update Import page to use React Query hooks (server-side CSV parsing)
- [x] Update Analytics page to use React Query hooks
- [x] Update Settings page to use React Query hooks
- [x] Update Login/Register pages with real auth
- [x] Add loading skeletons / error boundaries to all pages
- [x] Remove or guard localStorage usage (design prototype pages only — production pages fully migrated)

### Phase 6: Deploy & Polish ✅

- [x] Create nginx config (serve frontend static + proxy `/api`)
- [x] Add frontend build step to Docker setup
- [x] Finalize `docker-compose.yml` (API + DB + nginx)
- [x] Add rate limiting on auth endpoints
- [x] Add request validation / error response standardization
- [x] Environment variable documentation
- [x] End-to-end smoke test with Docker Compose
- [x] Update README with backend setup instructions

---

## Key Dependencies (Python)

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pyjwt
bcrypt
pydantic[email]
pydantic-settings
python-multipart        # For file uploads (CSV import)

# Dev / Test
pytest
pytest-asyncio
httpx                   # Async test client for FastAPI
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://saveslate:password@db:5432/saveslate

# Auth
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440       # 24 hours
CSRF_SECRET_KEY=your-csrf-secret

# App
CORS_ORIGINS=http://localhost:5173  # Vite dev server
API_PREFIX=/api
```

---

## Docker Compose Overview

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: saveslate
      POSTGRES_USER: saveslate
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  api:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://saveslate:${DB_PASSWORD}@db:5432/saveslate
      SECRET_KEY: ${SECRET_KEY}
    ports:
      - "8000:8000"     # Direct access during development

  nginx:
    image: nginx:alpine
    depends_on:
      - api
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html          # Built frontend
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  pgdata:
```

### nginx routing

| Path        | Target                          |
| ----------- | ------------------------------- |
| `/api/*`    | Proxy to `http://api:8000/api`  |
| `/*`        | Serve static files from `/dist` |
| Fallback    | `index.html` (SPA routing)     |
