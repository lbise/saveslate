"""CSV import router: upload, parse, create transactions, apply rules."""

import json
import time
import uuid
from datetime import date as date_type
from datetime import datetime, time as time_type, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.deps import get_current_user, get_db, verify_csrf
from app.models.account import Account
from app.models.automation_rule import AutomationRule
from app.models.category import Category
from app.models.category_group import CategoryGroup
from app.models.csv_parser import CsvParser
from app.models.import_batch import ImportBatch
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionResponse
from app.services.automation_engine import apply_automation_rules
from app.services.csv_import import CsvParseResult, parse_csv_file
from app.services.import_ai import (
    ImportAiConfigurationError,
    ImportAiError,
    ImportAiResponseError,
    suggest_import_rows,
)
from app.services.transfer_pairs import normalize_transfer_pairs, validate_transfer_pair

router = APIRouter(prefix="/api/import", tags=["import"])


class ImportTransferLink(BaseModel):
    """Transfer link between one imported row and one existing transaction."""

    row_index: int = Field(ge=0)
    matched_transaction_id: uuid.UUID


class CsvImportRowOverride(BaseModel):
    """Accepted per-row import overrides from the preview step."""

    row_index: int = Field(ge=0)
    description: str | None = Field(default=None, min_length=1)
    category_id: uuid.UUID | None = None

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = " ".join(value.strip().split())
        return normalized or None


class CsvImportAssistPayload(BaseModel):
    """Structured AI assist options sent alongside the uploaded CSV file."""

    account_id: uuid.UUID
    parser_id: uuid.UUID
    row_indexes: list[int] | None = None

    model_config = {"extra": "forbid"}


class ImportAssistSuggestionResponse(BaseModel):
    """One AI suggestion for one parsed CSV row."""

    row_index: int
    cleaned_description: str | None = None
    category_id: uuid.UUID | None = None
    category_name: str | None = None
    confidence: float
    reason: str
    rule_keyword: str | None = None


class ImportAssistDebugChunk(BaseModel):
    """Debug data for one AI request chunk."""

    chunk_index: int
    row_indexes: list[int]
    prompt: str
    raw_response_text: str
    raw_api_response: dict
    parsed_suggestions_count: int
    duration_ms: int


class ImportAssistDebugInfo(BaseModel):
    """Debug info for the entire AI assist request."""

    model: str
    timeout_seconds: int
    total_duration_ms: int
    chunks: list[ImportAssistDebugChunk]


class ImportAssistResponse(BaseModel):
    """Structured AI suggestions for the selected CSV rows."""

    suggestions: list[ImportAssistSuggestionResponse]
    debug: ImportAssistDebugInfo | None = None


class CsvImportPayload(BaseModel):
    """Structured import options sent alongside the uploaded CSV file."""

    account_id: uuid.UUID
    parser_id: uuid.UUID | None = None
    apply_rules: bool = True
    currency: str = Field(default="CHF", min_length=3, max_length=3)
    import_name: str | None = None
    selected_row_indexes: list[int] | None = None
    transfer_links: list[ImportTransferLink] = Field(default_factory=list)
    row_overrides: list[CsvImportRowOverride] = Field(default_factory=list)

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
        notes=txn.notes,
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


def _parse_import_assist_payload(
    payload: str | None,
    account_id: uuid.UUID | None,
    parser_id: uuid.UUID | None,
) -> CsvImportAssistPayload:
    if payload is not None:
        try:
            raw_payload = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assist payload: {exc.msg}",
            ) from exc

        try:
            return CsvImportAssistPayload.model_validate(raw_payload)
        except ValidationError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors()) from exc

    if account_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="accountId is required",
        )
    if parser_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="parserId is required",
        )

    return CsvImportAssistPayload(account_id=account_id, parser_id=parser_id)


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


def _normalize_row_overrides(
    selected_row_indexes: list[int],
    row_overrides: list[CsvImportRowOverride],
) -> dict[int, CsvImportRowOverride]:
    if not row_overrides:
        return {}

    selected_row_index_set = set(selected_row_indexes)
    normalized: dict[int, CsvImportRowOverride] = {}
    for row_override in row_overrides:
        if row_override.row_index not in selected_row_index_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row override {row_override.row_index} does not belong to the selected import rows",
            )
        if row_override.row_index in normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row override {row_override.row_index} appears more than once",
            )
        normalized[row_override.row_index] = row_override

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


async def _load_default_transfer_category_id(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> uuid.UUID | None:
    result = await db.execute(
        select(Category.id)
        .join(CategoryGroup, Category.group_id == CategoryGroup.id)
        .where(
            Category.user_id == user_id,
            CategoryGroup.user_id == user_id,
            CategoryGroup.type == "transfer",
            Category.is_hidden.is_(False),
        )
        .order_by(
            case((func.lower(Category.name) == "transfer", 0), else_=1),
            Category.is_default.desc(),
            Category.created_at,
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _load_rule_dicts(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    rules_result = await db.execute(
        select(AutomationRule).where(AutomationRule.user_id == user_id)
    )
    return [
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


async def _load_visible_categories_for_ai(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> tuple[list[dict[str, str]], dict[str, str]]:
    result = await db.execute(
        select(Category.id, Category.name, CategoryGroup.type)
        .join(CategoryGroup, Category.group_id == CategoryGroup.id, isouter=True)
        .where(
            Category.user_id == user_id,
            Category.is_hidden.is_(False),
        )
        .order_by(Category.name)
    )

    categories: list[dict[str, str]] = []
    category_names_by_id: dict[str, str] = {}
    for category_id, name, category_type in result.all():
        category_id_str = str(category_id)
        categories.append(
            {
                "id": category_id_str,
                "name": name,
                "type": category_type or "expense",
            }
        )
        category_names_by_id[category_id_str] = name

    return categories, category_names_by_id


async def _load_history_examples_for_ai(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[dict[str, str]]:
    result = await db.execute(
        select(Transaction.description, Category.name)
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.category_id.is_not(None),
            Category.is_hidden.is_(False),
            func.lower(Category.name) != "uncategorized",
        )
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .limit(24)
    )

    return [
        {
            "description": description,
            "categoryName": category_name,
        }
        for description, category_name in result.all()
        if description and category_name
    ]


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


async def _apply_row_overrides(
    db: AsyncSession,
    user_id: uuid.UUID,
    txn_dicts_by_row_index: dict[int, dict[str, Any]],
    row_overrides: dict[int, CsvImportRowOverride],
) -> None:
    if not row_overrides:
        return

    requested_category_ids = {
        row_override.category_id
        for row_override in row_overrides.values()
        if row_override.category_id is not None
    }
    if requested_category_ids:
        result = await db.execute(
            select(Category.id).where(
                Category.user_id == user_id,
                Category.id.in_(requested_category_ids),
            )
        )
        valid_category_ids = {category_id for category_id in result.scalars().all()}
        invalid_category_ids = requested_category_ids - valid_category_ids
        if invalid_category_ids:
            invalid_id = next(iter(invalid_category_ids))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category override {invalid_id} is not valid for this user",
            )

    for row_index, row_override in row_overrides.items():
        txn_dict = txn_dicts_by_row_index.get(row_index)
        if txn_dict is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row override {row_index} could not be matched to an imported transaction",
            )

        if row_override.description is not None:
            txn_dict["description"] = row_override.description
        if row_override.category_id is not None:
            txn_dict["category_id"] = str(row_override.category_id)


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


def _is_uncategorized_or_empty_category(
    category_id: str | uuid.UUID | None,
    uncategorized_category_id: uuid.UUID | None,
) -> bool:
    if category_id is None:
        return True
    if uncategorized_category_id is None:
        return False
    return str(category_id) == str(uncategorized_category_id)


def _apply_transfer_category_fallback(
    txn_dicts: list[dict[str, Any]],
    transfer_category_id: uuid.UUID | None,
    uncategorized_category_id: uuid.UUID | None,
) -> None:
    if transfer_category_id is None:
        return

    transfer_category_id_str = str(transfer_category_id)
    for txn_dict in txn_dicts:
        if not txn_dict.get("transfer_pair_id"):
            continue
        if _is_uncategorized_or_empty_category(
            txn_dict.get("category_id"),
            uncategorized_category_id,
        ):
            txn_dict["category_id"] = transfer_category_id_str


async def _apply_transfer_links(
    db: AsyncSession,
    user: User,
    transfer_links: list[ImportTransferLink],
    selected_row_indexes: list[int],
    txn_dicts_by_row_index: dict[int, dict[str, Any]],
    transfer_category_id: uuid.UUID | None,
    uncategorized_category_id: uuid.UUID | None,
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
        if _is_uncategorized_or_empty_category(
            matched_transaction.category_id,
            uncategorized_category_id,
        ) and transfer_category_id is not None:
            matched_transaction.category_id = transfer_category_id

        seen_row_indexes.add(link.row_index)
        seen_transaction_ids.add(link.matched_transaction_id)


# ---------------------------------------------------------------------------
# AI Assist: parse CSV and return structured suggestions
# ---------------------------------------------------------------------------


@router.post(
    "/assist",
    response_model=ImportAssistResponse,
    dependencies=[Depends(verify_csrf)],
)
async def assist_import_csv(
    file: UploadFile,
    payload: str | None = Form(default=None),
    account_id: uuid.UUID | None = Query(default=None, alias="accountId"),
    parser_id: uuid.UUID | None = Query(default=None, alias="parserId"),
    debug: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportAssistResponse:
    """Parse a CSV and return optional AI suggestions for the selected rows."""

    assist_request = _parse_import_assist_payload(payload, account_id, parser_id)

    acct_result = await db.execute(
        select(Account).where(Account.id == assist_request.account_id, Account.user_id == user.id)
    )
    account = acct_result.scalar_one_or_none()
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    content = (await file.read()).decode("utf-8-sig")
    parser_config, _ = await _load_parser_config(db, user.id, assist_request.parser_id)
    uncategorized_category_id = await _load_uncategorized_category_id(db, user.id)
    parse_result = parse_csv_file(content, parser_config)
    if not parse_result.rows:
        return ImportAssistResponse(suggestions=[])

    selected_row_indexes = _normalize_selected_row_indexes(
        len(parse_result.rows),
        assist_request.row_indexes,
    )
    analysis_row_indexes = [
        row_index
        for row_index in selected_row_indexes
        if row_index < len(parse_result.rows)
        and not parse_result.rows[row_index].errors
        and parse_result.rows[row_index].description
        and parse_result.rows[row_index].date
    ]
    if not analysis_row_indexes:
        return ImportAssistResponse(suggestions=[])

    temp_import_batch_id = uuid.uuid4()
    txn_dicts, txn_dicts_by_row_index = await _build_transaction_dicts(
        db,
        user,
        parse_result,
        analysis_row_indexes,
        assist_request.account_id,
        temp_import_batch_id,
        account.currency,
    )

    rules = await _load_rule_dicts(db, user.id)
    if rules:
        run_result = apply_automation_rules(
            txn_dicts,
            rules,
            "on-import",
            {str(uncategorized_category_id)} if uncategorized_category_id else None,
        )
        for idx, updates in run_result.transaction_updates.items():
            for key, value in updates.items():
                txn_dicts[idx][key] = value

    categories, category_names_by_id = await _load_visible_categories_for_ai(db, user.id)
    history_examples = await _load_history_examples_for_ai(db, user.id)

    ai_rows = []
    for row_index in analysis_row_indexes:
        row = parse_result.rows[row_index]
        txn_dict = txn_dicts_by_row_index[row_index]
        current_category_id = txn_dict.get("category_id")
        ai_rows.append(
            {
                "rowIndex": row_index,
                "description": row.description[:160],
                "amount": str(row.amount),
                "currency": row.currency or account.currency,
                "date": row.date,
                "transactionType": "expense" if row.amount < 0 else "income",
                "currentCategoryId": current_category_id,
                "currentCategoryName": category_names_by_id.get(current_category_id) if current_category_id else None,
                "metadata": {
                    str(entry.get("key"))[:48]: str(entry.get("value"))[:80]
                    for entry in (row.metadata or [])
                    if isinstance(entry, dict) and entry.get("key") and entry.get("value")
                } if row.metadata else {},
            }
        )

    import_ai_start = time.monotonic()
    try:
        ai_result = await suggest_import_rows(
            api_key=settings.google_ai_api_key,
            model=settings.google_ai_model,
            timeout_seconds=settings.import_ai_timeout_seconds,
            account={
                "id": str(account.id),
                "name": account.name,
                "currency": account.currency,
            },
            preferred_language=user.preferred_language,
            translate_descriptions=user.ai_translate_descriptions,
            categories=categories,
            history=history_examples,
            rows=ai_rows,
            collect_debug=debug,
        )
    except ImportAiConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ImportAiResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except ImportAiError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    import_ai_duration_ms = int((time.monotonic() - import_ai_start) * 1000)

    debug_info: ImportAssistDebugInfo | None = None
    if debug and ai_result.debug_chunks:
        debug_info = ImportAssistDebugInfo(
            model=settings.google_ai_model,
            timeout_seconds=settings.import_ai_timeout_seconds,
            total_duration_ms=import_ai_duration_ms,
            chunks=[
                ImportAssistDebugChunk(
                    chunk_index=chunk.chunk_index,
                    row_indexes=chunk.row_indexes,
                    prompt=chunk.prompt,
                    raw_response_text=chunk.raw_response_text,
                    raw_api_response=chunk.raw_api_response,
                    parsed_suggestions_count=chunk.parsed_suggestions_count,
                    duration_ms=chunk.duration_ms,
                )
                for chunk in ai_result.debug_chunks
            ],
        )

    return ImportAssistResponse(
        suggestions=[
            ImportAssistSuggestionResponse(
                row_index=suggestion.row_index,
                cleaned_description=suggestion.cleaned_description,
                category_id=uuid.UUID(suggestion.category_id) if suggestion.category_id else None,
                category_name=category_names_by_id.get(suggestion.category_id) if suggestion.category_id else None,
                confidence=suggestion.confidence,
                reason=suggestion.reason,
                rule_keyword=suggestion.rule_keyword,
            )
            for suggestion in ai_result.suggestions
        ],
        debug=debug_info,
    )


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
    transfer_category_id = await _load_default_transfer_category_id(db, user.id)

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
    row_overrides = _normalize_row_overrides(
        selected_row_indexes,
        import_request.row_overrides,
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
        rules = await _load_rule_dicts(db, user.id)
        run_result = apply_automation_rules(
            txn_dicts,
            rules,
            "on-import",
            {str(uncategorized_category_id)} if uncategorized_category_id else None,
        )
        for idx, updates in run_result.transaction_updates.items():
            for key, value in updates.items():
                txn_dicts[idx][key] = value

    await _apply_row_overrides(
        db,
        user.id,
        txn_dicts_by_row_index,
        row_overrides,
    )

    await _apply_transfer_links(
        db,
        user,
        import_request.transfer_links,
        selected_row_indexes,
        txn_dicts_by_row_index,
        transfer_category_id,
        uncategorized_category_id,
    )
    _apply_transfer_category_fallback(
        txn_dicts,
        transfer_category_id,
        uncategorized_category_id,
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
