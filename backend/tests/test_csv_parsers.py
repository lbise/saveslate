"""CSV parser CRUD endpoint tests."""

from httpx import AsyncClient

from tests.conftest import csrf_headers


SAMPLE_CONFIG = {
    "delimiter": ",",
    "date_column": "Date",
    "amount_column": "Amount",
    "description_column": "Description",
    "date_format": "%Y-%m-%d",
}


# ============================================================================
# List
# ============================================================================


class TestListCsvParsers:
    """GET /api/csv-parsers"""

    async def test_list_empty(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/csv-parsers")
        assert resp.status_code == 200
        assert resp.json() == []


# ============================================================================
# Create
# ============================================================================


class TestCreateCsvParser:
    """POST /api/csv-parsers"""

    async def test_create_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/csv-parsers",
            json={"name": "Bank Statement", "config": SAMPLE_CONFIG},
            headers=h,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Bank Statement"
        assert data["config"]["delimiter"] == ","
        assert "id" in data

    async def test_create_missing_config(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.post(
            "/api/csv-parsers",
            json={"name": "No Config"},
            headers=h,
        )
        assert resp.status_code == 422


# ============================================================================
# Get by ID
# ============================================================================


class TestGetCsvParser:
    """GET /api/csv-parsers/{id}"""

    async def test_get_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/csv-parsers",
            json={"name": "Parser", "config": SAMPLE_CONFIG},
            headers=h,
        )
        parser_id = create.json()["id"]

        resp = await authed_client.get(f"/api/csv-parsers/{parser_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Parser"

    async def test_get_not_found(self, authed_client: AsyncClient):
        resp = await authed_client.get(
            "/api/csv-parsers/00000000-0000-0000-0000-000000000000"
        )
        assert resp.status_code == 404


# ============================================================================
# Update
# ============================================================================


class TestUpdateCsvParser:
    """PUT /api/csv-parsers/{id}"""

    async def test_update_name(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/csv-parsers",
            json={"name": "Old Parser", "config": SAMPLE_CONFIG},
            headers=h,
        )
        parser_id = create.json()["id"]

        resp = await authed_client.put(
            f"/api/csv-parsers/{parser_id}",
            json={"name": "New Parser"},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Parser"

    async def test_update_config(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/csv-parsers",
            json={"name": "Parser", "config": SAMPLE_CONFIG},
            headers=h,
        )
        parser_id = create.json()["id"]

        new_config = {**SAMPLE_CONFIG, "delimiter": ";"}
        resp = await authed_client.put(
            f"/api/csv-parsers/{parser_id}",
            json={"config": new_config},
            headers=h,
        )
        assert resp.status_code == 200
        assert resp.json()["config"]["delimiter"] == ";"

    async def test_update_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.put(
            "/api/csv-parsers/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers=h,
        )
        assert resp.status_code == 404


# ============================================================================
# Delete
# ============================================================================


class TestDeleteCsvParser:
    """DELETE /api/csv-parsers/{id}"""

    async def test_delete_success(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        create = await authed_client.post(
            "/api/csv-parsers",
            json={"name": "Delete Me", "config": SAMPLE_CONFIG},
            headers=h,
        )
        parser_id = create.json()["id"]

        resp = await authed_client.delete(
            f"/api/csv-parsers/{parser_id}", headers=h
        )
        assert resp.status_code == 204

        get_resp = await authed_client.get(f"/api/csv-parsers/{parser_id}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, authed_client: AsyncClient):
        h = csrf_headers(authed_client)
        resp = await authed_client.delete(
            "/api/csv-parsers/00000000-0000-0000-0000-000000000000",
            headers=h,
        )
        assert resp.status_code == 404
