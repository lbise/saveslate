"""CSV import router: upload, parse, create transactions, apply rules."""

import json
import uuid
from datetime import date as date_type
from datetime import datetime, time as time_type, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_user, get_db, verify_csrf
from app.models.account import Account
from app.models.automation_rule import AutomationRule
from app.models.category import Category
from app.models.csv_parser import CsvParser
from app.models.import_batch import ImportBatch
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionResponse
from app.services.automation_engine import apply_automation_rules
from app.services.csv_import import CsvParseResult, parse_csv_file
from app.services.transfer_pairs import normalize_transfer_pairs, validate_transfer_pair

router = APIRouter(prefix="/api/import", tags=["import"])


class ImportTransferLink(BaseModel):
    """Transfer link between one imported row and one existing transaction."""

    row_index: int = Field(ge=0)
    matched_transaction_id: uuid.UUID


class CsvImportPayload(BaseModel):
    """Structured import options sent alongside the uploaded CSV file."""

    account_id: uuid.UUID
    parser_id: uuid.UUID | None = None
    apply_rules: bool = True
    currency: str = Field(default="CHF", min_length=3, max_length=3)
    import_name: str | None = None
    selected_row_indexes: list[int] | None = None
    transfer_links: list[ImportTransferLink] = Field(default_factory=list)

    model_config = {"extra": "forbid"}


def _transaction_to_response(txn: Transaction) -> TransactionResponse:
    """Convert ORM transaction to response dict (same helper as transactions router)."""
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


def _parse_import_payload(
    payload: str | None,
    account_id: uuid.UUID | None,
    parser_id: uuid.UUID | None,
    apply_rules: bool,
    currency: str,
) -> CsvImportPayload:
    if payload is not None:
        try:
            raw_payload = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid import payload: {exc.msg}",
            ) from exc

        try:
            return CsvImportPayload.model_validate(raw_payload)
        except ValidationError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors()) from exc

    if account_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="accountId is required",
        )

    return CsvImportPayload(
        account_id=account_id,
        parser_id=parser_id,
        apply_rules=apply_rules,
        currency=currency,
    )


def _normalize_selected_row_indexes(
    total_rows: int,
    selected_row_indexes: list[int] | None,
) -> list[int]:
    if selected_row_indexes is None:
        return list(range(total_rows))

    if not selected_row_indexes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No rows selected for import",
        )

    normalized: list[int] = []
    seen_indexes: set[int] = set()
    for row_index in selected_row_indexes:
        if row_index in seen_indexes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected row {row_index} appears more than once",
            )
        if row_index < 0 or row_index >= total_rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected row index {row_index} is out of range",
            )
        normalized.append(row_index)
        seen_indexes.add(row_index)

    return normalized


async def _load_parser_config(
    db: AsyncSession,
    user_id: uuid.UUID,
    parser_id: uuid.UUID | None,
) -> tuple[dict[str, Any] | None, str | None]:
    if parser_id is None:
        return None, None

    result = await db.execute(
        select(CsvParser).where(CsvParser.id == parser_id, CsvParser.user_id == user_id)
    )
    csv_parser = result.scalar_one_or_none()
    if csv_parser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CSV parser not found",
        )

    return csv_parser.config, csv_parser.name


async def _load_uncategorized_category_id(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> uuid.UUID | None:
    result = await db.execute(
        select(Category.id).where(
            Category.user_id == user_id,
            Category.source == "system",
            func.lower(Category.name) == "uncategorized",
        )
    )
    return result.scalar_one_or_none()


def _parse_time(value: str | None, row_index: int) -> time_type | None:
    if not value:
        return None

    parts = value.split(":")
    try:
        return time_type(
            int(parts[0]),
            int(parts[1]) if len(parts) > 1 else 0,
            int(parts[2]) if len(parts) > 2 else 0,
        )
    except (ValueError, IndexError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected row {row_index} has an invalid time value",
        ) from exc


async def _build_transaction_dicts(
    db: AsyncSession,
    user: User,
    parse_result: CsvParseResult,
    selected_row_indexes: list[int],
    account_id: uuid.UUID,
    import_batch_id: uuid.UUID,
    default_currency: str,
) -> tuple[list[dict[str, Any]], dict[int, dict[str, Any]]]:
    category_cache: dict[str, uuid.UUID | None] = {}
    txn_dicts: list[dict[str, Any]] = []
    txn_dicts_by_row_index: dict[int, dict[str, Any]] = {}

    for row_index in selected_row_indexes:
        row = parse_result.rows[row_index]

        if not row.date or not row.description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected row {row_index} is missing required fields",
            )

        try:
            parsed_date = date_type.fromisoformat(row.date)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected row {row_index} has an invalid date value",
            ) from exc

        parsed_time = _parse_time(row.time, row_index)

        category_id: uuid.UUID | None = None
        if row.category:
            cache_key = row.category.strip().lower()
            if cache_key not in category_cache:
                cat_result = await db.execute(
                    select(Category.id).where(
                        Category.user_id == user.id,
                        func.lower(Category.name) == cache_key,
                    )
                )
                category_cache[cache_key] = cat_result.scalar_one_or_none()
            category_id = category_cache[cache_key]

        txn_dict = {
            "transaction_id": row.transaction_id,
            "amount": row.amount,
            "currency": row.currency or default_currency,
            "category_id": str(category_id) if category_id else None,
            "description": row.description,
            "date": parsed_date,
            "time": parsed_time,
            "account_id": str(account_id),
            "transfer_pair_id": None,
            "transfer_pair_role": None,
            "goal_id": None,
            "import_batch_id": str(import_batch_id),
            "metadata": row.metadata,
            "raw_data": row.raw,
        }
        txn_dicts.append(txn_dict)
        txn_dicts_by_row_index[row_index] = txn_dict

    if not txn_dicts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid transactions could be created from the CSV",
        )

    return txn_dicts, txn_dicts_by_row_index


def _apply_uncategorized_fallback(
    txn_dicts: list[dict[str, Any]],
    uncategorized_category_id: uuid.UUID | None,
) -> None:
    if uncategorized_category_id is None:
        return

    uncategorized_category_id_str = str(uncategorized_category_id)
    for txn_dict in txn_dicts:
        if txn_dict.get("category_id") is None:
            txn_dict["category_id"] = uncategorized_category_id_str


async def _apply_transfer_links(
    db: AsyncSession,
    user: User,
    transfer_links: list[ImportTransferLink],
    selected_row_indexes: list[int],
    txn_dicts_by_row_index: dict[int, dict[str, Any]],
) -> None:
    if not transfer_links:
        return

    selected_row_index_set = set(selected_row_indexes)
    seen_row_indexes: set[int] = set()
    seen_transaction_ids: set[uuid.UUID] = set()
    matched_ids = [link.matched_transaction_id for link in transfer_links]

    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.id.in_(matched_ids),
        )
    )
    matched_transactions = list(result.scalars().all())
    matched_by_id = {transaction.id: transaction for transaction in matched_transactions}

    if len(matched_by_id) != len(set(matched_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more transfer link targets were not found",
        )

    for link in transfer_links:
        if link.row_index in seen_row_indexes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transfer link row {link.row_index} appears more than once",
            )
        if link.matched_transaction_id in seen_transaction_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A transfer link target can only be used once per import",
            )
        if link.row_index not in selected_row_index_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transfer link row {link.row_index} is not selected for import",
            )

        imported_txn = txn_dicts_by_row_index.get(link.row_index)
        if imported_txn is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transfer link row {link.row_index} is invalid",
            )
        if imported_txn.get("transfer_pair_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected row {link.row_index} is already paired within this import",
            )

        matched_transaction = matched_by_id[link.matched_transaction_id]
        if matched_transaction.transfer_pair_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Matched transaction already belongs to a transfer pair",
            )

        validation_errors = validate_transfer_pair(
            imported_txn,
            {
                "account_id": str(matched_transaction.account_id),
                "currency": matched_transaction.currency,
                "amount": matched_transaction.amount,
                "date": matched_transaction.date,
            },
        )
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transfer link for row {link.row_index}: {'; '.join(validation_errors)}",
            )

        pair_id = f"transfer-pair-{uuid.uuid4()}"
        imported_role = "source" if Decimal(str(imported_txn["amount"])) < 0 else "destination"
        matched_role = "destination" if imported_role == "source" else "source"

        imported_txn["transfer_pair_id"] = pair_id
        imported_txn["transfer_pair_role"] = imported_role
        matched_transaction.transfer_pair_id = pair_id
        matched_transaction.transfer_pair_role = matched_role

        seen_row_indexes.add(link.row_index)
        seen_transaction_ids.add(link.matched_transaction_id)


# ---------------------------------------------------------------------------
# Preview: parse CSV without importing
# ---------------------------------------------------------------------------


@router.post("/preview", response_model=CsvParseResult)
async def preview_csv(
    file: UploadFile,
    parser_id: uuid.UUID | None = Query(default=None, alias="parserId"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CsvParseResult:
    """Parse a CSV file and return preview data without creating transactions."""
    content = (await file.read()).decode("utf-8-sig")
    parser_config, _ = await _load_parser_config(db, user.id, parser_id)
    return parse_csv_file(content, parser_config)


# ---------------------------------------------------------------------------
# Import: parse CSV, create transactions, apply automation rules
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=list[TransactionResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def import_csv(
    file: UploadFile,
    payload: str | None = Form(default=None),
    account_id: uuid.UUID | None = Query(default=None, alias="accountId"),
    parser_id: uuid.UUID | None = Query(default=None, alias="parserId"),
    apply_rules: bool = Query(default=True, alias="applyRules"),
    currency: str = Query(default="CHF"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TransactionResponse]:
    """Upload a CSV, parse it, create transactions, and apply automation rules."""
    import_request = _parse_import_payload(payload, account_id, parser_id, apply_rules, currency)

    acct_result = await db.execute(
        select(Account).where(Account.id == import_request.account_id, Account.user_id == user.id)
    )
    account = acct_result.scalar_one_or_none()
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    content = (await file.read()).decode("utf-8-sig")
    parser_config, parser_name = await _load_parser_config(db, user.id, import_request.parser_id)
    uncategorized_category_id = await _load_uncategorized_category_id(db, user.id)

    parse_result = parse_csv_file(content, parser_config)
    if not parse_result.rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid rows parsed from CSV",
        )

    selected_row_indexes = _normalize_selected_row_indexes(
        len(parse_result.rows),
        import_request.selected_row_indexes,
    )

    batch_name = (
        import_request.import_name.strip()
        if import_request.import_name and import_request.import_name.strip()
        else file.filename or "import.csv"
    )
    batch = ImportBatch(
        user_id=user.id,
        file_name=file.filename or "import.csv",
        name=batch_name,
        imported_at=datetime.now(timezone.utc),
        parser_name=parser_name,
        parser_id=import_request.parser_id,
        row_count=len(selected_row_indexes),
        account_id=import_request.account_id,
    )
    db.add(batch)
    await db.flush()

    txn_dicts, txn_dicts_by_row_index = await _build_transaction_dicts(
        db,
        user,
        parse_result,
        selected_row_indexes,
        import_request.account_id,
        batch.id,
        import_request.currency or account.currency,
    )

    txn_dicts = normalize_transfer_pairs(txn_dicts)
    txn_dicts_by_row_index = {
        row_index: txn_dicts[idx]
        for idx, row_index in enumerate(selected_row_indexes)
    }

    if import_request.apply_rules:
        rules_result = await db.execute(
            select(AutomationRule).where(AutomationRule.user_id == user.id)
        )
        rules = [
            {
                "id": str(rule.id),
                "name": rule.name,
                "is_enabled": rule.is_enabled,
                "triggers": rule.triggers,
                "match_mode": rule.match_mode,
                "conditions": rule.conditions,
                "actions": rule.actions,
                "created_at": rule.created_at.isoformat() if rule.created_at else "",
            }
            for rule in rules_result.scalars().all()
        ]

        run_result = apply_automation_rules(txn_dicts, rules, "on-import")
        for idx, updates in run_result.transaction_updates.items():
            for key, value in updates.items():
                txn_dicts[idx][key] = value

    await _apply_transfer_links(
        db,
        user,
        import_request.transfer_links,
        selected_row_indexes,
        txn_dicts_by_row_index,
    )
    _apply_uncategorized_fallback(txn_dicts, uncategorized_category_id)

    created_txns: list[Transaction] = []
    for txn_dict in txn_dicts:
        txn = Transaction(
            user_id=user.id,
            transaction_id=txn_dict.get("transaction_id"),
            amount=Decimal(str(txn_dict["amount"])),
            currency=txn_dict["currency"],
            category_id=uuid.UUID(txn_dict["category_id"]) if txn_dict.get("category_id") else None,
            description=txn_dict["description"],
            date=txn_dict["date"],
            time=txn_dict.get("time"),
            account_id=uuid.UUID(str(txn_dict["account_id"])),
            transfer_pair_id=txn_dict.get("transfer_pair_id"),
            transfer_pair_role=txn_dict.get("transfer_pair_role"),
            goal_id=uuid.UUID(txn_dict["goal_id"]) if txn_dict.get("goal_id") else None,
            import_batch_id=batch.id,
            metadata_=txn_dict.get("metadata"),
            raw_data=txn_dict.get("raw_data"),
        )
        db.add(txn)
        created_txns.append(txn)

    await db.commit()

    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.tags))
        .where(Transaction.id.in_([txn.id for txn in created_txns]))
    )
    loaded = list(result.scalars().all())
    return [_transaction_to_response(txn) for txn in loaded]
