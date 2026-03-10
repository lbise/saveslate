"""Analytics endpoint tests: summary, monthly, category, account balances, goal progress."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_account(
    client: AsyncClient, name: str = "Main Account", **extra
) -> str:
    h = csrf_headers(client)
    resp = await client.post(
        "/api/accounts",
        json={"name": name, "type": "checking", **extra},
        headers=h,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_transaction(
    client: AsyncClient,
    account_id: str,
    *,
    amount: str,
    description: str = "Test txn",
    date: str = "2026-01-15",
    **extra,
) -> dict:
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


async def _create_goal(
    client: AsyncClient, name: str = "Save Fund", **extra
) -> str:
    h = csrf_headers(client)
    resp = await client.post(
        "/api/goals",
        json={"name": name, "target_amount": "1000.00", **extra},
        headers=h,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _seed_transactions(client: AsyncClient) -> str:
    """Create an account with several transactions for analytics testing.

    Returns the account_id.
    """
    acct_id = await _create_account(client)
    # Income
    await _create_transaction(client, acct_id, amount="500.00", description="Salary", date="2026-01-10")
    await _create_transaction(client, acct_id, amount="200.00", description="Freelance", date="2026-01-20")
    # Expenses
    await _create_transaction(client, acct_id, amount="-50.00", description="Groceries", date="2026-01-12")
    await _create_transaction(client, acct_id, amount="-30.00", description="Coffee", date="2026-01-15")
    # Transfer (should be excluded from income/expense analytics)
    await _create_transaction(
        client, acct_id,
        amount="-100.00", description="Transfer out",
        date="2026-01-18", transfer_pair_id="pair-1", transfer_pair_role="source",
    )
    # February
    await _create_transaction(client, acct_id, amount="600.00", description="Salary Feb", date="2026-02-10")
    await _create_transaction(client, acct_id, amount="-80.00", description="Groceries Feb", date="2026-02-15")
    return acct_id


# ============================================================================
# Summary
# ============================================================================


class TestAnalyticsSummary:
    """GET /api/analytics/summary"""

    async def test_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/analytics/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_income"]) == 0
        assert float(data["total_expenses"]) == 0
        assert float(data["net"]) == 0
        assert data["transaction_count"] == 0

    async def test_with_data(self, authed_client: AsyncClient):
        await _seed_transactions(authed_client)
        resp = await authed_client.get("/api/analytics/summary")
        assert resp.status_code == 200
        data = resp.json()
        # Income: 500 + 200 + 600 = 1300
        assert float(data["total_income"]) == 1300.0
        # Expenses: -50 + -30 + -80 = -160 (transfer excluded)
        assert float(data["total_expenses"]) == -160.0
        # Net: 1300 + (-160) = 1140
        assert float(data["net"]) == 1140.0
        # Count: 6 (transfer excluded)
        assert data["transaction_count"] == 6

    async def test_with_date_filter(self, authed_client: AsyncClient):
        await _seed_transactions(authed_client)
        resp = await authed_client.get(
            "/api/analytics/summary",
            params={"startDate": "2026-01-01", "endDate": "2026-01-31"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # January only: income=700, expenses=-80
        assert float(data["total_income"]) == 700.0
        assert float(data["total_expenses"]) == -80.0
        assert data["transaction_count"] == 4

    async def test_with_account_filter(self, authed_client: AsyncClient):
        acct_id = await _seed_transactions(authed_client)
        # Create another account with no transactions
        acct2_id = await _create_account(authed_client, name="Empty Account")

        resp = await authed_client.get(
            "/api/analytics/summary", params={"accountId": acct2_id}
        )
        assert resp.status_code == 200
        assert resp.json()["transaction_count"] == 0


# ============================================================================
# Monthly breakdown
# ============================================================================


class TestMonthlyBreakdown:
    """GET /api/analytics/by-month"""

    async def test_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/analytics/by-month")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_with_data(self, authed_client: AsyncClient):
        await _seed_transactions(authed_client)
        resp = await authed_client.get("/api/analytics/by-month")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2  # January and February

        jan = next(m for m in data if m["month"] == "2026-01")
        assert float(jan["income"]) == 700.0
        assert float(jan["expenses"]) == -80.0
        assert float(jan["net"]) == 620.0
        assert jan["transaction_count"] == 4

        feb = next(m for m in data if m["month"] == "2026-02")
        assert float(feb["income"]) == 600.0
        assert float(feb["expenses"]) == -80.0
        assert float(feb["net"]) == 520.0
        assert feb["transaction_count"] == 2


# ============================================================================
# Category breakdown
# ============================================================================


class TestCategoryBreakdown:
    """GET /api/analytics/by-category"""

    async def test_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/analytics/by-category")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_uncategorized(self, authed_client: AsyncClient):
        """All transactions without category should group under None."""
        await _seed_transactions(authed_client)
        resp = await authed_client.get("/api/analytics/by-category")
        assert resp.status_code == 200
        data = resp.json()
        # All non-transfer txns have no category → one group
        assert len(data) == 1
        assert data[0]["category_id"] is None
        assert data[0]["category_name"] is None
        assert data[0]["count"] == 6

    async def test_expense_type_filter(self, authed_client: AsyncClient):
        await _seed_transactions(authed_client)
        resp = await authed_client.get(
            "/api/analytics/by-category", params={"type": "expense"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        # Only expense transactions (amount < 0, non-transfer)
        assert data[0]["count"] == 3  # 50 + 30 + 80


# ============================================================================
# Account balances
# ============================================================================


class TestAccountBalances:
    """GET /api/analytics/account-balances"""

    async def test_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/analytics/account-balances")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_no_transactions(self, authed_client: AsyncClient):
        acct_id = await _create_account(authed_client, balance="100.00")
        resp = await authed_client.get("/api/analytics/account-balances")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["account_id"] == acct_id
        assert float(data[0]["manual_balance"]) == 100.0
        assert float(data[0]["computed_balance"]) == 0.0
        assert data[0]["transaction_count"] == 0

    async def test_with_transactions(self, authed_client: AsyncClient):
        acct_id = await _seed_transactions(authed_client)
        resp = await authed_client.get("/api/analytics/account-balances")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        # All txns including transfer: 500 + 200 - 50 - 30 - 100 + 600 - 80 = 1040
        assert float(data[0]["computed_balance"]) == 1040.0
        assert data[0]["transaction_count"] == 7
        assert data[0]["last_transaction_date"] is not None


# ============================================================================
# Goal progress
# ============================================================================


class TestGoalProgress:
    """GET /api/analytics/goal-progress"""

    async def test_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/analytics/goal-progress")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_no_contributions(self, authed_client: AsyncClient):
        goal_id = await _create_goal(
            authed_client, starting_amount="100.00", target_amount="1000.00"
        )
        resp = await authed_client.get("/api/analytics/goal-progress")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["goal_id"] == goal_id
        assert float(data[0]["current_amount"]) == 100.0
        assert float(data[0]["total_contributions"]) == 0.0
        assert float(data[0]["progress_percentage"]) == 10.0
        assert float(data[0]["remaining_amount"]) == 900.0
        assert data[0]["contribution_count"] == 0

    async def test_with_contributions(self, authed_client: AsyncClient):
        goal_id = await _create_goal(
            authed_client, starting_amount="0.00", target_amount="500.00"
        )
        acct_id = await _create_account(authed_client)
        await _create_transaction(
            authed_client, acct_id, amount="100.00", description="Contrib 1",
            goal_id=goal_id,
        )
        await _create_transaction(
            authed_client, acct_id, amount="150.00", description="Contrib 2",
            goal_id=goal_id,
        )

        resp = await authed_client.get("/api/analytics/goal-progress")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert float(data[0]["current_amount"]) == 250.0
        assert float(data[0]["total_contributions"]) == 250.0
        assert float(data[0]["progress_percentage"]) == 50.0
        assert float(data[0]["remaining_amount"]) == 250.0
        assert data[0]["contribution_count"] == 2

    async def test_archived_filter(self, authed_client: AsyncClient):
        await _create_goal(authed_client, name="Active Goal")
        await _create_goal(authed_client, name="Archived Goal", is_archived=True)

        # Get only active
        resp = await authed_client.get(
            "/api/analytics/goal-progress", params={"archived": "false"}
        )
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Active Goal"

        # Get only archived
        resp = await authed_client.get(
            "/api/analytics/goal-progress", params={"archived": "true"}
        )
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Archived Goal"
