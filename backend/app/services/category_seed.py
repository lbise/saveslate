"""Category seeding service.

On registration we create only the system-level group and category
(Uncategorized).  Preset seeding (minimal / full) happens during
onboarding via POST /api/categories/seed.
"""

import uuid
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.category_group import CategoryGroup


# ---------------------------------------------------------------------------
# Preset data (matches frontend src/data/mock/ exactly)
# ---------------------------------------------------------------------------

_PRESET_GROUPS: list[dict] = [
    {"name": "Living",     "icon": "Home",          "order": 1, "is_default": True, "source": "preset"},
    {"name": "Lifestyle",  "icon": "Sparkles",      "order": 2, "is_default": True, "source": "preset"},
    {"name": "Finance",    "icon": "Landmark",       "order": 3, "is_default": True, "source": "preset"},
    {"name": "Income",     "icon": "Briefcase",     "order": 4, "is_default": True, "source": "preset"},
    {"name": "Transfers",  "icon": "ArrowLeftRight", "order": 5, "is_default": True, "source": "preset"},
]

# Categories reference groups by name → resolved to group_id at seed time
_PRESET_CATEGORIES: list[dict] = [
    # Living
    {"name": "Housing",        "icon": "Home",           "group": "Living",     "is_default": True, "source": "preset"},
    {"name": "Groceries",      "icon": "ShoppingCart",    "group": "Living",     "is_default": True, "source": "preset"},
    {"name": "Transport",      "icon": "Train",          "group": "Living",     "is_default": True, "source": "preset"},
    {"name": "Health",         "icon": "Heart",          "group": "Living",     "is_default": True, "source": "preset"},
    {"name": "Personal",       "icon": "User",           "group": "Living",     "is_default": True, "source": "preset"},
    {"name": "Communications", "icon": "Phone",          "group": "Living",     "is_default": True, "source": "preset"},
    {"name": "Utilities",      "icon": "Zap",            "group": "Living",     "is_default": True, "source": "preset"},
    # Lifestyle
    {"name": "Eating Out",     "icon": "UtensilsCrossed", "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Entertainment",  "icon": "Gamepad2",       "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Shopping",       "icon": "ShoppingBag",    "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Subscriptions",  "icon": "Repeat",         "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Travel",         "icon": "Mountain",       "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Gifts",          "icon": "Gift",           "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Education",      "icon": "GraduationCap",  "group": "Lifestyle",  "is_default": True, "source": "preset"},
    {"name": "Charity",        "icon": "HeartHandshake", "group": "Lifestyle",  "is_default": True, "source": "preset"},
    # Finance
    {"name": "Insurance",      "icon": "Shield",         "group": "Finance",    "is_default": True, "source": "preset"},
    {"name": "Fees",           "icon": "ReceiptText",    "group": "Finance",    "is_default": True, "source": "preset"},
    {"name": "Taxes",          "icon": "Landmark",       "group": "Finance",    "is_default": True, "source": "preset"},
    # Income
    {"name": "Salary",         "icon": "Briefcase",      "group": "Income",     "is_default": True, "source": "preset"},
    {"name": "Freelance",      "icon": "Laptop",         "group": "Income",     "is_default": True, "source": "preset"},
    {"name": "Interest",       "icon": "Percent",        "group": "Income",     "is_default": True, "source": "preset"},
    {"name": "Investments",    "icon": "TrendingUp",     "group": "Income",     "is_default": True, "source": "preset"},
    {"name": "Gifts Received", "icon": "PartyPopper",    "group": "Income",     "is_default": True, "source": "preset"},
    {"name": "Other",          "icon": "CircleEllipsis", "group": "Income",     "is_default": True, "source": "preset"},
    # Transfers
    {"name": "Transfer",       "icon": "ArrowLeftRight", "group": "Transfers",  "is_default": True, "source": "preset"},
    {"name": "Savings",        "icon": "PiggyBank",      "group": "Transfers",  "is_default": True, "source": "preset"},
    {"name": "Investments",    "icon": "TrendingUp",     "group": "Transfers",  "is_default": True, "source": "preset"},
    {"name": "Retirement",     "icon": "Landmark",       "group": "Transfers",  "is_default": True, "source": "preset"},
    {"name": "Cash Withdrawal","icon": "Banknote",       "group": "Transfers",  "is_default": True, "source": "preset"},
]

_MINIMAL_CATEGORIES = {"Housing", "Groceries", "Transport", "Utilities", "Salary", "Other", "Transfer"}
_MINIMAL_GROUPS = {"Living", "Income", "Transfers"}


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


async def seed_preset_categories(
    db: AsyncSession,
    user_id: uuid.UUID,
    preset: Literal["minimal", "full"],
) -> tuple[list[CategoryGroup], list[Category]]:
    """Seed preset category groups and categories for a user.

    Returns the created (groups, categories) lists.
    """
    # Determine which groups/categories to create
    if preset == "minimal":
        groups_data = [g for g in _PRESET_GROUPS if g["name"] in _MINIMAL_GROUPS]
        cats_data = [c for c in _PRESET_CATEGORIES if c["name"] in _MINIMAL_CATEGORIES]
    else:  # full
        groups_data = list(_PRESET_GROUPS)
        cats_data = list(_PRESET_CATEGORIES)

    # Create groups
    group_name_to_id: dict[str, uuid.UUID] = {}
    created_groups: list[CategoryGroup] = []
    for gd in groups_data:
        group = CategoryGroup(
            user_id=user_id,
            name=gd["name"],
            icon=gd["icon"],
            order=gd["order"],
            is_default=gd["is_default"],
            source=gd["source"],
        )
        db.add(group)
        await db.flush()
        group_name_to_id[gd["name"]] = group.id
        created_groups.append(group)

    # Create categories
    created_cats: list[Category] = []
    for cd in cats_data:
        cat = Category(
            user_id=user_id,
            name=cd["name"],
            icon=cd["icon"],
            group_id=group_name_to_id.get(cd["group"]),
            is_default=cd["is_default"],
            source=cd["source"],
        )
        db.add(cat)
        created_cats.append(cat)

    return created_groups, created_cats
