"""CSV import endpoint tests: preview and full import."""

import io
import json

from httpx import AsyncClient

from app.routers import csv_import as csv_import_router
from app.services.import_ai import ImportAiSuggestion
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

CSV_WITH_IBAN_HEADER = """Report,Export
IBAN,CH93 0076 2011 6238 5295 7
Date,Description,Amount
2026-01-15,Grocery Store,-50.00
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


async def _seed_minimal_categories(client: AsyncClient) -> list[dict]:
    resp = await client.post(
        "/api/categories/seed",
        json={"preset": "minimal"},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    categories_resp = await client.get("/api/categories")
    assert categories_resp.status_code == 200
    return categories_resp.json()


async def _create_parser(
    client: AsyncClient,
    *,
    config_override: dict | None = None,
) -> str:
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
    if config_override:
        parser_config["config"].update(config_override)
    resp = await client.post("/api/csv-parsers", json=parser_config, headers=h)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_transaction(
    client: AsyncClient,
    *,
    account_id: str,
    amount: str,
    date: str,
    currency: str = "CHF",
    description: str = "Existing transaction",
    transfer_pair_id: str | None = None,
    transfer_pair_role: str | None = None,
) -> dict:
    h = csrf_headers(client)
    resp = await client.post(
        "/api/transactions",
        json={
            "amount": amount,
            "currency": currency,
            "description": description,
            "date": date,
            "account_id": account_id,
            "transfer_pair_id": transfer_pair_id,
            "transfer_pair_role": transfer_pair_role,
        },
        headers=h,
    )
    assert resp.status_code == 201
    return resp.json()


def _make_upload_file(content: str, filename: str = "test.csv"):
    """Create a file-like object for upload."""
    return ("file", (filename, io.BytesIO(content.encode("utf-8")), "text/csv"))


def _camel_to_snake(value: str) -> str:
    result: list[str] = []
    for char in value:
        if char.isupper():
            result.append(f"_{char.lower()}")
        else:
            result.append(char)
    return "".join(result)


def _transform_payload_keys(value):
    if isinstance(value, list):
        return [_transform_payload_keys(item) for item in value]
    if isinstance(value, dict):
        return {
            _camel_to_snake(key): _transform_payload_keys(item)
            for key, item in value.items()
        }
    return value


async def _post_import_with_payload(
    client: AsyncClient,
    csv_content: str,
    payload: dict,
):
    return await client.post(
        "/api/import",
        files=[
            _make_upload_file(csv_content),
            ("payload", (None, json.dumps(_transform_payload_keys(payload)))),
        ],
        headers=csrf_headers(client),
    )


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

    async def test_preview_with_parser_returns_account_identifier(self, authed_client: AsyncClient):
        parser_id = await _create_parser(
            authed_client,
            config_override={
                "skipRows": 2,
                "accountPattern": "IBAN",
            },
        )

        resp = await authed_client.post(
            "/api/import/preview",
            files=[_make_upload_file(CSV_WITH_IBAN_HEADER)],
            params={"parserId": parser_id},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["account_identifier"] == "CH93 0076 2011 6238 5295 7"

    async def test_preview_parser_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.post(
            "/api/import/preview",
            files=[_make_upload_file(SIMPLE_CSV)],
            params={"parserId": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code == 404


# ============================================================================
# AI assist
# ============================================================================


class TestCsvImportAssist:
    """POST /api/import/assist"""

    async def test_assist_returns_structured_suggestions(
        self,
        authed_client: AsyncClient,
        monkeypatch,
    ):
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)

        category_resp = await authed_client.post(
            "/api/categories",
            json={"name": "Food", "icon": "Apple"},
            headers=csrf_headers(authed_client),
        )
        assert category_resp.status_code == 201
        category_id = category_resp.json()["id"]

        async def fake_suggest_import_rows(**kwargs):
            rows = kwargs["rows"]
            assert rows[0]["description"] == "Grocery Store"
            assert rows[0]["currentCategoryId"] is None
            return [
                ImportAiSuggestion(
                    row_index=0,
                    cleaned_description="Migros Basel",
                    category_id=category_id,
                    confidence=0.94,
                    reason="Known grocery merchant",
                    rule_keyword="migros",
                )
            ]

        monkeypatch.setattr(csv_import_router, "suggest_import_rows", fake_suggest_import_rows)

        resp = await authed_client.post(
            "/api/import/assist",
            files=[
                _make_upload_file(SIMPLE_CSV),
                (
                    "payload",
                    (
                        None,
                        json.dumps(
                            _transform_payload_keys(
                                {
                                    "accountId": acct_id,
                                    "parserId": parser_id,
                                    "rowIndexes": [0],
                                }
                            )
                        ),
                    ),
                ),
            ],
            headers=csrf_headers(authed_client),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == 1
        suggestion = data["suggestions"][0]
        assert suggestion["row_index"] == 0
        assert suggestion["cleaned_description"] == "Migros Basel"
        assert suggestion["category_id"] == category_id
        assert suggestion["category_name"] == "Food"
        assert suggestion["rule_keyword"] == "migros"


# ============================================================================
# Import
# ============================================================================


class TestCsvImport:
    """POST /api/import"""

    async def test_import_success(self, authed_client: AsyncClient):
        """Import CSV and verify transactions are created."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
            },
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

    async def test_import_defaults_to_uncategorized_category(self, authed_client: AsyncClient):
        """Imported rows without a matched category should use the hidden Uncategorized category."""
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)

        categories_resp = await authed_client.get("/api/categories")
        assert categories_resp.status_code == 200
        uncategorized_id = next(
            category["id"]
            for category in categories_resp.json()
            if category["name"] == "Uncategorized"
        )

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
            },
        )
        assert resp.status_code == 201

        data = resp.json()
        assert len(data) == 3
        assert all(txn["category_id"] == uncategorized_id for txn in data)

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

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "importName": "January import",
                "selectedRowIndexes": [0, 2],
            },
        )
        assert resp.status_code == 201
        batch_id = resp.json()[0]["import_batch_id"]

        # Verify batch exists
        batches_resp = await authed_client.get("/api/import-batches")
        assert batches_resp.status_code == 200
        batches = batches_resp.json()
        batch = next(b for b in batches if b["id"] == batch_id)
        assert batch["name"] == "January import"
        assert batch["row_count"] == 2

    async def test_import_with_rules(self, authed_client: AsyncClient):
        """Import with automation rules should categorize matching transactions."""
        acct_id = await _create_account(authed_client)
        linked_acct_id = await _create_account(authed_client, name="Transfer Match")
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

        existing_txn = await _create_transaction(
            authed_client,
            account_id=linked_acct_id,
            amount="50.00",
            date="2026-01-15",
            description="Transfer arrival",
        )

        # Import
        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "applyRules": True,
                "selectedRowIndexes": [0],
                "transferLinks": [
                    {
                        "rowIndex": 0,
                        "matchedTransactionId": existing_txn["id"],
                    }
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        grocery_txn = next(t for t in data if t["description"] == "Grocery Store")
        assert grocery_txn["category_id"] == cat_id
        assert grocery_txn["transfer_pair_id"] is not None
        assert grocery_txn["transfer_pair_role"] == "source"

        existing_txn_resp = await authed_client.get(f"/api/transactions/{existing_txn['id']}")
        assert existing_txn_resp.status_code == 200
        existing_linked = existing_txn_resp.json()
        assert existing_linked["transfer_pair_id"] == grocery_txn["transfer_pair_id"]
        assert existing_linked["transfer_pair_role"] == "destination"

    async def test_import_row_overrides_win_after_rules(self, authed_client: AsyncClient):
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)
        h = csrf_headers(authed_client)

        auto_category_resp = await authed_client.post(
            "/api/categories",
            json={"name": "Auto Food", "icon": "Apple"},
            headers=h,
        )
        assert auto_category_resp.status_code == 201
        auto_category_id = auto_category_resp.json()["id"]

        override_category_resp = await authed_client.post(
            "/api/categories",
            json={"name": "Manual Grocery", "icon": "ShoppingBasket"},
            headers=h,
        )
        assert override_category_resp.status_code == 201
        override_category_id = override_category_resp.json()["id"]

        rule_payload = {
            "name": "Auto-food",
            "triggers": ["on-import"],
            "match_mode": "all",
            "conditions": [{"field": "description", "operator": "contains", "value": "Grocery"}],
            "actions": [{"type": "set-category", "category_id": auto_category_id}],
        }
        rule_resp = await authed_client.post("/api/automation-rules", json=rule_payload, headers=h)
        assert rule_resp.status_code == 201

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "selectedRowIndexes": [0],
                "rowOverrides": [
                    {
                        "rowIndex": 0,
                        "description": "Migros Basel",
                        "categoryId": override_category_id,
                    }
                ],
            },
        )

        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 1
        assert data[0]["description"] == "Migros Basel"
        assert data[0]["category_id"] == override_category_id

    async def test_import_transfer_links_use_transfer_category_for_uncategorized(self, authed_client: AsyncClient):
        acct_id = await _create_account(authed_client)
        linked_acct_id = await _create_account(authed_client, name="Transfer Destination")
        parser_id = await _create_parser(authed_client)
        categories = await _seed_minimal_categories(authed_client)

        transfer_category_id = next(
            category["id"]
            for category in categories
            if category["name"] == "Transfer"
        )
        uncategorized_category_id = next(
            category["id"]
            for category in categories
            if category["name"] == "Uncategorized"
        )

        existing_txn = await _create_transaction(
            authed_client,
            account_id=linked_acct_id,
            amount="50.00",
            date="2026-01-15",
            description="Transfer arrival",
        )
        assert existing_txn["category_id"] is None

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "selectedRowIndexes": [0],
                "transferLinks": [
                    {
                        "rowIndex": 0,
                        "matchedTransactionId": existing_txn["id"],
                    }
                ],
            },
        )

        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 1
        imported_txn = data[0]
        assert imported_txn["transfer_pair_id"] is not None
        assert imported_txn["transfer_pair_role"] == "source"
        assert imported_txn["category_id"] == transfer_category_id
        assert imported_txn["category_id"] != uncategorized_category_id

        existing_txn_resp = await authed_client.get(f"/api/transactions/{existing_txn['id']}")
        assert existing_txn_resp.status_code == 200
        existing_linked = existing_txn_resp.json()
        assert existing_linked["transfer_pair_id"] == imported_txn["transfer_pair_id"]
        assert existing_linked["transfer_pair_role"] == "destination"
        assert existing_linked["category_id"] == transfer_category_id

    async def test_import_rejects_invalid_selected_row_index(self, authed_client: AsyncClient):
        acct_id = await _create_account(authed_client)
        parser_id = await _create_parser(authed_client)

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "selectedRowIndexes": [99],
            },
        )
        assert resp.status_code == 400
        assert "out of range" in resp.json()["detail"]

    async def test_import_rejects_already_linked_transfer_target(self, authed_client: AsyncClient):
        acct_id = await _create_account(authed_client)
        linked_acct_id = await _create_account(authed_client, name="Linked Target")
        parser_id = await _create_parser(authed_client)

        existing_txn = await _create_transaction(
            authed_client,
            account_id=linked_acct_id,
            amount="50.00",
            date="2026-01-15",
            description="Existing linked transaction",
            transfer_pair_id="transfer-pair-existing",
            transfer_pair_role="destination",
        )

        resp = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "selectedRowIndexes": [0],
                "transferLinks": [
                    {
                        "rowIndex": 0,
                        "matchedTransactionId": existing_txn["id"],
                    }
                ],
            },
        )
        assert resp.status_code == 400
        assert "already belongs to a transfer pair" in resp.json()["detail"]

    async def test_import_can_relink_after_deleting_import_batch(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        acct_id = await _create_account(authed_client)
        linked_acct_id = await _create_account(authed_client, name="Relink Target")
        parser_id = await _create_parser(authed_client)

        existing_txn = await _create_transaction(
            authed_client,
            account_id=linked_acct_id,
            amount="50.00",
            date="2026-01-15",
            description="Existing relink target",
        )

        first_import = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "selectedRowIndexes": [0],
                "transferLinks": [
                    {
                        "rowIndex": 0,
                        "matchedTransactionId": existing_txn["id"],
                    }
                ],
            },
        )
        assert first_import.status_code == 201
        first_imported_txn = first_import.json()[0]
        assert first_imported_txn["transfer_pair_id"] is not None

        delete_batch_resp = await authed_client.delete(
            f"/api/import-batches/{first_imported_txn['import_batch_id']}",
            headers=h,
        )
        assert delete_batch_resp.status_code == 204

        existing_txn_resp = await authed_client.get(f"/api/transactions/{existing_txn['id']}")
        assert existing_txn_resp.status_code == 200
        existing_cleared = existing_txn_resp.json()
        assert existing_cleared["transfer_pair_id"] is None
        assert existing_cleared["transfer_pair_role"] is None

        second_import = await _post_import_with_payload(
            authed_client,
            SIMPLE_CSV,
            {
                "accountId": acct_id,
                "parserId": parser_id,
                "selectedRowIndexes": [0],
                "transferLinks": [
                    {
                        "rowIndex": 0,
                        "matchedTransactionId": existing_txn["id"],
                    }
                ],
            },
        )
        assert second_import.status_code == 201
        second_imported_txn = second_import.json()[0]
        assert second_imported_txn["transfer_pair_id"] is not None
        assert second_imported_txn["transfer_pair_role"] == "source"

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
