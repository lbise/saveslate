"""Automation rule engine – ported from frontend TypeScript.

Evaluates automation rules against transactions and applies actions.
Mirrors the logic in src/lib/automation-rules.ts.
"""

import re
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


class AutomationCondition(BaseModel):
    """A single condition to evaluate against a transaction."""

    id: str
    field: str
    operator: str
    value: str | None = None


class SetCategoryAction(BaseModel):
    """Action: assign a category to the transaction."""

    type: str = "set-category"
    category_id: str
    overwrite_existing: bool = False


class SetGoalAction(BaseModel):
    """Action: assign a goal to the transaction."""

    type: str = "set-goal"
    goal_id: str
    overwrite_existing: bool = False


class RuleRunStat(BaseModel):
    """Per-rule statistics from a run."""

    rule_id: str
    rule_name: str
    matched_count: int = 0
    changed_count: int = 0


class AutomationRunResult(BaseModel):
    """Result of applying automation rules to a set of transactions."""

    evaluated_count: int
    matched_count: int
    changed_count: int
    rule_stats: list[RuleRunStat]
    # transaction_updates maps transaction index → dict of changed fields
    transaction_updates: dict[int, dict[str, Any]]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalize_text(value: Any) -> str:
    """Convert a value to a string for text comparisons."""
    if value is None:
        return ""
    return str(value).strip()


def _parse_comparable_value(value: Any) -> float | None:
    """Try to parse a value as a number for numeric comparisons."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, Decimal):
        return float(value)
    text = _normalize_text(value)
    if not text:
        return None
    try:
        return float(text)
    except (ValueError, InvalidOperation):
        return None


def _resolve_dot_path(obj: Any, path: str) -> Any:
    """Walk a dot-separated path into a dict/list structure."""
    if obj is None:
        return None
    parts = path.split(".")
    current = obj
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list):
            # metadata is list[dict] – search for matching key
            for item in current:
                if isinstance(item, dict) and item.get("key") == part:
                    return item.get("value")
            return None
        else:
            return None
        if current is None:
            return None
    return current


def _infer_transaction_type(txn: dict[str, Any]) -> str:
    """Infer the transaction type from amount and transfer_pair_id."""
    if txn.get("transfer_pair_id"):
        return "transfer"
    amount = txn.get("amount")
    if amount is not None:
        try:
            if Decimal(str(amount)) < 0:
                return "expense"
        except (InvalidOperation, ValueError):
            pass
    return "income"


def _resolve_field_value(txn: dict[str, Any], field: str) -> Any:
    """Resolve a field value from a transaction dict.

    Supports:
    - Direct fields: ``description``, ``amount``, etc.
    - ``type``: computed from amount / transfer_pair_id
    - ``metadata.*``: dot-path into metadata list
    - ``raw.*``: dot-path into raw_data dict
    """
    normalized = field.strip()
    if not normalized:
        return None

    if normalized == "type":
        return _infer_transaction_type(txn)

    if normalized.startswith("metadata."):
        sub = normalized[len("metadata."):]
        return _resolve_dot_path(txn.get("metadata") or txn.get("metadata_"), sub)

    if normalized.startswith("raw."):
        sub = normalized[len("raw."):]
        return _resolve_dot_path(txn.get("raw_data"), sub)

    # camelCase → snake_case fallback
    snake = _camel_to_snake(normalized)
    if snake in txn:
        return txn[snake]
    return txn.get(normalized)


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    s1 = re.sub(r"([A-Z])", r"_\1", name)
    return s1.lower().lstrip("_")


# ---------------------------------------------------------------------------
# Condition evaluation
# ---------------------------------------------------------------------------


def evaluate_condition(txn: dict[str, Any], condition: dict[str, Any]) -> bool:
    """Evaluate a single condition against a transaction dict."""
    field = condition.get("field", "")
    operator = condition.get("operator", "")
    expected_raw = condition.get("value")

    field_value = _resolve_field_value(txn, field)
    field_text = _normalize_text(field_value)
    expected_text = _normalize_text(expected_raw)

    if operator == "exists":
        return len(field_text) > 0
    if operator == "not-exists":
        return len(field_text) == 0

    if operator == "equals":
        left = _parse_comparable_value(field_value)
        right = _parse_comparable_value(expected_raw)
        if left is not None and right is not None:
            return left == right
        return field_text.lower() == expected_text.lower()

    if operator == "not-equals":
        left = _parse_comparable_value(field_value)
        right = _parse_comparable_value(expected_raw)
        if left is not None and right is not None:
            return left != right
        return field_text.lower() != expected_text.lower()

    if operator == "contains":
        return len(expected_text) > 0 and expected_text.lower() in field_text.lower()

    if operator == "not-contains":
        return len(expected_text) > 0 and expected_text.lower() not in field_text.lower()

    if operator == "starts-with":
        return len(expected_text) > 0 and field_text.lower().startswith(expected_text.lower())

    if operator == "ends-with":
        return len(expected_text) > 0 and field_text.lower().endswith(expected_text.lower())

    if operator == "regex":
        if not expected_text:
            return False
        try:
            return bool(re.search(expected_text, field_text, re.IGNORECASE))
        except re.error:
            return False

    if operator == "not-regex":
        if not expected_text:
            return False
        try:
            return not bool(re.search(expected_text, field_text, re.IGNORECASE))
        except re.error:
            return False

    if operator in ("gt", "gte", "lt", "lte"):
        left = _parse_comparable_value(field_value)
        right = _parse_comparable_value(expected_raw)
        if left is None or right is None:
            return False
        if operator == "gt":
            return left > right
        if operator == "gte":
            return left >= right
        if operator == "lt":
            return left < right
        return left <= right  # lte

    return False


# ---------------------------------------------------------------------------
# Rule matching
# ---------------------------------------------------------------------------


def does_rule_match(rule: dict[str, Any], txn: dict[str, Any]) -> bool:
    """Check whether all/any conditions of a rule match the transaction."""
    conditions = rule.get("conditions", [])
    if not conditions:
        return False

    evaluations = [evaluate_condition(txn, c) for c in conditions]
    match_mode = rule.get("match_mode", "all")
    if match_mode == "any":
        return any(evaluations)
    return all(evaluations)


# ---------------------------------------------------------------------------
# Action application
# ---------------------------------------------------------------------------

# Sentinel used to detect "Uncategorized" category.
# The frontend uses a fixed constant; we accept it or None.
UNCATEGORIZED_CATEGORY_ID = "uncategorized"


def apply_rule_action(
    txn: dict[str, Any], action: dict[str, Any]
) -> tuple[dict[str, Any], bool]:
    """Apply a single action to a transaction dict.

    Returns (possibly_updated_txn, changed_bool).
    """
    action_type = action.get("type")

    if action_type == "set-category":
        overwrite = action.get("overwrite_existing") or action.get("overwriteExisting", False)
        target_id = action.get("category_id") or action.get("categoryId")
        current = txn.get("category_id")

        if not overwrite and current is not None and str(current) != UNCATEGORIZED_CATEGORY_ID:
            return txn, False
        if current is not None and str(current) == str(target_id):
            return txn, False

        return {**txn, "category_id": target_id}, True

    if action_type == "set-goal":
        overwrite = action.get("overwrite_existing") or action.get("overwriteExisting", False)
        target_id = action.get("goal_id") or action.get("goalId")
        current = txn.get("goal_id")

        if not overwrite and current is not None:
            return txn, False
        if current is not None and str(current) == str(target_id):
            return txn, False

        return {**txn, "goal_id": target_id}, True

    return txn, False


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def apply_automation_rules(
    transactions: list[dict[str, Any]],
    rules: list[dict[str, Any]],
    trigger: str,
) -> AutomationRunResult:
    """Apply automation rules to a list of transaction dicts.

    Only enabled rules whose triggers include *trigger* are evaluated.
    Rules are sorted by created_at (oldest first).
    For each transaction, only the first matching rule is applied.
    """
    active_rules = sorted(
        [
            r
            for r in rules
            if r.get("is_enabled", True) and trigger in (r.get("triggers") or [])
        ],
        key=lambda r: r.get("created_at", ""),
    )

    rule_stats = [
        RuleRunStat(rule_id=str(r.get("id", "")), rule_name=r.get("name", ""))
        for r in active_rules
    ]

    if not active_rules or not transactions:
        return AutomationRunResult(
            evaluated_count=len(transactions),
            matched_count=0,
            changed_count=0,
            rule_stats=rule_stats,
            transaction_updates={},
        )

    updates: dict[int, dict[str, Any]] = {}
    matched_count = 0
    changed_count = 0

    for txn_idx, txn in enumerate(transactions):
        current = dict(txn)
        has_matched = False

        for rule_idx, rule in enumerate(active_rules):
            stats = rule_stats[rule_idx]
            if not does_rule_match(rule, current):
                continue

            has_matched = True
            stats.matched_count += 1

            for action in rule.get("actions", []):
                current, changed = apply_rule_action(current, action)
                if changed:
                    stats.changed_count += 1
                    changed_count += 1
                    # Track only the changed fields
                    if txn_idx not in updates:
                        updates[txn_idx] = {}
                    if action.get("type") == "set-category":
                        updates[txn_idx]["category_id"] = current["category_id"]
                    elif action.get("type") == "set-goal":
                        updates[txn_idx]["goal_id"] = current["goal_id"]

            break  # Only first matching rule per transaction

        if has_matched:
            matched_count += 1

    return AutomationRunResult(
        evaluated_count=len(transactions),
        matched_count=matched_count,
        changed_count=changed_count,
        rule_stats=rule_stats,
        transaction_updates=updates,
    )
