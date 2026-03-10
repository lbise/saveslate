"""Tag CRUD endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ============================================================================
# List
# ============================================================================


class TestListTags:
    """GET /api/tags"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/tags")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_created(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        await authed_client.post(
            "/api/tags", json={"name": "urgent"}, headers=h
        )
        resp = await authed_client.get("/api/tags")
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "urgent"


# ============================================================================
# Create
# ============================================================================


class TestCreateTag:
    """POST /api/tags"""

    async def test_create_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/tags",
            json={"name": "important", "color": "#FF0000"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "important"
        assert data["color"] == "#FF0000"

    async def test_create_default_color(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/tags", json={"name": "test"}, headers=h
        )
        assert resp.status_code == 201
        assert resp.json()["color"] == "#55AEC8"

    async def test_create_duplicate_name(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        await authed_client.post(
            "/api/tags", json={"name": "duplicate"}, headers=h
        )
        resp = await authed_client.post(
            "/api/tags", json={"name": "duplicate"}, headers=h
        )
        assert resp.status_code == 409

    async def test_create_duplicate_case_insensitive(self, authed_client: AsyncClient):
        """Tag names should be unique case-insensitively."""
        h = csrf_headers(authed_client)
        await authed_client.post(
            "/api/tags", json={"name": "Urgent"}, headers=h
        )
        resp = await authed_client.post(
            "/api/tags", json={"name": "urgent"}, headers=h
        )
        assert resp.status_code == 409


# ============================================================================
# Update
# ============================================================================


class TestUpdateTag:
    """PUT /api/tags/{id}"""

    async def test_update_name(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/tags", json={"name": "old"}, headers=h
        )
        tag_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/tags/{tag_id}",
            json={"name": "new"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "new"

    async def test_update_color(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/tags", json={"name": "colored"}, headers=h
        )
        tag_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/tags/{tag_id}",
            json={"color": "#00FF00"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["color"] == "#00FF00"

    async def test_update_duplicate_name(self, authed_client: AsyncClient):
        """Renaming to an existing name (case-insensitive) should fail."""
        h = csrf_headers(authed_client)
        await authed_client.post(
            "/api/tags", json={"name": "taken"}, headers=h
        )
        create2 = await authed_client.post(
            "/api/tags", json={"name": "other"}, headers=h
        )
        tag_id = create2.json()["id"]

        resp = await authed_client.put(
            f"/api/tags/{tag_id}",
            json={"name": "Taken"},  # case-insensitive match
            headers=h,
        )
        assert resp.status_code == 409

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/tags/00000000-0000-0000-0000-000000000000",
            json={"name": "ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteTag:
    """DELETE /api/tags/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/tags", json={"name": "delete me"}, headers=h
        )
        tag_id = create.json()["id"]

        resp = await authed_client.delete(f"/api/tags/{tag_id}", headers=h)
        assert resp.status_code == 204

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/tags/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
