"""Category group schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CategoryGroupCreate(BaseModel):
    """Create custom category group request."""

    name: str = Field(min_length=1, max_length=255)
    icon: str = Field(default="Folder", max_length=50)
    order: int = Field(default=0, ge=0)
    is_default: bool = False


class CategoryGroupUpdate(BaseModel):
    """Update category group request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    icon: str | None = Field(default=None, max_length=50)
    order: int | None = Field(default=None, ge=0)
    is_default: bool | None = None
    is_hidden: bool | None = None


class CategoryGroupResponse(BaseModel):
    """Category group response."""

    id: uuid.UUID
    name: str
    icon: str
    order: int
    is_default: bool
    source: str
    is_hidden: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
