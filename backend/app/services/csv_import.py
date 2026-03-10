"""CSV import service – server-side parsing.

Handles:
- Raw CSV parsing (RFC 4180)
- Delimiter detection
- Column mapping via parser config
- Amount parsing with configurable decimal separator
- Date/time parsing with configurable format
"""

import csv
import io
import re
from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


class ParsedRow(BaseModel):
    """Result of parsing a single CSV row."""

    description: str = ""
    transaction_id: str | None = None
    amount: Decimal = Decimal("0")
    date: str = ""  # ISO format YYYY-MM-DD
    time: str | None = None  # HH:mm:ss
    category: str | None = None
    currency: str | None = None
    metadata: list[dict[str, Any]] | None = None
    raw: dict[str, str] = {}
    errors: list[str] = []


class CsvParseResult(BaseModel):
    """Result of parsing a CSV file."""

    rows: list[ParsedRow]
    headers: list[str]
    total_rows: int
    error_count: int
    skipped_rows: int
    detected_delimiter: str
    account_identifier: str | None = None


# ---------------------------------------------------------------------------
# Delimiter detection
# ---------------------------------------------------------------------------

DELIMITERS = [",", ";", "\t", "|"]


def detect_delimiter(content: str) -> str:
    """Auto-detect CSV delimiter by counting occurrences in the first few lines."""
    lines = content.strip().split("\n")[:5]
    if not lines:
        return ","

    scores: dict[str, int] = {}
    for delim in DELIMITERS:
        counts = [line.count(delim) for line in lines]
        # Good delimiter: consistent count across lines
        if len(set(counts)) == 1 and counts[0] > 0:
            scores[delim] = counts[0] * 10  # bonus for consistency
        elif any(c > 0 for c in counts):
            scores[delim] = sum(counts)

    if not scores:
        return ","
    return max(scores, key=scores.get)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Raw CSV parsing (RFC 4180 via stdlib csv)
# ---------------------------------------------------------------------------


def parse_raw_csv(
    content: str, delimiter: str = ","
) -> list[list[str]]:
    """Parse CSV content into rows of string cells."""
    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    return [row for row in reader if any(cell.strip() for cell in row)]


# ---------------------------------------------------------------------------
# Date/time parsing
# ---------------------------------------------------------------------------

_DATE_TOKEN_MAP = {
    "DD": r"(?P<day>\d{1,2})",
    "MM": r"(?P<month>\d{1,2})",
    "YYYY": r"(?P<year>\d{4})",
    "YY": r"(?P<year2>\d{2})",
}


def _build_date_regex(fmt: str) -> re.Pattern[str]:
    """Build a regex from a date format string like DD.MM.YYYY."""
    pattern = re.escape(fmt)
    # Replace longest tokens first
    for token, regex in sorted(_DATE_TOKEN_MAP.items(), key=lambda x: -len(x[0])):
        pattern = pattern.replace(re.escape(token), regex)
    return re.compile(f"^{pattern}$")


def parse_date(value: str, fmt: str = "YYYY-MM-DD") -> date | None:
    """Parse a date string using a format like DD.MM.YYYY."""
    value = value.strip()
    if not value:
        return None

    regex = _build_date_regex(fmt)
    m = regex.match(value)
    if not m:
        return None

    groups = m.groupdict()
    year_str = groups.get("year") or groups.get("year2")
    if not year_str:
        return None
    year = int(year_str)
    if year < 100:
        year += 2000

    month = int(groups.get("month", 1))
    day = int(groups.get("day", 1))

    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_time(value: str, fmt: str = "HH:mm") -> time | None:
    """Parse a time string."""
    value = value.strip()
    if not value:
        return None

    # Simple extraction of HH, mm, ss
    parts = re.split(r"[:\s]", value)
    try:
        h = int(parts[0]) if len(parts) > 0 else 0
        m = int(parts[1]) if len(parts) > 1 else 0
        s = int(parts[2]) if len(parts) > 2 else 0
        return time(h, m, s)
    except (ValueError, IndexError):
        return None


# ---------------------------------------------------------------------------
# Amount parsing
# ---------------------------------------------------------------------------


def parse_amount(
    value: str,
    decimal_separator: str = ".",
) -> Decimal | None:
    """Parse a monetary amount string.

    Handles:
    - Configurable decimal separator (. or ,)
    - Thousands separators
    - Currency symbols (stripped)
    - Parentheses for negatives: (123.45) → -123.45
    """
    text = value.strip()
    if not text:
        return None

    # Check for parenthesized negatives
    is_negative = False
    if text.startswith("(") and text.endswith(")"):
        is_negative = True
        text = text[1:-1].strip()

    # Strip currency symbols and spaces
    text = re.sub(r"[A-Za-z$€£¥₣₹\s]", "", text)

    if not text:
        return None

    # Detect leading minus
    if text.startswith("-"):
        is_negative = not is_negative
        text = text[1:]
    elif text.startswith("+"):
        text = text[1:]

    # Normalize separators
    if decimal_separator == ",":
        # dots are thousands separators, comma is decimal
        text = text.replace(".", "").replace(",", ".")
    else:
        # commas are thousands separators, dot is decimal
        text = text.replace(",", "")

    # Remove any remaining non-numeric chars except dot and minus
    text = re.sub(r"[^\d.]", "", text)

    if not text:
        return None

    try:
        result = Decimal(text)
        return -result if is_negative else result
    except InvalidOperation:
        return None


# ---------------------------------------------------------------------------
# Apply parser config to CSV rows
# ---------------------------------------------------------------------------


def apply_parser(
    rows: list[list[str]],
    headers: list[str],
    parser_config: dict[str, Any],
) -> list[ParsedRow]:
    """Apply a parser configuration to CSV rows and produce ParsedRow list."""
    column_mappings: list[dict[str, Any]] = parser_config.get("columnMappings") or parser_config.get("column_mappings") or []
    date_format: str = parser_config.get("dateFormat") or parser_config.get("date_format") or "YYYY-MM-DD"
    decimal_sep: str = parser_config.get("decimalSeparator") or parser_config.get("decimal_separator") or "."
    amount_format: str = parser_config.get("amountFormat") or parser_config.get("amount_format") or "single"
    time_mode: str = parser_config.get("timeMode") or parser_config.get("time_mode") or "none"
    time_format: str = parser_config.get("timeFormat") or parser_config.get("time_format") or "HH:mm"
    multi_sep: str = parser_config.get("multiColumnSeparator") or parser_config.get("multi_column_separator") or " "
    metadata_mappings: list[dict[str, Any]] = parser_config.get("metadataMappings") or parser_config.get("metadata_mappings") or []

    # Build field → column index mapping
    field_map: dict[str, list[int]] = {}
    for mapping in column_mappings:
        field = mapping.get("field", "")
        indices = mapping.get("columnIndices") or mapping.get("column_indices") or []
        if field and indices:
            field_map[field] = indices

    parsed: list[ParsedRow] = []

    for row in rows:
        errors: list[str] = []
        raw: dict[str, str] = {}
        for i, cell in enumerate(row):
            header = headers[i] if i < len(headers) else f"col_{i}"
            raw[header] = cell

        # Extract mapped fields
        def _get_multi(field_name: str) -> str:
            indices = field_map.get(field_name, [])
            parts = [row[i].strip() for i in indices if i < len(row)]
            return multi_sep.join(p for p in parts if p)

        def _get_single(field_name: str) -> str:
            indices = field_map.get(field_name, [])
            if indices and indices[0] < len(row):
                return row[indices[0]].strip()
            return ""

        # Description (multi-column)
        description = _get_multi("description")

        # Transaction ID
        transaction_id = _get_single("transactionId") or _get_single("transaction_id") or None

        # Date
        date_str = _get_single("date")
        parsed_date = parse_date(date_str, date_format)
        if parsed_date is None and date_str:
            errors.append(f"Could not parse date: {date_str}")

        # Time
        parsed_time: time | None = None
        if time_mode == "separate-column" or time_mode == "separate_column":
            time_str = _get_single("time")
            if time_str:
                parsed_time = parse_time(time_str, time_format)

        # Amount
        amount = Decimal("0")
        if amount_format == "single":
            amount_str = _get_single("amount")
            parsed_amount = parse_amount(amount_str, decimal_sep)
            if parsed_amount is not None:
                amount = parsed_amount
            elif amount_str:
                errors.append(f"Could not parse amount: {amount_str}")
        elif amount_format == "debit-credit" or amount_format == "debit_credit":
            debit_str = _get_single("debit")
            credit_str = _get_single("credit")
            debit = parse_amount(debit_str, decimal_sep) if debit_str else None
            credit = parse_amount(credit_str, decimal_sep) if credit_str else None
            if debit is not None and debit != 0:
                amount = -abs(debit)
            elif credit is not None:
                amount = abs(credit)
        elif amount_format == "amount-type" or amount_format == "amount_type":
            amount_str = _get_single("amount")
            type_str = _get_single("amountType") or _get_single("amount_type")
            parsed_amount = parse_amount(amount_str, decimal_sep)
            if parsed_amount is not None:
                type_lower = type_str.lower().strip()
                if type_lower in ("debit", "d", "expense", "out", "withdrawal"):
                    amount = -abs(parsed_amount)
                else:
                    amount = abs(parsed_amount)
            elif amount_str:
                errors.append(f"Could not parse amount: {amount_str}")

        # Category (multi-column)
        category = _get_multi("category") or None

        # Currency
        currency = _get_single("currency") or None

        # Metadata
        metadata: list[dict[str, Any]] | None = None
        if metadata_mappings:
            meta_entries = []
            for mm in metadata_mappings:
                key = mm.get("key", "")
                m_indices = mm.get("columnIndices") or mm.get("column_indices") or []
                parts = [row[i].strip() for i in m_indices if i < len(row)]
                value = " ".join(p for p in parts if p)
                if key and value:
                    meta_entries.append({"key": key, "value": value})
            if meta_entries:
                metadata = meta_entries

        parsed.append(
            ParsedRow(
                description=description,
                transaction_id=transaction_id,
                amount=amount,
                date=parsed_date.isoformat() if parsed_date else "",
                time=parsed_time.isoformat() if parsed_time else None,
                category=category,
                currency=currency,
                metadata=metadata,
                raw=raw,
                errors=errors,
            )
        )

    return parsed


# ---------------------------------------------------------------------------
# Account identifier extraction
# ---------------------------------------------------------------------------


def extract_account_identifier(
    skipped_rows: list[list[str]], pattern: str | None
) -> str | None:
    """Extract an account identifier (e.g. IBAN) from skipped header rows."""
    if not pattern or not skipped_rows:
        return None

    try:
        regex = re.compile(pattern)
    except re.error:
        return None

    for row in skipped_rows:
        for cell in row:
            m = regex.search(cell)
            if m:
                return m.group(0) if not m.groups() else m.group(1)

    return None


# ---------------------------------------------------------------------------
# Full CSV parse pipeline
# ---------------------------------------------------------------------------


def parse_csv_file(
    content: str,
    parser_config: dict[str, Any] | None = None,
) -> CsvParseResult:
    """Parse a CSV file into structured rows using optional parser config.

    If no parser config is provided, produces raw rows with auto-detected delimiter.
    """
    delimiter = (
        parser_config.get("delimiter") if parser_config else None
    ) or detect_delimiter(content)

    all_rows = parse_raw_csv(content, delimiter)
    if not all_rows:
        return CsvParseResult(
            rows=[],
            headers=[],
            total_rows=0,
            error_count=0,
            skipped_rows=0,
            detected_delimiter=delimiter,
        )

    skip_count = 0
    has_header = True
    if parser_config:
        skip_count = parser_config.get("skipRows") or parser_config.get("skip_rows") or 0
        has_header = parser_config.get("hasHeaderRow", parser_config.get("has_header_row", True))

    skipped = all_rows[:skip_count]
    remaining = all_rows[skip_count:]

    headers: list[str] = []
    data_rows: list[list[str]] = remaining

    if has_header and remaining:
        headers = remaining[0]
        data_rows = remaining[1:]
    elif remaining:
        # No header row – generate column names
        headers = [f"col_{i}" for i in range(len(remaining[0]))]

    # Extract account identifier
    account_id = None
    if parser_config:
        acc_pattern = parser_config.get("accountPattern") or parser_config.get("account_pattern")
        account_id = extract_account_identifier(skipped, acc_pattern)

    if parser_config:
        parsed = apply_parser(data_rows, headers, parser_config)
    else:
        # No parser – return raw rows as ParsedRow with minimal info
        parsed = []
        for row in data_rows:
            raw = {
                headers[i] if i < len(headers) else f"col_{i}": cell
                for i, cell in enumerate(row)
            }
            parsed.append(ParsedRow(raw=raw))

    error_count = sum(1 for r in parsed if r.errors)

    return CsvParseResult(
        rows=parsed,
        headers=headers,
        total_rows=len(data_rows),
        error_count=error_count,
        skipped_rows=skip_count,
        detected_delimiter=delimiter,
        account_identifier=account_id,
    )
