"""Category schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


CategorySource = Literal["system", "preset", "custom"]
CategoryPreset = Literal["custom", "minimal", "full"]


class CategoryCreate(BaseModel):
    """Create custom category request."""

    name: str = Field(min_length=1, max_length=255)
    icon: str = Field(default="Tag", max_length=50)
    group_id: uuid.UUID | None = None
    is_default: bool = False


class CategoryUpdate(BaseModel):
    """Update category request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    icon: str | None = Field(default=None, max_length=50)
    group_id: uuid.UUID | None = None
    is_default: bool | None = None
    is_hidden: bool | None = None


class CategoryResponse(BaseModel):
    """Category response."""

    id: uuid.UUID
    name: str
    icon: str
    group_id: uuid.UUID | None
    is_default: bool
    source: str
    is_hidden: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategorySeedRequest(BaseModel):
    """Seed categories from preset."""

    preset: CategoryPreset
