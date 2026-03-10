"""Shared test fixtures: async DB, test client, user helpers."""

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base
from app.deps import get_db
from app.main import app

# ---------------------------------------------------------------------------
# SQLite compatibility: teach SQLite to render PostgreSQL-specific types
# ---------------------------------------------------------------------------

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):  # noqa: ARG001
    return "JSON"

# ---------------------------------------------------------------------------
# In-memory SQLite for fast isolated tests
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
async_session_test = async_sessionmaker(
    engine_test,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Event-loop scope: use a single loop for the whole test session
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for all tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# Database lifecycle
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test and drop them after."""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ---------------------------------------------------------------------------
# DB session override
# ---------------------------------------------------------------------------


async def _override_get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_test() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


# ---------------------------------------------------------------------------
# Async HTTP test client
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient]:
    """Yield an httpx AsyncClient wired to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Helper: register a user and return (client_with_cookies, user_data)
# ---------------------------------------------------------------------------

TEST_USER = {
    "email": "test@example.com",
    "name": "Test User",
    "password": "securepassword123",
    "default_currency": "CHF",
}


@pytest_asyncio.fixture
async def authed_client(client: AsyncClient) -> AsyncClient:
    """Register a test user and return the client with auth cookies set."""
    resp = await client.post("/api/auth/register", json=TEST_USER)
    assert resp.status_code == 201
    return client
