"""Goal CRUD endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ============================================================================
# List
# ============================================================================


class TestListGoals:
    """GET /api/goals"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/goals")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_archived_filter(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        # Create active + archived
        await authed_client.post(
            "/api/goals",
            json={"name": "Active Goal", "target_amount": "1000"},
            headers=h,
        )
        archived_resp = await authed_client.post(
            "/api/goals",
            json={"name": "Archived Goal", "is_archived": True},
            headers=h,
        )
        assert archived_resp.status_code == 201

        # Filter active only
        resp = await authed_client.get("/api/goals?archived=false")
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "Active Goal"

        # Filter archived only
        resp = await authed_client.get("/api/goals?archived=true")
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "Archived Goal"

        # No filter: both
        resp = await authed_client.get("/api/goals")
        assert len(resp.json()) == 2


# ============================================================================
# Create
# ============================================================================


class TestCreateGoal:
    """POST /api/goals"""

    async def test_create_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/goals",
            json={
                "name": "Vacation Fund",
                "description": "Summer 2026",
                "target_amount": "5000.00",
                "deadline": "2026-08-01",
            },
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Vacation Fund"
        assert data["description"] == "Summer 2026"
        assert data["target_amount"] == "5000.00"
        assert data["deadline"] == "2026-08-01"
        assert data["is_archived"] is False
        assert data["has_target"] is True

    async def test_create_defaults(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/goals",
            json={"name": "Simple Goal"},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["starting_amount"] == "0.00"
        assert data["target_amount"] == "0.00"
        assert data["icon"] == "Target"
        assert data["deadline"] is None
        assert data["expected_contribution"] is None

    async def test_create_with_expected_contribution(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/goals",
            json={
                "name": "Monthly Savings",
                "expected_contribution": {"amount": 200, "frequency": "monthly"},
            },
            headers=h,
        )
        assert resp.status_code == 201
        assert resp.json()["expected_contribution"]["amount"] == 200


# ============================================================================
# Get by ID
# ============================================================================


class TestGetGoal:
    """GET /api/goals/{id}"""

    async def test_get_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/goals", json={"name": "Test Goal"}, headers=h
        )
        goal_id = create.json()["id"]

        resp = await authed_client.get(f"/api/goals/{goal_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Goal"

    async def test_get_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.get(
            "/api/goals/00000000-0000-0000-0000-000000000000"
        )
        assert resp.status_code == 404


# ============================================================================
# Update
# ============================================================================


class TestUpdateGoal:
    """PUT /api/goals/{id}"""

    async def test_update_partial(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/goals", json={"name": "Old Goal"}, headers=h
        )
        goal_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/goals/{goal_id}",
            json={"name": "Renamed Goal", "is_archived": True},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Goal"
        assert resp.json()["is_archived"] is True

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/goals/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteGoal:
    """DELETE /api/goals/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/goals", json={"name": "Delete Me"}, headers=h
        )
        goal_id = create.json()["id"]

        resp = await authed_client.delete(f"/api/goals/{goal_id}", headers=h)
        assert resp.status_code == 204

        get_resp = await authed_client.get(f"/api/goals/{goal_id}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/goals/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
