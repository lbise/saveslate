"""Category seeding service.

On registration we create only the system-level group and category
(Uncategorized).  Preset seeding (minimal / full) happens during
onboarding via POST /api/categories/seed (Phase 3).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.category_group import CategoryGroup


async def seed_system_categories(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Create the hidden *System* group and *Uncategorized* category for a
    newly registered user.
    """
    # 1. System group
    system_group = CategoryGroup(
        user_id=user_id,
        name="System",
        icon="Settings2",
        order=0,
        is_default=True,
        source="system",
        is_hidden=True,
    )
    db.add(system_group)
    await db.flush()  # generate the group's UUID so we can reference it

    # 2. Uncategorized category
    uncategorized = Category(
        user_id=user_id,
        name="Uncategorized",
        icon="CircleHelp",
        group_id=system_group.id,
        is_default=True,
        source="system",
        is_hidden=True,
    )
    db.add(uncategorized)
