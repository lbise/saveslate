"""Auth endpoint tests: register, login, logout, profile, CSRF, seeding."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER


# ============================================================================
# Registration
# ============================================================================


class TestRegister:
    """POST /api/auth/register"""

    async def test_register_success(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json=TEST_USER)
        assert resp.status_code == 201

        data = resp.json()
        assert data["email"] == TEST_USER["email"]
        assert data["name"] == TEST_USER["name"]
        assert data["default_currency"] == TEST_USER["default_currency"]
        assert "id" in data
        assert "password" not in data
        assert "password_hash" not in data

    async def test_register_sets_cookies(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json=TEST_USER)
        assert resp.status_code == 201
        assert "access_token" in resp.cookies
        assert "csrf_token" in resp.cookies

    async def test_register_duplicate_email(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json=TEST_USER)
        assert resp.status_code == 201

        resp2 = await client.post("/api/auth/register", json=TEST_USER)
        assert resp2.status_code == 409
        assert "already registered" in resp2.json()["detail"]

    async def test_register_short_password(self, client: AsyncClient):
        payload = {**TEST_USER, "password": "short"}
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422  # validation error

    async def test_register_invalid_email(self, client: AsyncClient):
        payload = {**TEST_USER, "email": "not-an-email"}
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    async def test_register_missing_fields(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json={})
        assert resp.status_code == 422

    async def test_register_default_currency(self, client: AsyncClient):
        """Default currency should be CHF when not provided."""
        payload = {
            "email": "nocur@example.com",
            "name": "No Currency",
            "password": "securepassword123",
        }
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        assert resp.json()["default_currency"] == "CHF"


# ============================================================================
# Login
# ============================================================================


class TestLogin:
    """POST /api/auth/login"""

    async def test_login_success(self, client: AsyncClient):
        # Register first
        await client.post("/api/auth/register", json=TEST_USER)

        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        resp = await client.post("/api/auth/login", json=login_data)
        assert resp.status_code == 200

        data = resp.json()
        assert data["email"] == TEST_USER["email"]
        assert "access_token" in resp.cookies
        assert "csrf_token" in resp.cookies

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/auth/register", json=TEST_USER)

        resp = await client.post(
            "/api/auth/login",
            json={"email": TEST_USER["email"], "password": "wrongpassword123"},
        )
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]

    async def test_login_nonexistent_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "securepassword123"},
        )
        assert resp.status_code == 401

    async def test_login_missing_fields(self, client: AsyncClient):
        resp = await client.post("/api/auth/login", json={})
        assert resp.status_code == 422


# ============================================================================
# Logout
# ============================================================================


class TestLogout:
    """POST /api/auth/logout"""

    async def test_logout_clears_cookies(self, authed_client: AsyncClient):
        resp = await authed_client.post("/api/auth/logout")
        assert resp.status_code == 204

        # Cookies should be cleared (set to empty / deleted)
        # After logout, /me should fail
        me_resp = await authed_client.get("/api/auth/me")
        assert me_resp.status_code == 401

    async def test_logout_unauthenticated(self, client: AsyncClient):
        """Logout is fine even without being logged in."""
        resp = await client.post("/api/auth/logout")
        assert resp.status_code == 204


# ============================================================================
# GET /me
# ============================================================================


class TestGetMe:
    """GET /api/auth/me"""

    async def test_get_me_authenticated(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/auth/me")
        assert resp.status_code == 200

        data = resp.json()
        assert data["email"] == TEST_USER["email"]
        assert data["name"] == TEST_USER["name"]
        assert "id" in data

    async def test_get_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401


# ============================================================================
# PUT /me
# ============================================================================


class TestUpdateMe:
    """PUT /api/auth/me"""

    async def test_update_name(self, authed_client: AsyncClient):
        csrf = authed_client.cookies.get("csrf_token")
        resp = await authed_client.put(
            "/api/auth/me",
            json={"name": "Updated Name"},
            headers={"X-CSRF-Token": csrf},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"
        # email unchanged
        assert resp.json()["email"] == TEST_USER["email"]

    async def test_update_email(self, authed_client: AsyncClient):
        csrf = authed_client.cookies.get("csrf_token")
        resp = await authed_client.put(
            "/api/auth/me",
            json={"email": "new@example.com"},
            headers={"X-CSRF-Token": csrf},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "new@example.com"

    async def test_update_duplicate_email(self, client: AsyncClient):
        """Changing email to one already taken returns 409."""
        # Register two users
        await client.post("/api/auth/register", json=TEST_USER)
        user2 = {**TEST_USER, "email": "other@example.com", "name": "Other"}
        resp2 = await client.post("/api/auth/register", json=user2)
        assert resp2.status_code == 201

        csrf = client.cookies.get("csrf_token")
        resp = await client.put(
            "/api/auth/me",
            json={"email": TEST_USER["email"]},  # try to take first user's email
            headers={"X-CSRF-Token": csrf},
        )
        assert resp.status_code == 409

    async def test_update_unauthenticated(self, client: AsyncClient):
        # CSRF check fires before auth, so unauthenticated PUT gets 403 (no CSRF token)
        resp = await client.put("/api/auth/me", json={"name": "Hacker"})
        assert resp.status_code == 403

    async def test_update_no_csrf(self, authed_client: AsyncClient):
        """PUT without CSRF header should fail."""
        resp = await authed_client.put(
            "/api/auth/me",
            json={"name": "No CSRF"},
        )
        assert resp.status_code == 403

    async def test_update_wrong_csrf(self, authed_client: AsyncClient):
        """PUT with wrong CSRF token should fail."""
        resp = await authed_client.put(
            "/api/auth/me",
            json={"name": "Wrong CSRF"},
            headers={"X-CSRF-Token": "wrong-token-value"},
        )
        assert resp.status_code == 403


# ============================================================================
# System categories seeded on registration
# ============================================================================


class TestCategorySeed:
    """Verify system categories are created when a user registers."""

    async def test_system_categories_exist(self, client: AsyncClient):
        """After registration, the user should have a System group and Uncategorized category."""
        import uuid as uuid_mod

        from sqlalchemy import select

        from app.models.category import Category
        from app.models.category_group import CategoryGroup
        from tests.conftest import _override_get_db

        resp = await client.post("/api/auth/register", json=TEST_USER)
        assert resp.status_code == 201
        user_id = uuid_mod.UUID(resp.json()["id"])

        # Query DB directly to verify seeding
        async for session in _override_get_db():
            # Check group
            groups = await session.execute(
                select(CategoryGroup).where(CategoryGroup.user_id == user_id)
            )
            group_list = groups.scalars().all()
            assert len(group_list) == 1
            assert group_list[0].name == "System"
            assert group_list[0].is_hidden is True

            # Check category
            cats = await session.execute(
                select(Category).where(Category.user_id == user_id)
            )
            cat_list = cats.scalars().all()
            assert len(cat_list) == 1
            assert cat_list[0].name == "Uncategorized"
            assert cat_list[0].is_default is True
            assert cat_list[0].source == "system"
            break


# ============================================================================
# Password hashing (unit)
# ============================================================================


class TestPasswordHashing:
    """Unit tests for hash_password / verify_password."""

    def test_hash_and_verify(self):
        from app.services.auth import hash_password, verify_password

        hashed = hash_password("mysecretpassword")
        assert hashed != "mysecretpassword"
        assert verify_password("mysecretpassword", hashed) is True
        assert verify_password("wrongpassword", hashed) is False


# ============================================================================
# JWT service (unit)
# ============================================================================


class TestJWT:
    """Unit tests for create_access_token / decode_access_token."""

    def test_create_and_decode(self):
        from app.services.auth import create_access_token, decode_access_token

        token = create_access_token("test-user-id")
        payload = decode_access_token(token)
        assert payload["sub"] == "test-user-id"
        assert "iat" in payload
        assert "exp" in payload

    def test_decode_invalid_token(self):
        import jwt as pyjwt

        from app.services.auth import decode_access_token

        with pytest.raises(pyjwt.PyJWTError):
            decode_access_token("invalid.token.here")
