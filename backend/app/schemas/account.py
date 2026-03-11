"""Account schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


AccountType = Literal["checking", "savings", "credit", "cash", "investment", "retirement"]


class AccountCreate(BaseModel):
    """Create account request."""

    name: str = Field(min_length=1, max_length=255)
    type: AccountType
    balance: Decimal = Field(default=Decimal("0"), ge=-999_999_999_999, le=999_999_999_999)
    currency: str = Field(default="CHF", min_length=3, max_length=3)
    icon: str = Field(default="Wallet", max_length=50)
    account_identifier: str | None = Field(default=None, max_length=255)


class AccountUpdate(BaseModel):
    """Update account request (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: AccountType | None = None
    balance: Decimal | None = Field(default=None, ge=-999_999_999_999, le=999_999_999_999)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    icon: str | None = Field(default=None, max_length=50)
    account_identifier: str | None = Field(default=None, max_length=255)


class AccountResponse(BaseModel):
    """Account response."""

    id: uuid.UUID
    name: str
    type: str
    balance: Decimal
    currency: str
    icon: str
    account_identifier: str | None
    computed_balance: Decimal
    transaction_count: int
    last_transaction_date: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
