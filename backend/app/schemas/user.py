"""User schemas for auth endpoints."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

SupportedLanguage = Literal["en", "de", "fr"]


# --- Requests ---


class UserRegister(BaseModel):
    """Registration request body."""

    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    default_currency: str = Field(default="CHF", min_length=3, max_length=3)
    preferred_language: SupportedLanguage = "en"
    ai_translate_descriptions: bool = False


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
    preferred_language: SupportedLanguage | None = None
    ai_translate_descriptions: bool | None = None


# --- Responses ---


class UserResponse(BaseModel):
    """Public user profile returned by GET /me and after register/login."""

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    default_currency: str
    preferred_language: SupportedLanguage
    ai_translate_descriptions: bool
    onboarding_completed_at: datetime | None
    category_preset: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
