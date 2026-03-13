"""CSV parser schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CsvParserCreate(BaseModel):
    """Create CSV parser request."""

    name: str = Field(min_length=1, max_length=255)
    config: dict[str, Any]


class CsvParserUpdate(BaseModel):
    """Update CSV parser request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    config: dict[str, Any] | None = None


class CsvParserResponse(BaseModel):
    """CSV parser response."""

    id: uuid.UUID
    name: str
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
