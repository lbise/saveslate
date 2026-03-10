"""Automation rules router: CRUD + manual run + test endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_user, get_db, verify_csrf
from app.models.automation_rule import AutomationRule
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.automation_rule import (
    AutomationRuleCreate,
    AutomationRuleResponse,
    AutomationRuleUpdate,
)
from app.services.automation_engine import (
    AutomationRunResult,
    apply_automation_rules,
    does_rule_match,
    evaluate_condition,
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


# ---------------------------------------------------------------------------
# Manual run: apply rules to all existing transactions
# ---------------------------------------------------------------------------


class ManualRunResponse(BaseModel):
    """Response from running automation rules manually."""

    evaluated_count: int
    matched_count: int
    changed_count: int
    rule_stats: list[dict[str, Any]]


@router.post(
    "/run",
    response_model=ManualRunResponse,
    dependencies=[Depends(verify_csrf)],
)
async def run_automation_rules(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ManualRunResponse:
    """Run all enabled automation rules with 'manual-run' trigger against all transactions.

    Updates transactions in-place.
    """
    # Load all rules
    rules_result = await db.execute(
        select(AutomationRule)
        .where(AutomationRule.user_id == user.id)
        .order_by(AutomationRule.created_at)
    )
    rules = list(rules_result.scalars().all())

    rule_dicts = [
        {
            "id": str(r.id),
            "name": r.name,
            "is_enabled": r.is_enabled,
            "triggers": r.triggers,
            "match_mode": r.match_mode,
            "conditions": r.conditions,
            "actions": r.actions,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rules
    ]

    # Load all transactions
    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    transactions = list(txn_result.scalars().all())

    txn_dicts = [
        {
            "id": str(t.id),
            "transaction_id": t.transaction_id,
            "amount": t.amount,
            "currency": t.currency,
            "category_id": str(t.category_id) if t.category_id else None,
            "description": t.description,
            "date": t.date.isoformat() if t.date else "",
            "time": t.time.isoformat() if t.time else None,
            "account_id": str(t.account_id),
            "transfer_pair_id": t.transfer_pair_id,
            "transfer_pair_role": t.transfer_pair_role,
            "goal_id": str(t.goal_id) if t.goal_id else None,
            "metadata": t.metadata_,
            "raw_data": t.raw_data,
        }
        for t in transactions
    ]

    run_result = apply_automation_rules(txn_dicts, rule_dicts, "manual-run")

    # Apply updates to ORM objects
    if run_result.transaction_updates:
        for idx, updates in run_result.transaction_updates.items():
            txn_orm = transactions[idx]
            for key, value in updates.items():
                if key == "category_id" and value is not None:
                    setattr(txn_orm, key, uuid.UUID(value))
                elif key == "goal_id" and value is not None:
                    setattr(txn_orm, key, uuid.UUID(value))
                else:
                    setattr(txn_orm, key, value)

        await db.commit()

    return ManualRunResponse(
        evaluated_count=run_result.evaluated_count,
        matched_count=run_result.matched_count,
        changed_count=run_result.changed_count,
        rule_stats=[s.model_dump() for s in run_result.rule_stats],
    )


# ---------------------------------------------------------------------------
# Test: evaluate a rule against a sample transaction
# ---------------------------------------------------------------------------


class RuleTestRequest(BaseModel):
    """Sample transaction to test a rule against."""

    transaction: dict[str, Any]


class ConditionResult(BaseModel):
    """Result of evaluating a single condition."""

    field: str
    operator: str
    value: str | None
    matched: bool


class RuleTestResponse(BaseModel):
    """Result of testing a rule against a sample transaction."""

    matched: bool
    condition_results: list[ConditionResult]
    actions_to_apply: list[dict[str, Any]]


@router.post("/{rule_id}/test", response_model=RuleTestResponse)
async def test_automation_rule(
    rule_id: uuid.UUID,
    body: RuleTestRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuleTestResponse:
    """Test a rule against a sample transaction without persisting changes."""
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

    conditions = rule.conditions or []
    condition_results = []
    for cond in conditions:
        matched = evaluate_condition(body.transaction, cond)
        condition_results.append(
            ConditionResult(
                field=cond.get("field", ""),
                operator=cond.get("operator", ""),
                value=cond.get("value"),
                matched=matched,
            )
        )

    rule_dict = {
        "match_mode": rule.match_mode,
        "conditions": conditions,
    }
    overall_matched = does_rule_match(rule_dict, body.transaction)

    actions_to_apply = rule.actions if overall_matched else []

    return RuleTestResponse(
        matched=overall_matched,
        condition_results=condition_results,
        actions_to_apply=actions_to_apply,
    )
