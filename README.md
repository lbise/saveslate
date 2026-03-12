# SaveSlate

Personal finance tracking app — self-hosted, single-user.

## Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Backend  | FastAPI, SQLAlchemy (async), PostgreSQL |
| Infra    | Docker Compose, nginx               |

## Quick Start (Docker)

```bash
# 1. Copy and fill in secrets
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, SECRET_KEY, CSRF_SECRET_KEY

# 2. Build and start all services
docker compose -f docker-compose.yml up --build -d

# The app is available at http://localhost (or the PORT you set)
```

This starts three containers:

- **db** — PostgreSQL 16
- **api** — FastAPI backend (runs migrations on startup)
- **web** — nginx serving the frontend + proxying `/api` to the backend

## Development Setup

### Prerequisites

- Node.js 22+ and npm
- Python 3.12+
- Docker and Docker Compose (for the database)

### Daily Workflow

```bash
npm install            # first time only
npm run dev:full       # starts DB + API in Docker, then launches Vite
```

This single command:

1. Runs `docker compose up -d` (Postgres + FastAPI with hot-reload)
2. Starts the Vite dev server at http://localhost:5173

Quitting Vite (Ctrl-C) leaves the Docker services running so restarts are instant. When you're done for the day:

```bash
npm run dev:stop       # tears down Postgres + API containers
```

### Individual Commands

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Vite dev server only (frontend)           |
| `npm run dev:backend`| Start DB + API in Docker (background)     |
| `npm run dev:full`   | `dev:backend` then `dev` in one command   |
| `npm run dev:stop`   | Stop and remove Docker dev containers     |

### Manual Backend Setup (without Docker API)

```bash
# Start only the database
docker compose up -d db

# Run the API locally
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # edit as needed
alembic upgrade head
uvicorn app.main:app --reload
```

The dev `docker-compose.override.yml` is auto-loaded by `docker compose up` and:

- Exposes Postgres on port 5432 and the API on port 8000
- Enables uvicorn `--reload` with volume mounts
- Provides dev-only secrets (no `.env` file required)
- Disables the nginx/frontend container (use `npm run dev` instead)

### Running Tests

```bash
# Frontend (Vitest + React Testing Library)
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage

# Backend (pytest + async SQLite)
cd backend && .venv/bin/python -m pytest tests/ -q

# E2E (Playwright)
npm run test:e2e
npm run test:smoke

# Target a Docker Compose deployment instead of the dev server
npm run test:e2e:docker
npm run test:smoke:docker
```

`npm run test:e2e` and `npm run test:smoke` start the Vite dev server automatically.

`npm run test:e2e:docker` and `npm run test:smoke:docker` expect the app to already be running via Docker Compose at `http://localhost`.

### Type Checking & Lint

```bash
npx tsc --noEmit     # TypeScript
npm run lint         # ESLint
npm run build        # Full production build (type check + bundle)
```

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable           | Required | Description                              |
| ------------------ | -------- | ---------------------------------------- |
| `POSTGRES_PASSWORD`| Yes      | Database password                        |
| `SECRET_KEY`       | Yes      | JWT signing secret                       |
| `CSRF_SECRET_KEY`  | Yes      | CSRF double-submit cookie secret         |
| `CORS_ORIGINS`     | No       | Allowed origins (default: `http://localhost`) |
| `PORT`             | No       | Host port for web service (default: `80`)|

## Project Structure

```
src/                    # React frontend
├── components/         #   UI components (shadcn, layout, import)
├── context/            #   React context (User, Theme, Onboarding)
├── hooks/api/          #   React Query hooks for all entities
├── lib/                #   API client, utilities
├── pages/              #   Page components
└── types/              #   TypeScript type definitions

backend/                # FastAPI backend
├── app/
│   ├── routers/        #   API route handlers
│   ├── services/       #   Business logic
│   ├── models/         #   SQLAlchemy models
│   └── schemas/        #   Pydantic request/response schemas
├── alembic/            #   Database migrations
└── tests/              #   Backend tests (pytest)

tests/                  # Frontend tests
├── components/         #   Component unit tests
├── lib/                #   Utility tests
└── e2e/                #   Playwright browser tests
```
