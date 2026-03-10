"""Category CRUD + seed endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ============================================================================
# List
# ============================================================================


class TestListCategories:
    """GET /api/categories"""

    async def test_list_has_system_categories(self, authed_client: AsyncClient):
        """After registration, user should have system Uncategorized category."""
        resp = await authed_client.get("/api/categories")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Uncategorized"
        assert data[0]["source"] == "system"
        assert data[0]["is_hidden"] is True

    async def test_list_visible_filter(self, authed_client: AsyncClient):
        """visible=true should exclude hidden (system) categories."""
        resp = await authed_client.get("/api/categories?visible=true")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_visible_false_shows_all(self, authed_client: AsyncClient):
        """visible=false or omitted shows all including hidden."""
        resp = await authed_client.get("/api/categories")
        assert resp.status_code == 200
        assert len(resp.json()) == 1  # system Uncategorized


# ============================================================================
# Create
# ============================================================================


class TestCreateCategory:
    """POST /api/categories"""

    async def test_create_custom(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/categories",
            json={"name": "Food", "icon": "Utensils"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Food"
        assert data["icon"] == "Utensils"
        assert data["source"] == "custom"
        assert data["is_hidden"] is False

    async def test_create_with_group(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        # Create a group first
        group_resp = await authed_client.post(
            "/api/category-groups",
            json={"name": "Expenses"},
            headers=h,
        )
        group_id = group_resp.json()["id"]

        resp = await authed_client.post(
            "/api/categories",
            json={"name": "Groceries", "group_id": group_id},
            headers=h,
        )
        assert resp.status_code == 201
        assert resp.json()["group_id"] == group_id


# ============================================================================
# Update
# ============================================================================


class TestUpdateCategory:
    """PUT /api/categories/{id}"""

    async def test_update_custom(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/categories",
            json={"name": "Old", "icon": "Tag"},
            headers=h,
        )
        cat_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/categories/{cat_id}",
            json={"name": "Updated"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    async def test_update_system_blocked(self, authed_client: AsyncClient):
        """Cannot modify system categories."""
        h = csrf_headers(authed_client)
        # Get the system category
        cats = await authed_client.get("/api/categories")
        system_cat = [c for c in cats.json() if c["source"] == "system"][0]

        resp = await authed_client.put(
            f"/api/categories/{system_cat['id']}",
            json={"name": "Hacked"},
            headers=h,
        )
        assert resp.status_code == 403

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/categories/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteCategory:
    """DELETE /api/categories/{id}"""

    async def test_delete_custom(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/categories",
            json={"name": "Temp"},
            headers=h,
        )
        cat_id = create.json()["id"]

        resp = await authed_client.delete(f"/api/categories/{cat_id}", headers=h)
        assert resp.status_code == 204

    async def test_delete_system_blocked(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        cats = await authed_client.get("/api/categories")
        system_cat = [c for c in cats.json() if c["source"] == "system"][0]

        resp = await authed_client.delete(
            f"/api/categories/{system_cat['id']}",
            headers=h,
        )
        assert resp.status_code == 403


# ============================================================================
# Seed
# ============================================================================


class TestSeedCategories:
    """POST /api/categories/seed"""

    async def test_seed_minimal(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/categories/seed",
            json={"preset": "minimal"},
            headers=h,
        )
        assert resp.status_code == 200
        data = resp.json()
        # Minimal preset: 7 categories
        assert len(data) == 7
        names = {c["name"] for c in data}
        assert "Housing" in names
        assert "Groceries" in names
        assert "Salary" in names
        assert "Transfer" in names
        for c in data:
            assert c["source"] == "preset"

    async def test_seed_full(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/categories/seed",
            json={"preset": "full"},
            headers=h,
        )
        assert resp.status_code == 200
        data = resp.json()
        # Full preset: 29 categories
        assert len(data) == 29

    async def test_seed_sets_onboarding(self, authed_client: AsyncClient):
        """Seeding should set category_preset and onboarding_completed_at on user."""
        h = csrf_headers(authed_client)
        await authed_client.post(
            "/api/categories/seed",
            json={"preset": "minimal"},
            headers=h,
        )
        # Check user profile
        me_resp = await authed_client.get("/api/auth/me")
        assert me_resp.json()["category_preset"] == "minimal"
        assert me_resp.json()["onboarding_completed_at"] is not None

    async def test_seed_double_blocked(self, authed_client: AsyncClient):
        """Cannot seed twice."""
        h = csrf_headers(authed_client)
        resp1 = await authed_client.post(
            "/api/categories/seed",
            json={"preset": "minimal"},
            headers=h,
        )
        assert resp1.status_code == 200

        resp2 = await authed_client.post(
            "/api/categories/seed",
            json={"preset": "full"},
            headers=h,
        )
        assert resp2.status_code == 409
