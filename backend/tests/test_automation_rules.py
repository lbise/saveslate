"""Automation rule CRUD endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


SAMPLE_RULE = {
    "name": "Auto-categorize groceries",
    "triggers": ["on_create"],
    "match_mode": "all",
    "conditions": [{"field": "description", "operator": "contains", "value": "grocery"}],
    "actions": [{"type": "set_category", "category_name": "Groceries"}],
}


# ============================================================================
# List
# ============================================================================


class TestListAutomationRules:
    """GET /api/automation-rules"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/automation-rules")
        assert resp.status_code == 200
        assert resp.json() == []


# ============================================================================
# Create
# ============================================================================


class TestCreateAutomationRule:
    """POST /api/automation-rules"""

    async def test_create_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/automation-rules",
            json=SAMPLE_RULE,
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Auto-categorize groceries"
        assert data["is_enabled"] is True
        assert data["match_mode"] == "all"
        assert len(data["triggers"]) == 1
        assert len(data["conditions"]) == 1
        assert len(data["actions"]) == 1

    async def test_create_disabled(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        rule = {**SAMPLE_RULE, "is_enabled": False}
        resp = await authed_client.post(
            "/api/automation-rules", json=rule, headers=h
        )
        assert resp.status_code == 201
        assert resp.json()["is_enabled"] is False

    async def test_create_missing_fields(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/automation-rules",
            json={"name": "Incomplete"},
            headers=h,
        )
        assert resp.status_code == 422


# ============================================================================
# Update
# ============================================================================


class TestUpdateAutomationRule:
    """PUT /api/automation-rules/{id}"""

    async def test_update_name(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/automation-rules", json=SAMPLE_RULE, headers=h
        )
        rule_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/automation-rules/{rule_id}",
            json={"name": "Renamed Rule"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Rule"

    async def test_update_toggle_enabled(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/automation-rules", json=SAMPLE_RULE, headers=h
        )
        rule_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/automation-rules/{rule_id}",
            json={"is_enabled": False},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["is_enabled"] is False

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/automation-rules/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteAutomationRule:
    """DELETE /api/automation-rules/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/automation-rules", json=SAMPLE_RULE, headers=h
        )
        rule_id = create.json()["id"]

        resp = await authed_client.delete(
            f"/api/automation-rules/{rule_id}", headers=h
        )
        assert resp.status_code == 204

        list_resp = await authed_client.get("/api/automation-rules")
        assert len(list_resp.json()) == 0

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/automation-rules/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
