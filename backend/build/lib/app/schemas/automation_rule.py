"""Automation rule schemas."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


MatchMode = Literal["all", "any"]


class AutomationRuleCreate(BaseModel):
    """Create automation rule request."""

    name: str = Field(min_length=1, max_length=255)
    is_enabled: bool = True
    triggers: list[str]
    match_mode: MatchMode = "all"
    conditions: list[dict[str, Any]]
    actions: list[dict[str, Any]]


class AutomationRuleUpdate(BaseModel):
    """Update automation rule request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    is_enabled: bool | None = None
    triggers: list[str] | None = None
    match_mode: MatchMode | None = None
    conditions: list[dict[str, Any]] | None = None
    actions: list[dict[str, Any]] | None = None


class AutomationRuleResponse(BaseModel):
    """Automation rule response."""

    id: uuid.UUID
    name: str
    is_enabled: bool
    triggers: list[Any]
    match_mode: str
    conditions: list[Any]
    actions: list[Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
