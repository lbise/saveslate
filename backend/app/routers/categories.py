"""Categories router: CRUD + preset seed endpoint."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.category import Category
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategorySeedRequest,
    CategoryUpdate,
)
from app.services.category_seed import seed_preset_categories

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    visible: bool | None = Query(default=None, description="Filter: true = exclude hidden"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Category]:
    """List all categories. Use visible=true to exclude hidden ones."""
    stmt = select(Category).where(Category.user_id == user.id)
    if visible is True:
        stmt = stmt.where(Category.is_hidden == False)  # noqa: E712
    stmt = stmt.order_by(Category.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_category(
    body: CategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Category:
    """Create a new custom category."""
    category = Category(
        user_id=user.id,
        source="custom",
        **body.model_dump(),
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Category:
    """Update a category. Blocked for system-source categories."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    if category.source == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system category",
        )

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_category(
    category_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a category. Blocked for system-source categories."""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    if category.source == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system category",
        )

    await db.delete(category)
    await db.commit()


@router.post(
    "/seed",
    response_model=list[CategoryResponse],
    dependencies=[Depends(verify_csrf)],
)
async def seed_categories(
    body: CategorySeedRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Category]:
    """Seed categories from a preset (minimal or full).

    Called during onboarding. Also sets `category_preset` and
    `onboarding_completed_at` on the user.
    """
    from datetime import datetime, timezone

    # Prevent double-seeding
    if user.category_preset is not None and user.category_preset != "custom":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Categories already seeded from a preset",
        )

    _groups, categories = await seed_preset_categories(db, user.id, body.preset)

    # Mark onboarding complete
    user.category_preset = body.preset
    user.onboarding_completed_at = datetime.now(timezone.utc)

    await db.commit()

    # Refresh all created categories for response
    for cat in categories:
        await db.refresh(cat)

    return categories
