"""Tag schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Create tag request."""

    name: str = Field(min_length=1, max_length=255)
    color: str = Field(default="#55AEC8", min_length=4, max_length=7)


class TagUpdate(BaseModel):
    """Update tag request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    color: str | None = Field(default=None, min_length=4, max_length=7)


class TagResponse(BaseModel):
    """Tag response."""

    id: uuid.UUID
    name: str
    color: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
