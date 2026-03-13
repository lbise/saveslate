"""Transaction schemas."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    """Create transaction request."""

    transaction_id: str | None = Field(default=None, max_length=255)
    amount: Decimal = Field(ge=-999_999_999_999, le=999_999_999_999)
    currency: str = Field(min_length=3, max_length=3)
    category_id: uuid.UUID | None = None
    description: str = Field(min_length=1)
    date: dt.date
    time: dt.time | None = None
    account_id: uuid.UUID
    transfer_pair_id: str | None = Field(default=None, max_length=255)
    transfer_pair_role: str | None = Field(default=None, pattern=r"^(source|destination)$")
    goal_id: uuid.UUID | None = None
    import_batch_id: uuid.UUID | None = None
    split_info: dict[str, Any] | None = None
    metadata: list[dict[str, Any]] | None = None
    raw_data: dict[str, Any] | None = None
    tag_ids: list[uuid.UUID] | None = None


class TransactionUpdate(BaseModel):
    """Update transaction request (partial)."""

    transaction_id: str | None = Field(default=None, max_length=255)
    amount: Decimal | None = Field(default=None, ge=-999_999_999_999, le=999_999_999_999)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    category_id: uuid.UUID | None = None
    description: str | None = Field(default=None, min_length=1)
    date: dt.date | None = None
    time: dt.time | None = None
    account_id: uuid.UUID | None = None
    transfer_pair_id: str | None = Field(default=None, max_length=255)
    transfer_pair_role: str | None = Field(default=None, pattern=r"^(source|destination)$")
    goal_id: uuid.UUID | None = None
    split_info: dict[str, Any] | None = None
    metadata: list[dict[str, Any]] | None = None
    raw_data: dict[str, Any] | None = None
    tag_ids: list[uuid.UUID] | None = None


class TransactionResponse(BaseModel):
    """Transaction response."""

    id: uuid.UUID
    transaction_id: str | None
    amount: Decimal
    currency: str
    category_id: uuid.UUID | None
    description: str
    date: dt.date
    time: dt.time | None
    account_id: uuid.UUID
    transfer_pair_id: str | None
    transfer_pair_role: str | None
    goal_id: uuid.UUID | None
    import_batch_id: uuid.UUID | None
    split_info: dict[str, Any] | None
    metadata: list[dict[str, Any]] | None = Field(default=None, alias="metadata_")
    raw_data: dict[str, Any] | None
    tag_ids: list[uuid.UUID] = []
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class TransactionBulkCreate(BaseModel):
    """Bulk create transactions request."""

    transactions: list[TransactionCreate]


class TransactionBulkDelete(BaseModel):
    """Bulk delete transactions request."""

    ids: list[uuid.UUID]


class PaginatedTransactions(BaseModel):
    """Paginated transaction list response."""

    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
