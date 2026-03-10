"""Auth router: register, login, logout, get/update profile."""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.user import User
from app.schemas.user import UserLogin, UserRegister, UserResponse, UserUpdate
from app.services.auth import create_access_token, hash_password, verify_password
from app.services.category_seed import seed_system_categories

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

_COOKIE_DEFAULTS: dict = {
    "httponly": True,
    "secure": False,  # set True when behind HTTPS in production
    "samesite": "lax",
    "path": "/",
}


def _set_auth_cookies(response: Response, user_id: str) -> None:
    """Set JWT access_token (httpOnly) and csrf_token cookies."""
    token = create_access_token(user_id)
    csrf = secrets.token_urlsafe(32)

    response.set_cookie(key="access_token", value=token, **_COOKIE_DEFAULTS)
    response.set_cookie(
        key="csrf_token",
        value=csrf,
        httponly=False,  # JS must read this
        secure=_COOKIE_DEFAULTS["secure"],
        samesite=_COOKIE_DEFAULTS["samesite"],
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    """Delete auth cookies."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("csrf_token", path="/")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    body: UserRegister,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Create a new user, seed system categories, set auth cookies."""
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        default_currency=body.default_currency,
    )
    db.add(user)
    await db.flush()  # assign UUID

    # Seed system categories (Uncategorized group + category)
    await seed_system_categories(db, user.id)

    await db.commit()
    await db.refresh(user)

    _set_auth_cookies(response, str(user.id))
    return user


@router.post("/login", response_model=UserResponse)
async def login(
    body: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify credentials and set auth cookies."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    _set_auth_cookies(response, str(user.id))
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Clear auth cookies."""
    _clear_auth_cookies(response)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)) -> User:
    """Return the authenticated user's profile."""
    return user


@router.put(
    "/me",
    response_model=UserResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Update the authenticated user's profile fields."""
    update_data = body.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != user.email:
        existing = await db.execute(
            select(User).where(User.email == update_data["email"])
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user
