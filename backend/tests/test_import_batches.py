"""Import batch endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


async def _create_account(client: AsyncClient) -> str:
    h = csrf_headers(client)
    resp = await client.post(
        "/api/accounts",
        json={"name": "Import Account", "type": "checking"},
        headers=h,
    )
    return resp.json()["id"]


async def _create_import_batch(client: AsyncClient, account_id: str | None = None) -> dict:
    """Create an import batch directly via DB since there's no POST endpoint.

    Import batches are created internally during CSV import.
    We'll use the transaction bulk endpoint to test indirectly,
    or create via the DB.

    For testing, we'll create a batch by using the test DB directly.
    """
    # Since there's no POST /api/import-batches endpoint (batches are created
    # during CSV import flow), we create one directly through the ORM.
    from datetime import datetime, timezone

    from app.models.import_batch import ImportBatch
    from tests.conftest import _override_get_db

    batch = None
    async for session in _override_get_db():
        # Get user_id from /me endpoint
        me = await client.get("/api/auth/me")
        user_id = me.json()["id"]

        import uuid as _uuid

        batch_obj = ImportBatch(
            user_id=_uuid.UUID(user_id),
            file_name="test_import.csv",
            name="Test Import",
            imported_at=datetime.now(timezone.utc),
            parser_name="Test Parser",
            row_count=5,
            account_id=_uuid.UUID(account_id) if account_id else None,
        )
        session.add(batch_obj)
        await session.commit()
        await session.refresh(batch_obj)
        batch = {
            "id": str(batch_obj.id),
            "file_name": batch_obj.file_name,
            "name": batch_obj.name,
        }
        break

    return batch  # type: ignore[return-value]


# ============================================================================
# List
# ============================================================================


class TestListImportBatches:
    """GET /api/import-batches"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/import-batches")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_created(self, authed_client: AsyncClient):
        await _create_import_batch(authed_client)
        resp = await authed_client.get("/api/import-batches")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["file_name"] == "test_import.csv"


# ============================================================================
# Rename
# ============================================================================


class TestUpdateImportBatch:
    """PUT /api/import-batches/{id}"""

    async def test_rename(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        batch = await _create_import_batch(authed_client)

        resp = await authed_client.put(
            f"/api/import-batches/{batch['id']}",
            json={"name": "Renamed Import"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Import"

    async def test_rename_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/import-batches/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete (with cascade to transactions)
# ============================================================================


class TestDeleteImportBatch:
    """DELETE /api/import-batches/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        batch = await _create_import_batch(authed_client)

        resp = await authed_client.delete(
            f"/api/import-batches/{batch['id']}", headers=h
        )
        assert resp.status_code == 204

        # Verify gone
        list_resp = await authed_client.get("/api/import-batches")
        assert len(list_resp.json()) == 0

    async def test_delete_cascades_transactions(self, authed_client: AsyncClient):
        """Deleting an import batch should also delete its transactions."""
        h = csrf_headers(authed_client)
        account_id = await _create_account(authed_client)
        batch = await _create_import_batch(authed_client, account_id=account_id)

        # Create a transaction linked to this batch
        txn_resp = await authed_client.post(
            "/api/transactions",
            json={
                "amount": "-10",
                "currency": "CHF",
                "description": "Imported txn",
                "date": "2026-01-01",
                "account_id": account_id,
                "import_batch_id": batch["id"],
            },
            headers=h,
        )
        assert txn_resp.status_code == 201
        txn_id = txn_resp.json()["id"]

        # Delete the batch
        resp = await authed_client.delete(
            f"/api/import-batches/{batch['id']}", headers=h
        )
        assert resp.status_code == 204

        # Verify transaction is also gone
        get_txn = await authed_client.get(f"/api/transactions/{txn_id}")
        assert get_txn.status_code == 404

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/import-batches/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
