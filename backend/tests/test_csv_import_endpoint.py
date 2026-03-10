"""CSV import endpoint tests: preview and full import."""

import io

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SIMPLE_CSV = """Date,Description,Amount
2026-01-15,Grocery Store,-50.00
2026-01-16,Coffee Shop,-5.50
2026-01-17,Salary,3000.00
"""

SEMICOLON_CSV = """Date;Description;Amount
15.01.2026;Migros Einkauf;-42.50
16.01.2026;Kaffee;-4.20
"""


async def _create_account(client: AsyncClient, name: str = "Import Account") -> str:
    h = csrf_headers(client)
    resp = await client.post(
        "/api/accounts",
        json={"name": name, "type": "checking"},
        headers=h,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_parser(client: AsyncClient) -> str:
    """Create a CSV parser config and return its ID."""
    h = csrf_headers(client)
    parser_config = {
        "name": "Simple CSV",
        "config": {
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
        },
    }
    resp = await client.post("/api/csv-parsers", json=parser_config, headers=h)
    assert resp.status_code == 201
    return resp.json()["id"]


def _make_upload_file(content: str, filename: str = "test.csv"):
    """Create a file-like object for upload."""
    return ("file", (filename, io.BytesIO(content.encode("utf-8")), "text/csv"))


# ============================================================================
# Preview
# ============================================================================


class TestCsvPreview:
    """POST /api/import/preview"""

    async def test_preview_without_parser(self, authed_client: AsyncClient):
        """Preview with no parser returns raw rows."""
        resp = await authed_client.post(
            "/api/import/preview",
            files=[_make_upload_file(SIMPLE_CSV)],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rows"] == 3
        assert len(data["headers"]) == 3
        assert data["detected_delimiter"] == ","

    async def test_preview_with_parser(self, authed_client: AsyncClient):
        """Preview with parser returns parsed rows."""
        parser_id = await _create_parser(authed_client)
        resp = await authed_client.post(
            "/api/import/preview",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"parserId": parser_id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_rows"] == 3
        assert len(data["rows"]) == 3
        # Check first row is parsed correctly
        row0 = data["rows"][0]
        assert row0["description"] == "Grocery Store"
        assert row0["date"] == "2026-01-15"
        assert float(row0["amount"]) == -50.0

    async def test_preview_parser_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.post(
            "/api/import/preview",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"parserId": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code == 404


# ============================================================================
# Import
# ============================================================================


class TestCsvImport:
    """POST /api/import"""

    async def test_import_success(self, authed_client: AsyncClient):
        """Import CSV and verify transactions are created."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)
        h = csrf_headers(authed_client)

        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"accountId": acct_id, "parserId": parser_id},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 3
        descriptions = [t["description"] for t in data]
        assert "Grocery Store" in descriptions
        assert "Salary" in descriptions

        # All transactions belong to the same account
        for txn in data:
            assert txn["account_id"] == acct_id
            assert txn["import_batch_id"] is not None

    async def test_import_no_parser(self, authed_client: AsyncClient):
        """Import without parser config – no column mappings → should fail with 400."""
        acct_id = await _create_account(authed_client)
        h = csrf_headers(authed_client)

        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"accountId": acct_id},
            headers=h,
        )
        # Without parser, rows have no description/date → rejected
        assert resp.status_code == 400

    async def test_import_account_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"accountId": "00000000-0000-0000-0000-000000000000"},
            headers=h,
        )
        assert resp.status_code == 404

    async def test_import_creates_batch(self, authed_client: AsyncClient):
        """Verify import creates an import batch record."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)
        h = csrf_headers(authed_client)

        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"accountId": acct_id, "parserId": parser_id},
            headers=h,
        )
        assert resp.status_code == 201
        batch_id = resp.json()[0]["import_batch_id"]

        # Verify batch exists
        batches_resp = await authed_client.get("/api/import-batches")
        assert batches_resp.status_code == 200
        batches = batches_resp.json()
        assert any(b["id"] == batch_id for b in batches)

    async def test_import_with_rules(self, authed_client: AsyncClient):
        """Import with automation rules should categorize matching transactions."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)
        h = csrf_headers(authed_client)

        # Create a category
        cat_resp = await authed_client.post(
            "/api/categories",
            json={"name": "Food", "icon": "Apple"},
            headers=h,
        )
        # Category might already exist from seeding, handle both cases
        if cat_resp.status_code == 201:
            cat_id = cat_resp.json()["id"]
        else:
            # List categories and find Food
            cats = await authed_client.get("/api/categories")
            cat_id = next(c["id"] for c in cats.json() if c["name"] == "Food")

        # Create automation rule matching "Grocery"
        rule_payload = {
            "name": "Auto-food",
            "triggers": ["on-import"],
            "match_mode": "all",
            "conditions": [{"field": "description", "operator": "contains", "value": "Grocery"}],
            "actions": [{"type": "set-category", "category_id": cat_id}],
        }
        await authed_client.post("/api/automation-rules", json=rule_payload, headers=h)

        # Import
        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"accountId": acct_id, "parserId": parser_id, "applyRules": "true"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        grocery_txn = next(t for t in data if t["description"] == "Grocery Store")
        assert grocery_txn["category_id"] == cat_id

    async def test_import_csrf_required(self, authed_client: AsyncClient):
        """Import should require CSRF token."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)

        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"accountId": acct_id, "parserId": parser_id},
            # No CSRF headers
        )
        assert resp.status_code == 403

    async def test_import_empty_csv(self, authed_client: AsyncClient):
        """Import empty CSV should return 400."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)
        h = csrf_headers(authed_client)

        resp = await authed_client.post(
            "/api/import",
            files=[_make_upload_file("Date,Description,Amount\n")],
            params={"accountId": acct_id, "parserId": parser_id},
            headers=h,
        )
        assert resp.status_code == 400
