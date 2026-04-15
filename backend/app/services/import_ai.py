"""Cloud AI assistance for transaction imports."""

import asyncio
import json
import math
import socket
from collections.abc import Sequence
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from pydantic import BaseModel, Field

GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
MAX_ROWS_PER_REQUEST = 20
MAX_HISTORY_EXAMPLES = 24
TIMEOUT_SECONDS_PER_ADDITIONAL_CHUNK = 15
MAX_DYNAMIC_TIMEOUT_SECONDS = 180
LANGUAGE_NAMES = {
    "en": "English",
    "de": "German",
    "fr": "French",
}


class ImportAiError(RuntimeError):
    """Base error for import AI failures."""


class ImportAiConfigurationError(ImportAiError):
    """Raised when the AI client is not configured."""


class ImportAiResponseError(ImportAiError):
    """Raised when the AI provider returns an invalid response."""


class ImportAiSuggestion(BaseModel):
    """Structured AI suggestion for one parsed CSV row."""

    row_index: int = Field(ge=0)
    cleaned_description: str | None = None
    category_id: str | None = None
    confidence: float = Field(ge=0, le=1)
    reason: str = ""
    rule_keyword: str | None = None


def _strip_markdown_fence(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped

    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _build_prompt(
    *,
    account: dict[str, Any],
    preferences: dict[str, Any],
    categories: Sequence[dict[str, str]],
    history: Sequence[dict[str, str]],
    rows: Sequence[dict[str, Any]],
) -> str:
    instructions = {
        "role": "You improve transaction imports for a personal finance app.",
        "tasks": [
            "Clean merchant descriptions so they are short, human-friendly, and preserve the merchant/counterparty.",
            "Suggest a category only when currentCategoryId is null.",
            "Choose categoryId only from the provided categories.",
            "Return no suggestion for a row unless there is a meaningful improvement.",
            "Use confidence between 0 and 1.",
            "Provide a short reason.",
            "Provide a short lowercase ruleKeyword only when the category suggestion is strong enough to reuse for future imports.",
        ],
        "description_rules": [
            "Remove excess punctuation, all-caps noise, card suffixes, booking/reference fragments, and duplicated words.",
            "Keep stable merchant wording users would recognize later.",
            "Do not invent details that are not present in the row or history.",
            "Preserve merchant and brand names rather than translating them literally.",
            "If preferences.translateDescriptions is true, return cleaned descriptions in preferences.targetLanguageName.",
            "If preferences.translateDescriptions is false, keep cleaned descriptions in the source language.",
        ],
        "category_rules": [
            "Never invent categories or category IDs.",
            "Leave categoryId null if the best choice is unclear.",
            "Prefer categories consistent with the supplied history examples.",
        ],
        "output": {
            "format": "JSON object with a suggestions array",
            "suggestion_fields": [
                "rowIndex",
                "cleanedDescription",
                "categoryId",
                "confidence",
                "reason",
                "ruleKeyword",
            ],
        },
    }

    payload = {
        "instructions": instructions,
        "account": account,
        "preferences": preferences,
        "categories": list(categories),
        "historyExamples": list(history[:MAX_HISTORY_EXAMPLES]),
        "rows": list(rows),
    }

    return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


def _extract_response_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ImportAiResponseError("AI provider returned no candidates.")

    content = candidates[0].get("content")
    if not isinstance(content, dict):
        raise ImportAiResponseError("AI provider returned an invalid candidate payload.")

    parts = content.get("parts")
    if not isinstance(parts, list):
        raise ImportAiResponseError("AI provider returned no content parts.")

    text_parts = [part.get("text") for part in parts if isinstance(part, dict) and isinstance(part.get("text"), str)]
    if not text_parts:
        raise ImportAiResponseError("AI provider returned no text content.")

    return _strip_markdown_fence("\n".join(text_parts))


def _normalize_rule_keyword(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    normalized = " ".join(value.strip().lower().split())
    if not normalized:
        return None

    return normalized[:64]


def _normalize_description(value: Any, original: str) -> str | None:
    if not isinstance(value, str):
        return None

    normalized = " ".join(value.strip().split())
    if not normalized:
        return None

    if normalized.casefold() == " ".join(original.strip().split()).casefold():
        return None

    return normalized


def _normalize_reason(value: Any) -> str:
    if not isinstance(value, str):
        return ""

    return " ".join(value.strip().split())[:280]


def _normalize_confidence(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0

    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))

    if isinstance(value, str):
        try:
            return max(0.0, min(1.0, float(value.strip())))
        except ValueError:
            return 0.0

    return 0.0


def _compute_effective_timeout_seconds(
    base_timeout_seconds: int,
    total_row_count: int,
) -> int:
    if total_row_count <= 0:
        return base_timeout_seconds

    total_chunks = math.ceil(total_row_count / MAX_ROWS_PER_REQUEST)
    additional_timeout_seconds = max(0, total_chunks - 1) * TIMEOUT_SECONDS_PER_ADDITIONAL_CHUNK
    return min(
        MAX_DYNAMIC_TIMEOUT_SECONDS,
        base_timeout_seconds + additional_timeout_seconds,
    )


def _parse_suggestions(
    *,
    response_text: str,
    allowed_row_indexes: set[int],
    row_descriptions: dict[int, str],
    allowed_category_ids: set[str],
    uncategorized_row_indexes: set[int],
) -> list[ImportAiSuggestion]:
    try:
        raw_payload = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise ImportAiResponseError(f"AI provider returned invalid JSON: {exc.msg}") from exc

    if not isinstance(raw_payload, dict):
        raise ImportAiResponseError("AI provider returned a non-object JSON payload.")

    raw_suggestions = raw_payload.get("suggestions", [])
    if not isinstance(raw_suggestions, list):
        raise ImportAiResponseError("AI provider returned an invalid suggestions payload.")

    suggestions_by_row_index: dict[int, ImportAiSuggestion] = {}

    for raw_suggestion in raw_suggestions:
        if not isinstance(raw_suggestion, dict):
            continue

        row_index = raw_suggestion.get("rowIndex")
        if not isinstance(row_index, int) or row_index not in allowed_row_indexes:
            continue
        if row_index in suggestions_by_row_index:
            continue

        cleaned_description = _normalize_description(
            raw_suggestion.get("cleanedDescription"),
            row_descriptions[row_index],
        )

        category_id = raw_suggestion.get("categoryId")
        if not isinstance(category_id, str) or category_id not in allowed_category_ids:
            category_id = None
        elif row_index not in uncategorized_row_indexes:
            category_id = None

        if cleaned_description is None and category_id is None:
            continue

        suggestions_by_row_index[row_index] = ImportAiSuggestion(
            row_index=row_index,
            cleaned_description=cleaned_description,
            category_id=category_id,
            confidence=_normalize_confidence(raw_suggestion.get("confidence")),
            reason=_normalize_reason(raw_suggestion.get("reason")),
            rule_keyword=_normalize_rule_keyword(raw_suggestion.get("ruleKeyword")) if category_id else None,
        )

    return list(suggestions_by_row_index.values())


async def _request_suggestions_chunk(
    *,
    api_key: str,
    model: str,
    timeout_seconds: int,
    account: dict[str, Any],
    preferences: dict[str, Any],
    categories: Sequence[dict[str, str]],
    history: Sequence[dict[str, str]],
    rows: Sequence[dict[str, Any]],
    allowed_category_ids: set[str],
    uncategorized_row_indexes: set[int],
) -> list[ImportAiSuggestion]:
    prompt = _build_prompt(
        account=account,
        preferences=preferences,
        categories=categories,
        history=history,
        rows=rows,
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.15,
            "responseMimeType": "application/json",
        },
    }

    request_url = f"{GEMINI_API_BASE_URL}/{model}:generateContent?{urllib_parse.urlencode({'key': api_key})}"
    request_body = json.dumps(payload).encode("utf-8")

    def send_request() -> dict[str, Any]:
        request = urllib_request.Request(
            request_url,
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib_request.urlopen(request, timeout=timeout_seconds) as response:
                raw_body = response.read().decode("utf-8")
        except (TimeoutError, socket.timeout) as exc:
            raise ImportAiResponseError(
                f"AI provider timed out after {timeout_seconds} seconds while generating import suggestions."
            ) from exc
        except urllib_error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace").strip()
            raise ImportAiResponseError(
                f"AI provider request failed: {detail or f'HTTP {exc.code}'}"
            ) from exc
        except urllib_error.URLError as exc:
            raise ImportAiResponseError(f"AI provider request failed: {exc.reason}") from exc

        try:
            return json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ImportAiResponseError(
                f"AI provider returned invalid JSON: {exc.msg}"
            ) from exc

    response_payload = await asyncio.to_thread(send_request)
    response_text = _extract_response_text(response_payload)
    return _parse_suggestions(
        response_text=response_text,
        allowed_row_indexes={row["rowIndex"] for row in rows},
        row_descriptions={row["rowIndex"]: row["description"] for row in rows},
        allowed_category_ids=allowed_category_ids,
        uncategorized_row_indexes=uncategorized_row_indexes,
    )


async def suggest_import_rows(
    *,
    api_key: str | None,
    model: str,
    timeout_seconds: int,
    account: dict[str, Any],
    preferred_language: str,
    translate_descriptions: bool,
    categories: Sequence[dict[str, str]],
    history: Sequence[dict[str, str]],
    rows: Sequence[dict[str, Any]],
) -> list[ImportAiSuggestion]:
    """Request AI suggestions for parsed import rows."""

    if not api_key:
        raise ImportAiConfigurationError("Import AI assist is not configured.")

    if not rows:
        return []

    allowed_category_ids = {category["id"] for category in categories}
    uncategorized_row_indexes = {
        row["rowIndex"]
        for row in rows
        if row.get("currentCategoryId") is None
    }
    preferences = {
        "preferredLanguage": preferred_language,
        "targetLanguageName": LANGUAGE_NAMES.get(preferred_language, preferred_language),
        "translateDescriptions": translate_descriptions,
    }
    effective_timeout_seconds = _compute_effective_timeout_seconds(
        timeout_seconds,
        len(rows),
    )

    suggestions: list[ImportAiSuggestion] = []
    for offset in range(0, len(rows), MAX_ROWS_PER_REQUEST):
        row_chunk = rows[offset:offset + MAX_ROWS_PER_REQUEST]
        chunk_suggestions = await _request_suggestions_chunk(
            api_key=api_key,
            model=model,
            timeout_seconds=effective_timeout_seconds,
            account=account,
            preferences=preferences,
            categories=categories,
            history=history,
            rows=row_chunk,
            allowed_category_ids=allowed_category_ids,
            uncategorized_row_indexes=uncategorized_row_indexes,
        )
        suggestions.extend(chunk_suggestions)

    return suggestions
