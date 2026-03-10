"""Account CRUD endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ============================================================================
# List
# ============================================================================


class TestListAccounts:
    """GET /api/accounts"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/accounts")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_created(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        await authed_client.post(
            "/api/accounts",
            json={"name": "Checking", "type": "checking"},
            headers=h,
        )
        resp = await authed_client.get("/api/accounts")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "Checking"

    async def test_list_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/accounts")
        assert resp.status_code == 401


# ============================================================================
# Create
# ============================================================================


class TestCreateAccount:
    """POST /api/accounts"""

    async def test_create_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/accounts",
            json={"name": "My Savings", "type": "savings", "balance": "1000.50", "currency": "EUR"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Savings"
        assert data["type"] == "savings"
        assert data["balance"] == "1000.50"
        assert data["currency"] == "EUR"
        assert data["icon"] == "Wallet"  # default
        assert "id" in data

    async def test_create_defaults(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/accounts",
            json={"name": "Cash", "type": "cash"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["balance"] == "0.00"
        assert data["currency"] == "CHF"
        assert data["icon"] == "Wallet"
        assert data["account_identifier"] is None

    async def test_create_invalid_type(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/accounts",
            json={"name": "Bad", "type": "invalid_type"},
            headers=h,
        )
        assert resp.status_code == 422

    async def test_create_missing_name(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/accounts",
            json={"type": "checking"},
            headers=h,
        )
        assert resp.status_code == 422

    async def test_create_no_csrf(self, authed_client: AsyncClient):
        resp = await authed_client.post(
            "/api/accounts",
            json={"name": "No CSRF", "type": "checking"},
        )
        assert resp.status_code == 403


# ============================================================================
# Get by ID
# ============================================================================


class TestGetAccount:
    """GET /api/accounts/{id}"""

    async def test_get_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create_resp = await authed_client.post(
            "/api/accounts",
            json={"name": "Test", "type": "checking"},
            headers=h,
        )
        account_id = create_resp.json()["id"]

        resp = await authed_client.get(f"/api/accounts/{account_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == account_id
        assert resp.json()["name"] == "Test"

    async def test_get_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/accounts/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404


# ============================================================================
# Update
# ============================================================================


class TestUpdateAccount:
    """PUT /api/accounts/{id}"""

    async def test_update_partial(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create_resp = await authed_client.post(
            "/api/accounts",
            json={"name": "Old Name", "type": "checking"},
            headers=h,
        )
        account_id = create_resp.json()["id"]

        resp = await authed_client.put(
            f"/api/accounts/{account_id}",
            json={"name": "New Name"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"
        assert resp.json()["type"] == "checking"  # unchanged

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/accounts/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteAccount:
    """DELETE /api/accounts/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create_resp = await authed_client.post(
            "/api/accounts",
            json={"name": "To Delete", "type": "cash"},
            headers=h,
        )
        account_id = create_resp.json()["id"]

        resp = await authed_client.delete(f"/api/accounts/{account_id}", headers=h)
        assert resp.status_code == 204

        # Verify gone
        get_resp = await authed_client.get(f"/api/accounts/{account_id}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/accounts/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
