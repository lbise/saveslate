"""Category group CRUD endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ============================================================================
# List
# ============================================================================


class TestListCategoryGroups:
    """GET /api/category-groups"""

    async def test_list_has_system_group(self, authed_client: AsyncClient):
        """After registration, user should have the System group."""
        resp = await authed_client.get("/api/category-groups")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "System"
        assert data[0]["source"] == "system"
        assert data[0]["is_hidden"] is True


# ============================================================================
# Create
# ============================================================================


class TestCreateCategoryGroup:
    """POST /api/category-groups"""

    async def test_create_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/category-groups",
            json={"name": "Expenses", "icon": "Wallet", "order": 1},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Expenses"
        assert data["icon"] == "Wallet"
        assert data["order"] == 1
        assert data["source"] == "custom"

    async def test_create_defaults(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/category-groups",
            json={"name": "Income"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["icon"] == "Folder"  # default
        assert data["order"] == 0  # default


# ============================================================================
# Update
# ============================================================================


class TestUpdateCategoryGroup:
    """PUT /api/category-groups/{id}"""

    async def test_update_custom(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/category-groups",
            json={"name": "Old Group"},
            headers=h,
        )
        group_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/category-groups/{group_id}",
            json={"name": "New Group", "order": 5},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Group"
        assert resp.json()["order"] == 5

    async def test_update_system_blocked(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        groups = await authed_client.get("/api/category-groups")
        system_group = [g for g in groups.json() if g["source"] == "system"][0]

        resp = await authed_client.put(
            f"/api/category-groups/{system_group['id']}",
            json={"name": "Hacked"},
            headers=h,
        )
        assert resp.status_code == 403

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/category-groups/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteCategoryGroup:
    """DELETE /api/category-groups/{id}"""

    async def test_delete_custom(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/category-groups",
            json={"name": "Temp Group"},
            headers=h,
        )
        group_id = create.json()["id"]

        resp = await authed_client.delete(
            f"/api/category-groups/{group_id}", headers=h
        )
        assert resp.status_code == 204

    async def test_delete_system_blocked(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        groups = await authed_client.get("/api/category-groups")
        system_group = [g for g in groups.json() if g["source"] == "system"][0]

        resp = await authed_client.delete(
            f"/api/category-groups/{system_group['id']}",
            headers=h,
        )
        assert resp.status_code == 403

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/category-groups/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
