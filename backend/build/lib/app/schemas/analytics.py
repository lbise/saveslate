"""Analytics schemas for summary, category, and monthly breakdowns."""

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    """Overall income/expense/net summary for a date range."""

    total_income: Decimal
    total_expenses: Decimal
    net: Decimal
    average_transaction: Decimal
    transaction_count: int
    start_date: date | None
    end_date: date | None


class CategoryBreakdown(BaseModel):
    """Spending/income totals for a single category."""

    category_id: uuid.UUID | None
    category_name: str | None
    category_icon: str | None
    total: Decimal
    count: int
    percentage: Decimal


class MonthlyBreakdown(BaseModel):
    """Income, expenses, and net for a calendar month."""

    month: str  # "YYYY-MM"
    income: Decimal
    expenses: Decimal
    net: Decimal
    transaction_count: int


class GoalProgress(BaseModel):
    """Computed progress for a single goal."""

    goal_id: uuid.UUID
    name: str
    icon: str
    starting_amount: Decimal
    target_amount: Decimal
    current_amount: Decimal
    progress_percentage: Decimal
    remaining_amount: Decimal
    total_contributions: Decimal
    contribution_count: int
    has_target: bool
    deadline: date | None
    is_archived: bool


class AccountBalance(BaseModel):
    """Computed balance for an account based on transactions."""

    account_id: uuid.UUID
    name: str
    computed_balance: Decimal
    manual_balance: Decimal
    currency: str
    transaction_count: int
    last_transaction_date: date | None
