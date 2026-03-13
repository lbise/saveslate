"""Import batch schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ImportBatchCreate(BaseModel):
    """Create import batch request (used internally during CSV import)."""

    file_name: str = Field(min_length=1, max_length=255)
    name: str | None = Field(default=None, max_length=255)
    imported_at: datetime
    parser_name: str | None = Field(default=None, max_length=255)
    parser_id: uuid.UUID | None = None
    row_count: int | None = None
    account_id: uuid.UUID | None = None


class ImportBatchUpdate(BaseModel):
    """Update import batch (rename only)."""

    name: str | None = Field(default=None, max_length=255)


class ImportBatchResponse(BaseModel):
    """Import batch response."""

    id: uuid.UUID
    file_name: str
    name: str | None
    imported_at: datetime
    parser_name: str | None
    parser_id: uuid.UUID | None
    row_count: int | None
    account_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
