"""FastAPI dependencies (DB session, current user, CSRF)."""

import uuid
from collections.abc import AsyncGenerator

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.user import User
from app.services.auth import decode_access_token


# ---------------------------------------------------------------------------
# Database session
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Yield an async DB session and ensure it is closed after the request."""
    async with async_session() as session:
        yield session


# ---------------------------------------------------------------------------
# Current user (JWT from httpOnly cookie)
# ---------------------------------------------------------------------------


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract JWT from httpOnly cookie, validate, and return the User row.

    Raises 401 if the cookie is missing, the token is invalid/expired, or the
    user no longer exists.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


# ---------------------------------------------------------------------------
# CSRF double-submit cookie validation
# ---------------------------------------------------------------------------


async def verify_csrf(
    request: Request,
    x_csrf_token: str | None = Header(None),
) -> None:
    """Verify CSRF double-submit cookie for state-changing requests.

    The frontend must:
    1. Read the `csrf_token` cookie value (non-httpOnly so JS can read it).
    2. Send that value in the `X-CSRF-Token` request header.

    If both match, the request is legitimate (third-party sites cannot read
    our cookies due to SameSite + CORS).

    Only enforced for methods that mutate state (POST/PUT/PATCH/DELETE).
    GET/HEAD/OPTIONS are safe methods and skip validation.
    """
    safe_methods = {"GET", "HEAD", "OPTIONS"}
    if request.method in safe_methods:
        return

    csrf_cookie = request.cookies.get("csrf_token")
    if not csrf_cookie or not x_csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing",
        )
    if csrf_cookie != x_csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token mismatch",
        )
