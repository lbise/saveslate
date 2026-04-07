# SaveSlate

Personal finance tracking app

## Stack

| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Backend  | FastAPI, SQLAlchemy (async), PostgreSQL                |
| Infra    | Docker Compose, nginx                                  |

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

| Command               | What it does                            |
| --------------------- | --------------------------------------- |
| `npm run dev`         | Vite dev server only (frontend)         |
| `npm run dev:backend` | Start DB + API in Docker (background)   |
| `npm run dev:full`    | `dev:backend` then `dev` in one command |
| `npm run dev:stop`    | Stop and remove Docker dev containers   |

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

## SwiftWave Deployment

Use SwiftWave as the public ingress and keep this repo's local Docker flow unchanged.

### Recommended layout

- **web**: deploy from `Dockerfile.swiftwave`
- **api**: deploy from `backend/Dockerfile`
- **db**: deploy PostgreSQL with persistent storage

SwiftWave should expose the same domain to the web app, and the web app's nginx will forward `/api/*` to the API app over the internal network.

This keeps the frontend's relative `/api/...` requests working without changing application code.

### Why `Dockerfile.swiftwave` exists

Local Docker Compose still uses `Dockerfile` + `nginx.conf`, where nginx proxies `/api` to the Compose service named `api`.

SwiftWave should not rely on the local Compose hostname, so `Dockerfile.swiftwave` uses an environment-templated nginx config instead:

- serves the built frontend
- keeps SPA fallback for React routes
- proxies `/api` to the API app using `API_UPSTREAM_HOST` and `API_UPSTREAM_PORT`

### API environment variables

Set these for the API deployment:

- `DATABASE_URL`
- `SECRET_KEY`
- `CSRF_SECRET_KEY`
- `CORS_ORIGINS=https://your-domain.example`
- `COOKIE_SECURE=true`

### Web environment variables

Set these for the SwiftWave web deployment:

- `API_UPSTREAM_HOST` — internal hostname or service name for the API app on the SwiftWave network
- `API_UPSTREAM_PORT=8000`

Example: if SwiftWave exposes the API app internally as `saveslate-api`, set `API_UPSTREAM_HOST=saveslate-api` on the web app.

Recommended API command override:

```bash
sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
```

### Local development remains the same

These commands are unchanged:

```bash
npm run dev
npm run dev:backend
npm run dev:full
npm run dev:stop
docker compose up --build -d
```

### GitHub Actions deployment via GHCR

This repo includes `.github/workflows/swiftwave-deploy.yml` to automate SwiftWave deployments through GitHub Actions.

Flow:

```text
push to main
  -> GitHub Actions builds container images
  -> pushes to GHCR
  -> calls SwiftWave web/api webhook URLs
  -> SwiftWave redeploys the apps
```

Images pushed by the workflow:

- `ghcr.io/<owner>/saveslate-web:latest`
- `ghcr.io/<owner>/saveslate-api:latest`
- matching `sha-...` tags for traceability

Set up SwiftWave like this:

- deploy the **web** app from image `ghcr.io/<owner>/saveslate-web:latest`
- deploy the **api** app from image `ghcr.io/<owner>/saveslate-api:latest`
- point your public domain ingress at the **web** app
- set the web app's `API_UPSTREAM_HOST` to the API app's internal SwiftWave hostname

If your GHCR packages are private, add an image registry credential in SwiftWave for `ghcr.io`. If you make them public, no SwiftWave registry credential is needed.

Add these GitHub repository secrets before relying on the workflow:

- `SWIFTWAVE_WEBHOOK_WEB` — webhook URL from the web app's **Webhook CI** page
- `SWIFTWAVE_WEBHOOK_API` — webhook URL from the api app's **Webhook CI** page

The workflow uses the built-in `GITHUB_TOKEN` to publish to GHCR, so no extra registry token is required for GitHub Actions itself.

Recommended first-time rollout:

1. Create the web and api apps in SwiftWave from **Docker Image** sources.
2. Point them at the `latest` GHCR tags above.
3. Copy each app's SwiftWave webhook URL into the matching GitHub secret.
4. Push to `main` or run the workflow manually from the GitHub Actions tab.

### Type Checking & Lint

```bash
npx tsc --noEmit     # TypeScript
npm run lint         # ESLint
npm run build        # Full production build (type check + bundle)
```

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable            | Required | Description                                   |
| ------------------- | -------- | --------------------------------------------- |
| `POSTGRES_PASSWORD` | Yes      | Database password                             |
| `SECRET_KEY`        | Yes      | JWT signing secret                            |
| `CSRF_SECRET_KEY`   | Yes      | CSRF double-submit cookie secret              |
| `CORS_ORIGINS`      | No       | Allowed origins (default: `http://localhost`) |
| `PORT`              | No       | Host port for web service (default: `80`)     |

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

## Task list

- [] Run rules preview (See potential changes and validate or not)
- [] Split transactions
- [] Handle savings properly
- [] Mass transaction tool (edit transactions based on some rules)
- [] Improve rules (and and or depending on the condition instead of globally)
- [] Clean-up description and suggest category using AI :robot:
