"""Transaction CRUD endpoint tests (filtering, pagination, bulk, tags)."""

import pytest_asyncio
from httpx import AsyncClient

from tests.conftest import TEST_USER, csrf_headers


# ---------------------------------------------------------------------------
# Helpers: create prerequisite account/category
# ---------------------------------------------------------------------------


async def _create_account(client: AsyncClient, name: str = "Test Account") -> str:
    """Create an account and return its UUID string."""
    h = csrf_headers(client)
    resp = await client.post(
        "/api/accounts",
        json={"name": name, "type": "checking"},
        headers=h,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_transaction(
    client: AsyncClient,
    account_id: str,
    *,
    amount: str = "-25.50",
    description: str = "Groceries",
    date: str = "2026-01-15",
    **extra,
) -> dict:
    """Create a transaction and return its response dict."""
    h = csrf_headers(client)
    payload = {
        "amount": amount,
        "currency": "CHF",
        "description": description,
        "date": date,
        "account_id": account_id,
        **extra,
    }
    resp = await client.post("/api/transactions", json=payload, headers=h)
    assert resp.status_code == 201
    return resp.json()


# ============================================================================
# Create
# ============================================================================


class TestCreateTransaction:
    """POST /api/transactions"""

    async def test_create_success(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        txn = await _create_transaction(authed_client, account_id)

        assert txn["amount"] == "-25.50"
        assert txn["description"] == "Groceries"
        assert txn["date"] == "2026-01-15"
        assert txn["account_id"] == account_id
        assert txn["tag_ids"] == []
        assert "id" in txn

    async def test_create_with_tags(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)

        # Create tags
        t1 = await authed_client.post("/api/tags", json={"name": "food"}, headers=h)
        t2 = await authed_client.post("/api/tags", json={"name": "weekly"}, headers=h)
        tag_ids = [t1.json()["id"], t2.json()["id"]]

        txn = await _create_transaction(
            authed_client, account_id, tag_ids=tag_ids
        )
        assert set(txn["tag_ids"]) == set(tag_ids)

    async def test_create_missing_required(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/transactions",
            json={"amount": "10"},  # missing currency, description, date, account_id
            headers=h,
        )
        assert resp.status_code == 422


# ============================================================================
# Get by ID
# ============================================================================


class TestGetTransaction:
    """GET /api/transactions/{id}"""

    async def test_get_success(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        txn = await _create_transaction(authed_client, account_id)

        resp = await authed_client.get(f"/api/transactions/{txn['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == txn["id"]

    async def test_get_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.get(
            "/api/transactions/00000000-0000-0000-0000-000000000000"
        )
        assert resp.status_code == 404


# ============================================================================
# Update
# ============================================================================


class TestUpdateTransaction:
    """PUT /api/transactions/{id}"""

    async def test_update_partial(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)
        txn = await _create_transaction(authed_client, account_id)

        resp = await authed_client.put(
            f"/api/transactions/{txn['id']}",
            json={"description": "Updated groceries", "amount": "-30.00"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated groceries"
        assert resp.json()["amount"] == "-30.00"

    async def test_update_tags(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)
        txn = await _create_transaction(authed_client, account_id)

        tag = await authed_client.post("/api/tags", json={"name": "updated"}, headers=h)
        tag_id = tag.json()["id"]

        resp = await authed_client.put(
            f"/api/transactions/{txn['id']}",
            json={"tag_ids": [tag_id]},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["tag_ids"] == [tag_id]

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/transactions/00000000-0000-0000-0000-000000000000",
            json={"description": "ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteTransaction:
    """DELETE /api/transactions/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)
        txn = await _create_transaction(authed_client, account_id)

        resp = await authed_client.delete(
            f"/api/transactions/{txn['id']}", headers=h
        )
        assert resp.status_code == 204

        get_resp = await authed_client.get(f"/api/transactions/{txn['id']}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/transactions/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# List with Pagination
# ============================================================================


class TestListTransactions:
    """GET /api/transactions"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    async def test_list_pagination(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        # Create 3 transactions
        for i in range(3):
            await _create_transaction(
                authed_client, account_id,
                description=f"Txn {i}",
                date=f"2026-01-{15 + i:02d}",
            )

        # Page 1, size 2
        resp = await authed_client.get("/api/transactions?page=1&pageSize=2")
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3
        assert data["total_pages"] == 2

        # Page 2
        resp = await authed_client.get("/api/transactions?page=2&pageSize=2")
        data = resp.json()
        assert len(data["items"]) == 1

    async def test_list_large_page_size(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        for i in range(3):
            await _create_transaction(
                authed_client,
                account_id,
                description=f"Txn {i}",
                date=f"2026-01-{15 + i:02d}",
            )

        resp = await authed_client.get("/api/transactions?page=1&pageSize=10000")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 3
        assert data["page_size"] == 10000

    async def test_list_search_filter(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        await _create_transaction(authed_client, account_id, description="Coffee shop")
        await _create_transaction(authed_client, account_id, description="Rent payment")

        resp = await authed_client.get("/api/transactions?search=coffee")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["description"] == "Coffee shop"

    async def test_list_type_filter(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        # Income (positive amount, no transfer)
        await _create_transaction(
            authed_client, account_id, amount="500", description="Salary"
        )
        # Expense (negative amount, no transfer)
        await _create_transaction(
            authed_client, account_id, amount="-50", description="Lunch"
        )

        resp = await authed_client.get("/api/transactions?type=income")
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["description"] == "Salary"

        resp = await authed_client.get("/api/transactions?type=expense")
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["description"] == "Lunch"

    async def test_list_date_range_filter(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        await _create_transaction(
            authed_client, account_id, date="2026-01-01", description="Jan"
        )
        await _create_transaction(
            authed_client, account_id, date="2026-02-01", description="Feb"
        )
        await _create_transaction(
            authed_client, account_id, date="2026-03-01", description="Mar"
        )

        resp = await authed_client.get(
            "/api/transactions?startDate=2026-01-15&endDate=2026-02-15"
        )
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["description"] == "Feb"

    async def test_list_sort_by_amount(self, authed_client: AsyncClient):
        account_id = await _create_account(authed_client)
        await _create_transaction(
            authed_client, account_id, amount="-100", description="Big"
        )
        await _create_transaction(
            authed_client, account_id, amount="-10", description="Small"
        )

        resp = await authed_client.get(
            "/api/transactions?sortBy=amount&sortOrder=asc"
        )
        items = resp.json()["items"]
        assert items[0]["description"] == "Big"  # -100 < -10
        assert items[1]["description"] == "Small"

    async def test_list_account_filter(self, authed_client: AsyncClient):
        acc1 = await _create_account(authed_client, "Account 1")
        acc2 = await _create_account(authed_client, "Account 2")
        await _create_transaction(authed_client, acc1, description="From acc1")
        await _create_transaction(authed_client, acc2, description="From acc2")

        resp = await authed_client.get(f"/api/transactions?accountId={acc1}")
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["description"] == "From acc1"


# ============================================================================
# Bulk Create
# ============================================================================


class TestBulkCreateTransactions:
    """POST /api/transactions/bulk"""

    async def test_bulk_create(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)

        payload = {
            "transactions": [
                {
                    "amount": "-10",
                    "currency": "CHF",
                    "description": "Bulk 1",
                    "date": "2026-01-01",
                    "account_id": account_id,
                },
                {
                    "amount": "-20",
                    "currency": "CHF",
                    "description": "Bulk 2",
                    "date": "2026-01-02",
                    "account_id": account_id,
                },
            ]
        }
        resp = await authed_client.post(
            "/api/transactions/bulk", json=payload, headers=h
        )
        assert resp.status_code == 201
        assert len(resp.json()) == 2


# ============================================================================
# Bulk Delete
# ============================================================================


class TestBulkDeleteTransactions:
    """DELETE /api/transactions/bulk"""

    async def test_bulk_delete(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)

        txn1 = await _create_transaction(
            authed_client, account_id, description="Del 1"
        )
        txn2 = await _create_transaction(
            authed_client, account_id, description="Del 2"
        )

        resp = await authed_client.request(
            "DELETE",
            "/api/transactions/bulk",
            json={"ids": [txn1["id"], txn2["id"]]},
            headers=h,
        )
        assert resp.status_code == 204

        # Verify both gone
        list_resp = await authed_client.get("/api/transactions")
        assert list_resp.json()["total"] == 0

    async def test_bulk_delete_partial_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)
        txn = await _create_transaction(authed_client, account_id)

        resp = await authed_client.request(
            "DELETE",
            "/api/transactions/bulk",
            json={"ids": [txn["id"], "00000000-0000-0000-0000-000000000000"]},
            headers=h,
        )
        assert resp.status_code == 404
