"""Transactions router: CRUD with filtering, sorting, pagination + tag junction."""

import math
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.tag import Tag
from app.models.transaction import Transaction, TransactionTag
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    TransactionBulkCreate,
    TransactionBulkDelete,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

MAX_TRANSACTION_PAGE_SIZE = 10_000


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _transaction_to_response(txn: Transaction) -> TransactionResponse:
    """Convert a Transaction ORM model to response, including tag_ids."""
    tag_ids = [tag.id for tag in txn.tags] if txn.tags else []
    return TransactionResponse(
        id=txn.id,
        transaction_id=txn.transaction_id,
        amount=txn.amount,
        currency=txn.currency,
        category_id=txn.category_id,
        description=txn.description,
        date=txn.date,
        time=txn.time,
        account_id=txn.account_id,
        transfer_pair_id=txn.transfer_pair_id,
        transfer_pair_role=txn.transfer_pair_role,
        goal_id=txn.goal_id,
        import_batch_id=txn.import_batch_id,
        split_info=txn.split_info,
        metadata=txn.metadata_,
        raw_data=txn.raw_data,
        tag_ids=tag_ids,
        created_at=txn.created_at,
        updated_at=txn.updated_at,
    )


async def _set_transaction_tags(
    db: AsyncSession, txn_id: uuid.UUID, tag_ids: list[uuid.UUID], user_id: uuid.UUID
) -> None:
    """Set tags for a transaction by replacing existing associations via junction table."""
    from sqlalchemy import delete, insert

    # Remove existing tag associations
    await db.execute(
        delete(TransactionTag).where(TransactionTag.c.transaction_id == txn_id)
    )

    # Add new tags (after verifying they belong to the user)
    if tag_ids:
        result = await db.execute(
            select(Tag).where(Tag.id.in_(tag_ids), Tag.user_id == user_id)
        )
        found_tags = list(result.scalars().all())
        if len(found_tags) != len(tag_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more tag IDs are invalid",
            )
        for tag in found_tags:
            await db.execute(
                insert(TransactionTag).values(
                    transaction_id=txn_id, tag_id=tag.id
                )
            )


async def _load_transaction_with_tags(
    db: AsyncSession, txn_id: uuid.UUID, user_id: uuid.UUID
) -> Transaction | None:
    """Load a transaction with its tags eagerly."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.tags))
        .where(Transaction.id == txn_id, Transaction.user_id == user_id)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    search: str | None = Query(default=None, description="Search description"),
    type: str | None = Query(default=None, description="income, expense, transfer"),
    account_id: uuid.UUID | None = Query(default=None, alias="accountId"),
    category_id: uuid.UUID | None = Query(default=None, alias="categoryId"),
    goal_id: uuid.UUID | None = Query(default=None, alias="goalId"),
    tag_ids: str | None = Query(default=None, alias="tagIds", description="Comma-separated tag UUIDs"),
    import_batch_id: uuid.UUID | None = Query(default=None, alias="importBatchId"),
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    sort_by: str = Query(default="date", alias="sortBy"),
    sort_order: str = Query(default="desc", alias="sortOrder"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(
        default=50,
        ge=1,
        le=MAX_TRANSACTION_PAGE_SIZE,
        alias="pageSize",
    ),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedTransactions:
    """List transactions with filtering, sorting, and pagination."""
    from sqlalchemy.orm import selectinload

    stmt = select(Transaction).where(Transaction.user_id == user.id)

    # Filters
    if search:
        stmt = stmt.where(Transaction.description.ilike(f"%{search}%"))
    if account_id:
        stmt = stmt.where(Transaction.account_id == account_id)
    if category_id:
        stmt = stmt.where(Transaction.category_id == category_id)
    if goal_id:
        stmt = stmt.where(Transaction.goal_id == goal_id)
    if import_batch_id:
        stmt = stmt.where(Transaction.import_batch_id == import_batch_id)
    if start_date:
        stmt = stmt.where(Transaction.date >= start_date)
    if end_date:
        stmt = stmt.where(Transaction.date <= end_date)

    # Type filter: income (amount > 0, no transfer), expense (amount < 0, no transfer), transfer
    if type == "income":
        stmt = stmt.where(Transaction.amount > 0, Transaction.transfer_pair_id.is_(None))
    elif type == "expense":
        stmt = stmt.where(Transaction.amount < 0, Transaction.transfer_pair_id.is_(None))
    elif type == "transfer":
        stmt = stmt.where(Transaction.transfer_pair_id.isnot(None))

    # Tag filter
    if tag_ids:
        parsed_tag_ids = [uuid.UUID(t.strip()) for t in tag_ids.split(",") if t.strip()]
        if parsed_tag_ids:
            stmt = stmt.where(
                Transaction.id.in_(
                    select(TransactionTag.c.transaction_id).where(
                        TransactionTag.c.tag_id.in_(parsed_tag_ids)
                    )
                )
            )

    # Count total before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    sort_column_map = {
        "date": Transaction.date,
        "amount": Transaction.amount,
        "description": Transaction.description,
    }
    sort_col = sort_column_map.get(sort_by, Transaction.date)
    if sort_order == "asc":
        stmt = stmt.order_by(sort_col.asc())
    else:
        stmt = stmt.order_by(sort_col.desc())

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    # Eager load tags
    stmt = stmt.options(selectinload(Transaction.tags))

    result = await db.execute(stmt)
    transactions = list(result.scalars().all())

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedTransactions(
        items=[_transaction_to_response(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_transaction(
    body: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TransactionResponse:
    """Create a single transaction."""
    data = body.model_dump(exclude={"tag_ids", "metadata"})
    data["metadata_"] = body.metadata
    txn = Transaction(user_id=user.id, **data)
    db.add(txn)
    await db.flush()

    if body.tag_ids:
        await _set_transaction_tags(db, txn.id, body.tag_ids, user.id)

    await db.commit()

    loaded = await _load_transaction_with_tags(db, txn.id, user.id)
    return _transaction_to_response(loaded)  # type: ignore[arg-type]


@router.post(
    "/bulk",
    response_model=list[TransactionResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def bulk_create_transactions(
    body: TransactionBulkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TransactionResponse]:
    """Bulk create transactions (for CSV import)."""
    created: list[Transaction] = []

    for txn_data in body.transactions:
        data = txn_data.model_dump(exclude={"tag_ids", "metadata"})
        data["metadata_"] = txn_data.metadata
        txn = Transaction(user_id=user.id, **data)
        db.add(txn)
        await db.flush()

        if txn_data.tag_ids:
            await _set_transaction_tags(db, txn.id, txn_data.tag_ids, user.id)

        created.append(txn)

    await db.commit()

    # Reload all with tags
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.tags))
        .where(Transaction.id.in_([t.id for t in created]))
    )
    loaded = list(result.scalars().all())
    return [_transaction_to_response(t) for t in loaded]


@router.delete(
    "/bulk",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def bulk_delete_transactions(
    body: TransactionBulkDelete,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Bulk delete transactions by ID list."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id.in_(body.ids), Transaction.user_id == user.id
        )
    )
    transactions = list(result.scalars().all())

    if len(transactions) != len(body.ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more transaction IDs not found",
        )

    for txn in transactions:
        await db.delete(txn)

    await db.commit()


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TransactionResponse:
    """Get a single transaction by ID."""
    txn = await _load_transaction_with_tags(db, transaction_id, user.id)
    if txn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return _transaction_to_response(txn)


@router.put(
    "/{transaction_id}",
    response_model=TransactionResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_transaction(
    transaction_id: uuid.UUID,
    body: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TransactionResponse:
    """Update a transaction."""
    txn = await _load_transaction_with_tags(db, transaction_id, user.id)
    if txn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    update_data = body.model_dump(exclude_unset=True, exclude={"tag_ids", "metadata"})
    if body.metadata is not None:
        update_data["metadata_"] = body.metadata

    for field, value in update_data.items():
        setattr(txn, field, value)

    if body.tag_ids is not None:
        await _set_transaction_tags(db, txn.id, body.tag_ids, user.id)

    txn_id = txn.id
    user_id = user.id
    await db.commit()
    await db.refresh(txn)
    db.expunge(txn)

    loaded = await _load_transaction_with_tags(db, txn_id, user_id)
    return _transaction_to_response(loaded)  # type: ignore[arg-type]


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_transaction(
    transaction_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a transaction."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.tags))
        .where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    await db.delete(txn)
    await db.commit()
