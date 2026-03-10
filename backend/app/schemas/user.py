"""User schemas for auth endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# --- Requests ---


class UserRegister(BaseModel):
    """Registration request body."""

    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    default_currency: str = Field(default="CHF", min_length=3, max_length=3)


class UserLogin(BaseModel):
    """Login request body."""

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Update profile request body (PUT /me)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    default_currency: str | None = Field(default=None, min_length=3, max_length=3)


# --- Responses ---


class UserResponse(BaseModel):
    """Public user profile returned by GET /me and after register/login."""

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    default_currency: str
    onboarding_completed_at: datetime | None
    category_preset: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
