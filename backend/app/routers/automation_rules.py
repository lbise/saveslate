"""Automation rules router: CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.automation_rule import AutomationRule
from app.models.user import User
from app.schemas.automation_rule import (
    AutomationRuleCreate,
    AutomationRuleResponse,
    AutomationRuleUpdate,
)

router = APIRouter(prefix="/api/automation-rules", tags=["automation-rules"])


@router.get("", response_model=list[AutomationRuleResponse])
async def list_automation_rules(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AutomationRule]:
    """List all automation rules for the authenticated user."""
    result = await db.execute(
        select(AutomationRule)
        .where(AutomationRule.user_id == user.id)
        .order_by(AutomationRule.created_at)
    )
    return list(result.scalars().all())


@router.post(
    "",
    response_model=AutomationRuleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_automation_rule(
    body: AutomationRuleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AutomationRule:
    """Create a new automation rule."""
    rule = AutomationRule(user_id=user.id, **body.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put(
    "/{rule_id}",
    response_model=AutomationRuleResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_automation_rule(
    rule_id: uuid.UUID,
    body: AutomationRuleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AutomationRule:
    """Update an automation rule."""
    result = await db.execute(
        select(AutomationRule).where(
            AutomationRule.id == rule_id, AutomationRule.user_id == user.id
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found"
        )

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete(
    "/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_automation_rule(
    rule_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete an automation rule."""
    result = await db.execute(
        select(AutomationRule).where(
            AutomationRule.id == rule_id, AutomationRule.user_id == user.id
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found"
        )

    await db.delete(rule)
    await db.commit()
