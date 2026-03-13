"""Unit tests for CSV import service (parsing, delimiter detection, amounts)."""

from datetime import date, time
from decimal import Decimal

from app.services.csv_import import (
    apply_parser,
    detect_delimiter,
    parse_amount,
    parse_csv_file,
    parse_date,
    parse_raw_csv,
    parse_time,
)


# ============================================================================
# Delimiter detection
# ============================================================================


class TestDetectDelimiter:
    def test_comma(self):
        assert detect_delimiter("a,b,c\n1,2,3\n") == ","

    def test_semicolon(self):
        assert detect_delimiter("a;b;c\n1;2;3\n") == ";"

    def test_tab(self):
        assert detect_delimiter("a\tb\tc\n1\t2\t3\n") == "\t"

    def test_pipe(self):
        assert detect_delimiter("a|b|c\n1|2|3\n") == "|"

    def test_empty(self):
        assert detect_delimiter("") == ","


# ============================================================================
# Raw CSV parsing
# ============================================================================


class TestParseRawCsv:
    def test_simple(self):
        rows = parse_raw_csv("a,b,c\n1,2,3\n")
        assert len(rows) == 2
        assert rows[0] == ["a", "b", "c"]
        assert rows[1] == ["1", "2", "3"]

    def test_quoted_fields(self):
        rows = parse_raw_csv('a,"b,c",d\n1,"2,3",4\n')
        assert rows[0] == ["a", "b,c", "d"]
        assert rows[1] == ["1", "2,3", "4"]

    def test_empty_lines_skipped(self):
        rows = parse_raw_csv("a,b\n\n1,2\n\n")
        assert len(rows) == 2


# ============================================================================
# Date parsing
# ============================================================================


class TestParseDate:
    def test_iso(self):
        assert parse_date("2026-01-15", "YYYY-MM-DD") == date(2026, 1, 15)

    def test_european(self):
        assert parse_date("15.01.2026", "DD.MM.YYYY") == date(2026, 1, 15)

    def test_us(self):
        assert parse_date("01/15/2026", "MM/DD/YYYY") == date(2026, 1, 15)

    def test_short_year(self):
        assert parse_date("15.01.26", "DD.MM.YY") == date(2026, 1, 15)

    def test_invalid(self):
        assert parse_date("not-a-date", "YYYY-MM-DD") is None

    def test_empty(self):
        assert parse_date("", "YYYY-MM-DD") is None

    def test_invalid_date(self):
        assert parse_date("2026-02-30", "YYYY-MM-DD") is None


# ============================================================================
# Time parsing
# ============================================================================


class TestParseTime:
    def test_hh_mm(self):
        assert parse_time("14:30") == time(14, 30, 0)

    def test_hh_mm_ss(self):
        assert parse_time("14:30:45") == time(14, 30, 45)

    def test_empty(self):
        assert parse_time("") is None

    def test_invalid(self):
        assert parse_time("not-a-time") is None


# ============================================================================
# Amount parsing
# ============================================================================


class TestParseAmount:
    def test_simple_positive(self):
        assert parse_amount("42.50") == Decimal("42.50")

    def test_simple_negative(self):
        assert parse_amount("-42.50") == Decimal("-42.50")

    def test_comma_decimal(self):
        assert parse_amount("42,50", decimal_separator=",") == Decimal("42.50")

    def test_thousands_separator_dot(self):
        assert parse_amount("1,000.50") == Decimal("1000.50")

    def test_thousands_separator_comma(self):
        assert parse_amount("1.000,50", decimal_separator=",") == Decimal("1000.50")

    def test_parenthesized_negative(self):
        assert parse_amount("(42.50)") == Decimal("-42.50")

    def test_currency_symbol(self):
        assert parse_amount("CHF 42.50") == Decimal("42.50")
        assert parse_amount("$100.00") == Decimal("100.00")

    def test_plus_sign(self):
        assert parse_amount("+42.50") == Decimal("42.50")

    def test_empty(self):
        assert parse_amount("") is None

    def test_only_text(self):
        assert parse_amount("abc") is None


# ============================================================================
# Apply parser
# ============================================================================


class TestApplyParser:
    def _config(self, **extra):
        return {
            "delimiter": ",",
            "hasHeaderRow": True,
            "dateFormat": "YYYY-MM-DD",
            "decimalSeparator": ".",
            "amountFormat": "single",
            "timeMode": "none",
            "columnMappings": [
                {"field": "date", "columnIndices": [0]},
                {"field": "description", "columnIndices": [1]},
                {"field": "amount", "columnIndices": [2]},
            ],
            **extra,
        }

    def test_basic_parsing(self):
        headers = ["Date", "Description", "Amount"]
        rows = [
            ["2026-01-15", "Grocery Store", "-50.00"],
            ["2026-01-16", "Coffee Shop", "-5.50"],
        ]
        parsed = apply_parser(rows, headers, self._config())
        assert len(parsed) == 2
        assert parsed[0].description == "Grocery Store"
        assert parsed[0].date == "2026-01-15"
        assert parsed[0].amount == Decimal("-50.00")

    def test_debit_credit_format(self):
        config = self._config(
            amountFormat="debit-credit",
            columnMappings=[
                {"field": "date", "columnIndices": [0]},
                {"field": "description", "columnIndices": [1]},
                {"field": "debit", "columnIndices": [2]},
                {"field": "credit", "columnIndices": [3]},
            ],
        )
        headers = ["Date", "Description", "Debit", "Credit"]
        rows = [
            ["2026-01-15", "Purchase", "50.00", ""],
            ["2026-01-16", "Refund", "", "25.00"],
        ]
        parsed = apply_parser(rows, headers, config)
        assert parsed[0].amount == Decimal("-50.00")  # debit is negative
        assert parsed[1].amount == Decimal("25.00")  # credit is positive

    def test_multi_column_description(self):
        config = self._config(
            columnMappings=[
                {"field": "date", "columnIndices": [0]},
                {"field": "description", "columnIndices": [1, 2]},
                {"field": "amount", "columnIndices": [3]},
            ],
        )
        headers = ["Date", "Merchant", "Detail", "Amount"]
        rows = [["2026-01-15", "Migros", "Grocery", "-42.50"]]
        parsed = apply_parser(rows, headers, config)
        assert parsed[0].description == "Migros Grocery"

    def test_metadata_mappings(self):
        config = self._config(
            metadataMappings=[
                {"key": "merchant", "columnIndices": [3]},
            ],
        )
        headers = ["Date", "Description", "Amount", "Merchant"]
        rows = [["2026-01-15", "Purchase", "-42.50", "Migros"]]
        parsed = apply_parser(rows, headers, config)
        assert parsed[0].metadata is not None
        assert parsed[0].metadata[0]["key"] == "merchant"
        assert parsed[0].metadata[0]["value"] == "Migros"

    def test_raw_data_preserved(self):
        headers = ["Date", "Description", "Amount"]
        rows = [["2026-01-15", "Grocery", "-42.50"]]
        parsed = apply_parser(rows, headers, self._config())
        assert parsed[0].raw == {
            "Date": "2026-01-15",
            "Description": "Grocery",
            "Amount": "-42.50",
        }


# ============================================================================
# Full parse pipeline
# ============================================================================


class TestParseCsvFile:
    def test_without_parser(self):
        csv_content = "Date,Description,Amount\n2026-01-15,Test,-50\n"
        result = parse_csv_file(csv_content, None)
        assert result.total_rows == 1
        assert result.detected_delimiter == ","
        assert len(result.headers) == 3

    def test_with_parser(self):
        csv_content = "Date,Description,Amount\n2026-01-15,Test,-50\n"
        config = {
            "delimiter": ",",
            "hasHeaderRow": True,
            "skipRows": 0,
            "dateFormat": "YYYY-MM-DD",
            "decimalSeparator": ".",
            "amountFormat": "single",
            "timeMode": "none",
            "columnMappings": [
                {"field": "date", "columnIndices": [0]},
                {"field": "description", "columnIndices": [1]},
                {"field": "amount", "columnIndices": [2]},
            ],
        }
        result = parse_csv_file(csv_content, config)
        assert result.total_rows == 1
        assert len(result.rows) == 1
        assert result.rows[0].description == "Test"
        assert result.rows[0].date == "2026-01-15"

    def test_with_parser_applies_transforms(self):
        csv_content = "Date,Description,Amount\n2026-01-15,Purchase at Coffee Shop,-5.00\n"
        config = {
            "delimiter": ",",
            "has_header_row": True,
            "skip_rows": 0,
            "date_format": "YYYY-MM-DD",
            "decimal_separator": ".",
            "amount_format": "single",
            "time_mode": "none",
            "column_mappings": [
                {"field": "date", "column_indices": [0]},
                {"field": "description", "column_indices": [1]},
                {"field": "amount", "column_indices": [2]},
            ],
            "transforms": [
                {
                    "label": "Extract merchant",
                    "source_field": "description",
                    "target_field": "description",
                    "match_pattern": "Purchase",
                    "extract_pattern": r"Purchase at (?<merchant>.+)",
                    "replacement": "{{merchant}}",
                },
                {
                    "label": "Set category",
                    "source_field": "description",
                    "target_field": "category",
                    "match_pattern": ".*",
                    "extract_pattern": r"(?<kind>Coffee)",
                    "replacement": "{{kind}}",
                },
            ],
        }

        result = parse_csv_file(csv_content, config)

        assert result.rows[0].description == "Coffee Shop"
        assert result.rows[0].category == "Coffee"
        assert result.rows[0].errors == []

    def test_skip_rows(self):
        csv_content = "Bank Report\nAccount: CH123\nDate,Desc,Amt\n2026-01-15,Test,-50\n"
        config = {
            "delimiter": ",",
            "hasHeaderRow": True,
            "skipRows": 2,
            "dateFormat": "YYYY-MM-DD",
            "decimalSeparator": ".",
            "amountFormat": "single",
            "timeMode": "none",
            "columnMappings": [
                {"field": "date", "columnIndices": [0]},
                {"field": "description", "columnIndices": [1]},
                {"field": "amount", "columnIndices": [2]},
            ],
        }
        result = parse_csv_file(csv_content, config)
        assert result.skipped_rows == 2
        assert result.total_rows == 1
        assert result.rows[0].description == "Test"

    def test_empty_csv(self):
        result = parse_csv_file("", None)
        assert result.total_rows == 0
        assert result.rows == []

    def test_account_identifier_extraction(self):
        csv_content = "Report\nIBAN: CH12 3456 7890 1234 5678 9\nDate,Desc,Amt\n2026-01-15,Test,-50\n"
        config = {
            "delimiter": ",",
            "hasHeaderRow": True,
            "skipRows": 2,
            "dateFormat": "YYYY-MM-DD",
            "decimalSeparator": ".",
            "amountFormat": "single",
            "timeMode": "none",
            "columnMappings": [
                {"field": "date", "columnIndices": [0]},
                {"field": "description", "columnIndices": [1]},
                {"field": "amount", "columnIndices": [2]},
            ],
            "accountPattern": r"(CH[\d\s]+\d)",
        }
        result = parse_csv_file(csv_content, config)
        assert result.account_identifier is not None
        assert result.account_identifier.startswith("CH")
