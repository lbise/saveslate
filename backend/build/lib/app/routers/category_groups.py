"""Category groups router: CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.category_group import CategoryGroup
from app.models.user import User
from app.schemas.category_group import (
    CategoryGroupCreate,
    CategoryGroupResponse,
    CategoryGroupUpdate,
)

router = APIRouter(prefix="/api/category-groups", tags=["category-groups"])


@router.get("", response_model=list[CategoryGroupResponse])
async def list_category_groups(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CategoryGroup]:
    """List all category groups for the authenticated user."""
    result = await db.execute(
        select(CategoryGroup)
        .where(CategoryGroup.user_id == user.id)
        .order_by(CategoryGroup.order, CategoryGroup.name)
    )
    return list(result.scalars().all())


@router.post(
    "",
    response_model=CategoryGroupResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_category_group(
    body: CategoryGroupCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryGroup:
    """Create a new custom category group."""
    group = CategoryGroup(
        user_id=user.id,
        source="custom",
        **body.model_dump(),
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.put(
    "/{group_id}",
    response_model=CategoryGroupResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_category_group(
    group_id: uuid.UUID,
    body: CategoryGroupUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryGroup:
    """Update a category group. Blocked for system-source groups."""
    result = await db.execute(
        select(CategoryGroup).where(
            CategoryGroup.id == group_id, CategoryGroup.user_id == user.id
        )
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category group not found"
        )
    if group.source == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system category group",
        )

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    await db.commit()
    await db.refresh(group)
    return group


@router.delete(
    "/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_category_group(
    group_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a category group. Blocked for system-source groups."""
    result = await db.execute(
        select(CategoryGroup).where(
            CategoryGroup.id == group_id, CategoryGroup.user_id == user.id
        )
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category group not found"
        )
    if group.source == "system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system category group",
        )

    await db.delete(group)
    await db.commit()
