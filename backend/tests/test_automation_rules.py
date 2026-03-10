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


# ============================================================================
# Helpers for Phase 4 endpoints
# ============================================================================


async def _create_account(client: AsyncClient, name: str = "Test Account") -> str:
    h = csrf_headers(client)
    resp = await client.post(
        "/api/accounts", json={"name": name, "type": "checking"}, headers=h
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_transaction(
    client: AsyncClient, account_id: str, *, description: str, amount: str, **extra
) -> dict:
    h = csrf_headers(client)
    payload = {
        "amount": amount,
        "currency": "CHF",
        "description": description,
        "date": "2026-01-15",
        "account_id": account_id,
        **extra,
    }
    resp = await client.post("/api/transactions", json=payload, headers=h)
    assert resp.status_code == 201
    return resp.json()


# ============================================================================
# Manual run
# ============================================================================


class TestManualRun:
    """POST /api/automation-rules/run"""

    async def test_run_no_rules(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post("/api/automation-rules/run", headers=h)
        assert resp.status_code == 200
        data = resp.json()
        assert data["evaluated_count"] == 0
        assert data["matched_count"] == 0
        assert data["changed_count"] == 0

    async def test_run_matches_and_updates(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        acct_id = await _create_account(authed_client)

        # Create transactions
        await _create_transaction(
            authed_client, acct_id, description="Grocery Store", amount="-50"
        )
        await _create_transaction(
            authed_client, acct_id, description="Coffee Shop", amount="-5"
        )

        # Create a category
        cat_resp = await authed_client.post(
            "/api/categories", json={"name": "Food", "icon": "Apple"}, headers=h
        )
        if cat_resp.status_code == 201:
            cat_id = cat_resp.json()["id"]
        else:
            cats = await authed_client.get("/api/categories")
            cat_id = next(c["id"] for c in cats.json() if c["name"] == "Food")

        # Create rule with manual-run trigger
        rule = {
            "name": "Auto-food",
            "triggers": ["manual-run"],
            "match_mode": "all",
            "conditions": [
                {"field": "description", "operator": "contains", "value": "grocery"}
            ],
            "actions": [{"type": "set-category", "category_id": cat_id}],
        }
        await authed_client.post("/api/automation-rules", json=rule, headers=h)

        # Run rules
        resp = await authed_client.post("/api/automation-rules/run", headers=h)
        assert resp.status_code == 200
        data = resp.json()
        assert data["evaluated_count"] == 2
        assert data["matched_count"] == 1
        assert data["changed_count"] == 1
        assert len(data["rule_stats"]) == 1
        assert data["rule_stats"][0]["matched_count"] == 1

    async def test_run_requires_csrf(self, authed_client: AsyncClient):
        resp = await authed_client.post("/api/automation-rules/run")
        assert resp.status_code == 403


# ============================================================================
# Test rule
# ============================================================================


class TestRuleTest:
    """POST /api/automation-rules/{rule_id}/test"""

    async def test_rule_matches(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/automation-rules", json=SAMPLE_RULE, headers=h
        )
        rule_id = create.json()["id"]

        resp = await authed_client.post(
            f"/api/automation-rules/{rule_id}/test",
            json={"transaction": {"description": "grocery shopping", "amount": -30}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["matched"] is True
        assert len(data["condition_results"]) == 1
        assert data["condition_results"][0]["matched"] is True
        assert len(data["actions_to_apply"]) == 1

    async def test_rule_no_match(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/automation-rules", json=SAMPLE_RULE, headers=h
        )
        rule_id = create.json()["id"]

        resp = await authed_client.post(
            f"/api/automation-rules/{rule_id}/test",
            json={"transaction": {"description": "pharmacy visit", "amount": -15}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["matched"] is False
        assert data["condition_results"][0]["matched"] is False
        assert data["actions_to_apply"] == []

    async def test_rule_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.post(
            "/api/automation-rules/00000000-0000-0000-0000-000000000000/test",
            json={"transaction": {"description": "test"}},
        )
        assert resp.status_code == 404
