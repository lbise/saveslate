"""Goal schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    """Create goal request."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    icon: str = Field(default="Target", max_length=50)
    starting_amount: Decimal = Field(default=Decimal("0"), ge=-999_999_999_999, le=999_999_999_999)
    target_amount: Decimal = Field(default=Decimal("0"), ge=-999_999_999_999, le=999_999_999_999)
    has_target: bool = True
    expected_contribution: dict[str, Any] | None = None
    deadline: date | None = None
    is_archived: bool = False


class GoalUpdate(BaseModel):
    """Update goal request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    icon: str | None = Field(default=None, max_length=50)
    starting_amount: Decimal | None = Field(default=None, ge=-999_999_999_999, le=999_999_999_999)
    target_amount: Decimal | None = Field(default=None, ge=-999_999_999_999, le=999_999_999_999)
    has_target: bool | None = None
    expected_contribution: dict[str, Any] | None = None
    deadline: date | None = None
    is_archived: bool | None = None


class GoalResponse(BaseModel):
    """Goal response."""

    id: uuid.UUID
    name: str
    description: str | None
    icon: str
    starting_amount: Decimal
    target_amount: Decimal
    has_target: bool
    expected_contribution: dict[str, Any] | None
    deadline: date | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
