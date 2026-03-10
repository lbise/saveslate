"""Import batches router: CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.import_batch import ImportBatch
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.import_batch import ImportBatchResponse, ImportBatchUpdate

router = APIRouter(prefix="/api/import-batches", tags=["import-batches"])


@router.get("", response_model=list[ImportBatchResponse])
async def list_import_batches(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ImportBatch]:
    """List all import batches for the authenticated user."""
    result = await db.execute(
        select(ImportBatch)
        .where(ImportBatch.user_id == user.id)
        .order_by(ImportBatch.imported_at.desc())
    )
    return list(result.scalars().all())


@router.put(
    "/{batch_id}",
    response_model=ImportBatchResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_import_batch(
    batch_id: uuid.UUID,
    body: ImportBatchUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportBatch:
    """Rename an import batch."""
    result = await db.execute(
        select(ImportBatch).where(
            ImportBatch.id == batch_id, ImportBatch.user_id == user.id
        )
    )
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Import batch not found"
        )

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(batch, field, value)

    await db.commit()
    await db.refresh(batch)
    return batch


@router.delete(
    "/{batch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_import_batch(
    batch_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an import batch and all linked transactions."""
    result = await db.execute(
        select(ImportBatch).where(
            ImportBatch.id == batch_id, ImportBatch.user_id == user.id
        )
    )
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Import batch not found"
        )

    # Delete all transactions linked to this batch
    linked = await db.execute(
        select(Transaction).where(Transaction.import_batch_id == batch_id)
    )
    for txn in linked.scalars().all():
        await db.delete(txn)

    await db.delete(batch)
    await db.commit()
