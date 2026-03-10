"""SaveSlate API – FastAPI application entry point."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    accounts,
    auth,
    automation_rules,
    categories,
    category_groups,
    csv_parsers,
    goals,
    import_batches,
    tags,
    transactions,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: startup / shutdown hooks."""
    # Startup – nothing yet (engine created at import time)
    yield
    # Shutdown – dispose engine
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title="SaveSlate API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(category_groups.router)
app.include_router(goals.router)
app.include_router(tags.router)
app.include_router(automation_rules.router)
app.include_router(csv_parsers.router)
app.include_router(import_batches.router)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "ok"}
