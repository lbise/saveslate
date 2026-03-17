"""Transfer pair validation, normalization, and cleanup helpers."""

import uuid
from collections.abc import Sequence
from datetime import timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction


def normalize_transfer_pairs(
    transactions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Validate and normalize transfer pairs in a list of transaction dicts.

    Rules (matching the frontend):
    1. Trim pair IDs, clear orphaned roles.
    2. A valid pair requires exactly 2 transactions.
    3. Role assignment: by amount sign (negative → source, positive → destination),
       fallback to position order when same sign.
    """
    result = list(transactions)

    # Group indices by transfer_pair_id
    pair_map: dict[str, list[int]] = {}
    for i, txn in enumerate(result):
        pair_id = (txn.get("transfer_pair_id") or "").strip()
        if not pair_id:
            # Clear orphaned role
            result[i] = {**txn, "transfer_pair_id": None, "transfer_pair_role": None}
            continue
        result[i] = {**txn, "transfer_pair_id": pair_id}
        pair_map.setdefault(pair_id, []).append(i)

    for pair_id, indices in pair_map.items():
        if len(indices) != 2:
            # Invalid: not exactly 2 transactions – clear pair metadata
            for idx in indices:
                result[idx] = {
                    **result[idx],
                    "transfer_pair_id": None,
                    "transfer_pair_role": None,
                }
            continue

        left_idx, right_idx = indices
        left = result[left_idx]
        right = result[right_idx]

        left_amount = Decimal(str(left.get("amount", 0)))
        right_amount = Decimal(str(right.get("amount", 0)))

        has_opposite_signs = (left_amount < 0 and right_amount > 0) or (
            left_amount > 0 and right_amount < 0
        )

        if has_opposite_signs:
            result[left_idx] = {
                **left,
                "transfer_pair_role": "source" if left_amount < 0 else "destination",
            }
            result[right_idx] = {
                **right,
                "transfer_pair_role": "source" if right_amount < 0 else "destination",
            }
        else:
            # Fallback: assign by position
            result[left_idx] = {**left, "transfer_pair_role": "source"}
            result[right_idx] = {**right, "transfer_pair_role": "destination"}

    return result


def validate_transfer_pair(txn_a: dict[str, Any], txn_b: dict[str, Any]) -> list[str]:
    """Validate a candidate transfer pair and return a list of errors (empty = valid).

    Checks (matching frontend TransactionPreview.tsx matching logic):
    - Different accounts
    - Same currency
    - Opposite signs
    - Same absolute amount
    - Within ±2 days
    """
    errors: list[str] = []

    # Different accounts
    if txn_a.get("account_id") == txn_b.get("account_id"):
        errors.append("Transfer transactions must be from different accounts")

    # Same currency
    if txn_a.get("currency") != txn_b.get("currency"):
        errors.append(
            f"Currency mismatch: {txn_a.get('currency')} vs {txn_b.get('currency')}"
        )

    # Opposite signs
    amount_a = Decimal(str(txn_a.get("amount", 0)))
    amount_b = Decimal(str(txn_b.get("amount", 0)))
    if not ((amount_a < 0 and amount_b > 0) or (amount_a > 0 and amount_b < 0)):
        errors.append("Transfer amounts must have opposite signs")

    # Same absolute amount
    if abs(amount_a) != abs(amount_b):
        errors.append(
            f"Absolute amounts differ: {abs(amount_a)} vs {abs(amount_b)}"
        )

    # Date proximity (±2 days)
    date_a = txn_a.get("date")
    date_b = txn_b.get("date")
    if date_a is not None and date_b is not None:
        try:
            from datetime import date as date_type

            if isinstance(date_a, str):
                date_a = date_type.fromisoformat(date_a)
            if isinstance(date_b, str):
                date_b = date_type.fromisoformat(date_b)
            if abs(date_a - date_b) > timedelta(days=2):
                errors.append(
                    f"Dates are more than 2 days apart: {date_a} vs {date_b}"
                )
        except (ValueError, TypeError):
            pass

    return errors


async def clear_counterpart_transfer_links(
    db: AsyncSession,
    user_id: uuid.UUID,
    transactions: Sequence[Transaction],
) -> None:
    """Clear transfer metadata on surviving counterparts of deleted transactions."""
    transaction_ids = [txn.id for txn in transactions]
    pair_ids = {
        txn.transfer_pair_id
        for txn in transactions
        if txn.transfer_pair_id
    }

    if not transaction_ids or not pair_ids:
        return

    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.transfer_pair_id.in_(pair_ids),
            Transaction.id.not_in(transaction_ids),
        )
    )

    for counterpart in result.scalars().all():
        counterpart.transfer_pair_id = None
        counterpart.transfer_pair_role = None
