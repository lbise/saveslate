"""Accounts router: CRUD endpoints."""

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

ZERO_AMOUNT = Decimal("0.00")


class AccountMetrics(dict):
    computed_balance: Decimal
    transaction_count: int
    last_transaction_date: date | None


async def _get_account_metrics(
    db: AsyncSession,
    user_id: uuid.UUID,
    account_ids: list[uuid.UUID],
) -> dict[uuid.UUID, AccountMetrics]:
    if not account_ids:
        return {}

    result = await db.execute(
        select(
            Transaction.account_id,
            func.coalesce(func.sum(Transaction.amount), Decimal("0")).label("computed_balance"),
            func.count(Transaction.id).label("transaction_count"),
            func.max(Transaction.date).label("last_transaction_date"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.account_id.in_(account_ids),
        )
        .group_by(Transaction.account_id)
    )

    return {
        row.account_id: {
            "computed_balance": Decimal(str(row.computed_balance)).quantize(ZERO_AMOUNT),
            "transaction_count": row.transaction_count,
            "last_transaction_date": row.last_transaction_date,
        }
        for row in result.all()
    }


def _serialize_account(
    account: Account,
    metrics: AccountMetrics | None = None,
) -> AccountResponse:
    account_metrics = metrics or {
        "computed_balance": ZERO_AMOUNT,
        "transaction_count": 0,
        "last_transaction_date": None,
    }

    return AccountResponse(
        id=account.id,
        name=account.name,
        type=account.type,
        balance=account.balance,
        currency=account.currency,
        icon=account.icon,
        account_identifier=account.account_identifier,
        computed_balance=account_metrics["computed_balance"],
        transaction_count=account_metrics["transaction_count"],
        last_transaction_date=account_metrics["last_transaction_date"],
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AccountResponse]:
    """List all accounts for the authenticated user."""
    result = await db.execute(
        select(Account)
        .where(Account.user_id == user.id)
        .order_by(Account.created_at)
    )
    accounts = list(result.scalars().all())
    metrics_by_account = await _get_account_metrics(db, user.id, [account.id for account in accounts])
    return [_serialize_account(account, metrics_by_account.get(account.id)) for account in accounts]


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_account(
    body: AccountCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    """Create a new account."""
    account = Account(
        user_id=user.id,
        **body.model_dump(),
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return _serialize_account(account)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    """Get a single account by ID."""
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    metrics_by_account = await _get_account_metrics(db, user.id, [account.id])
    return _serialize_account(account, metrics_by_account.get(account.id))


@router.put(
    "/{account_id}",
    response_model=AccountResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_account(
    account_id: uuid.UUID,
    body: AccountUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    """Update an account."""
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(account, field, value)

    await db.commit()
    await db.refresh(account)
    metrics_by_account = await _get_account_metrics(db, user.id, [account.id])
    return _serialize_account(account, metrics_by_account.get(account.id))


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_account(
    account_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an account (cascades to transactions)."""
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    await db.delete(account)
    await db.commit()
