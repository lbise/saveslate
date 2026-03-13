"""Analytics router: summary, monthly, category, and goal progress endpoints."""

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db
from app.models.account import Account
from app.models.category import Category
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.analytics import (
    AccountBalance,
    AnalyticsSummary,
    CategoryBreakdown,
    GoalProgress,
    MonthlyBreakdown,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    account_id: uuid.UUID | None = Query(default=None, alias="accountId"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummary:
    """Compute income, expenses, net, and averages for a date range."""
    # Base filter: user's non-transfer transactions
    filters = [
        Transaction.user_id == user.id,
        Transaction.transfer_pair_id.is_(None),
    ]
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)
    if account_id:
        filters.append(Transaction.account_id == account_id)

    stmt = select(
        func.coalesce(
            func.sum(case((Transaction.amount > 0, Transaction.amount), else_=Decimal("0"))),
            Decimal("0"),
        ).label("income"),
        func.coalesce(
            func.sum(case((Transaction.amount < 0, Transaction.amount), else_=Decimal("0"))),
            Decimal("0"),
        ).label("expenses"),
        func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("net"),
        func.count().label("count"),
    ).where(*filters)

    result = await db.execute(stmt)
    row = result.one()

    total_income = Decimal(str(row.income))
    total_expenses = Decimal(str(row.expenses))
    net = Decimal(str(row.net))
    count = row.count
    avg = net / count if count > 0 else Decimal("0")

    return AnalyticsSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net=net,
        average_transaction=avg,
        transaction_count=count,
        start_date=start_date,
        end_date=end_date,
    )


# ---------------------------------------------------------------------------
# Monthly breakdown
# ---------------------------------------------------------------------------


@router.get("/by-month", response_model=list[MonthlyBreakdown])
async def get_monthly_breakdown(
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    account_id: uuid.UUID | None = Query(default=None, alias="accountId"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MonthlyBreakdown]:
    """Group non-transfer transactions by month."""
    filters = [
        Transaction.user_id == user.id,
        Transaction.transfer_pair_id.is_(None),
    ]
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)
    if account_id:
        filters.append(Transaction.account_id == account_id)

    year_col = extract("year", Transaction.date).label("yr")
    month_col = extract("month", Transaction.date).label("mo")

    stmt = (
        select(
            year_col,
            month_col,
            func.coalesce(
                func.sum(case((Transaction.amount > 0, Transaction.amount), else_=Decimal("0"))),
                Decimal("0"),
            ).label("income"),
            func.coalesce(
                func.sum(case((Transaction.amount < 0, Transaction.amount), else_=Decimal("0"))),
                Decimal("0"),
            ).label("expenses"),
            func.count().label("count"),
        )
        .where(*filters)
        .group_by(year_col, month_col)
        .order_by(year_col, month_col)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        MonthlyBreakdown(
            month=f"{int(r.yr)}-{int(r.mo):02d}",
            income=Decimal(str(r.income)),
            expenses=Decimal(str(r.expenses)),
            net=Decimal(str(r.income)) + Decimal(str(r.expenses)),
            transaction_count=r.count,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Category breakdown
# ---------------------------------------------------------------------------


@router.get("/by-category", response_model=list[CategoryBreakdown])
async def get_category_breakdown(
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    account_id: uuid.UUID | None = Query(default=None, alias="accountId"),
    transaction_type: str | None = Query(default=None, alias="type", description="income or expense"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CategoryBreakdown]:
    """Group non-transfer transactions by category."""
    filters = [
        Transaction.user_id == user.id,
        Transaction.transfer_pair_id.is_(None),
    ]
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)
    if account_id:
        filters.append(Transaction.account_id == account_id)
    if transaction_type == "income":
        filters.append(Transaction.amount > 0)
    elif transaction_type == "expense":
        filters.append(Transaction.amount < 0)

    stmt = (
        select(
            Transaction.category_id,
            Category.name.label("category_name"),
            Category.icon.label("category_icon"),
            func.sum(Transaction.amount).label("total"),
            func.count().label("count"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(*filters)
        .group_by(Transaction.category_id, Category.name, Category.icon)
        .order_by(func.abs(func.sum(Transaction.amount)).desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Compute grand total for percentage
    grand_total = sum(abs(Decimal(str(r.total))) for r in rows) or Decimal("1")

    return [
        CategoryBreakdown(
            category_id=r.category_id,
            category_name=r.category_name,
            category_icon=r.category_icon,
            total=Decimal(str(r.total)),
            count=r.count,
            percentage=round(abs(Decimal(str(r.total))) / grand_total * 100, 2),
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Account balances
# ---------------------------------------------------------------------------


@router.get("/account-balances", response_model=list[AccountBalance])
async def get_account_balances(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AccountBalance]:
    """Compute balance for all accounts from their transactions."""
    # Get all accounts
    acct_result = await db.execute(
        select(Account)
        .where(Account.user_id == user.id)
        .order_by(Account.created_at)
    )
    accounts = list(acct_result.scalars().all())

    if not accounts:
        return []

    account_ids = [a.id for a in accounts]

    # Aggregate transactions per account
    stmt = (
        select(
            Transaction.account_id,
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("total"),
            func.count().label("count"),
            func.max(Transaction.date).label("last_date"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.account_id.in_(account_ids),
        )
        .group_by(Transaction.account_id)
    )
    agg_result = await db.execute(stmt)
    agg_map = {r.account_id: r for r in agg_result.all()}

    balances = []
    for acct in accounts:
        agg = agg_map.get(acct.id)
        computed = Decimal(str(agg.total)) if agg else Decimal("0")
        balances.append(
            AccountBalance(
                account_id=acct.id,
                name=acct.name,
                computed_balance=computed,
                manual_balance=acct.balance,
                currency=acct.currency,
                transaction_count=agg.count if agg else 0,
                last_transaction_date=agg.last_date if agg else None,
            )
        )

    return balances


# ---------------------------------------------------------------------------
# Goal progress
# ---------------------------------------------------------------------------


@router.get("/goal-progress", response_model=list[GoalProgress])
async def get_goal_progress(
    archived: bool | None = Query(default=None, description="Filter by archived"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GoalProgress]:
    """Compute progress for all goals based on linked transactions."""
    goal_stmt = select(Goal).where(Goal.user_id == user.id)
    if archived is not None:
        goal_stmt = goal_stmt.where(Goal.is_archived == archived)
    goal_stmt = goal_stmt.order_by(Goal.created_at)

    goal_result = await db.execute(goal_stmt)
    goals = list(goal_result.scalars().all())

    if not goals:
        return []

    goal_ids = [g.id for g in goals]

    # Aggregate transactions per goal
    stmt = (
        select(
            Transaction.goal_id,
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("contributions"),
            func.count().label("count"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.goal_id.in_(goal_ids),
        )
        .group_by(Transaction.goal_id)
    )
    agg_result = await db.execute(stmt)
    agg_map = {r.goal_id: r for r in agg_result.all()}

    progress_list = []
    for goal in goals:
        agg = agg_map.get(goal.id)
        contributions = Decimal(str(agg.contributions)) if agg else Decimal("0")
        current = goal.starting_amount + contributions
        remaining = goal.target_amount - current if goal.has_target else Decimal("0")
        pct = (
            round(current / goal.target_amount * 100, 2)
            if goal.has_target and goal.target_amount != 0
            else Decimal("0")
        )

        progress_list.append(
            GoalProgress(
                goal_id=goal.id,
                name=goal.name,
                icon=goal.icon,
                starting_amount=goal.starting_amount,
                target_amount=goal.target_amount,
                current_amount=current,
                progress_percentage=pct,
                remaining_amount=remaining,
                total_contributions=contributions,
                contribution_count=agg.count if agg else 0,
                has_target=goal.has_target,
                deadline=goal.deadline,
                is_archived=goal.is_archived,
            )
        )

    return progress_list
