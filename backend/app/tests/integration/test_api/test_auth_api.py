"""
Integration tests for authentication API endpoints.
"""
import pytest
from httpx import AsyncClient

from app.tests.factories.user_factory import UserFactory


@pytest.mark.asyncio
class TestAuthAPI:
    """Integration tests for auth API endpoints."""

    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        user_data = {
            "email": "newuser@example.com",
            "password": "securepassword123",
            "full_name": "New User"
        }

        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert data["is_active"] is True
        assert data["is_superuser"] is False
        assert "id" in data

    async def test_register_duplicate_email(self, client: AsyncClient, db_session):
        """Test registration with duplicate email."""
        # Create existing user
        await UserFactory.create(db_session, email="existing@example.com")

        user_data = {
            "email": "existing@example.com",
            "password": "password123",
            "full_name": "Duplicate User"
        }

        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    async def test_register_invalid_data(self, client: AsyncClient):
        """Test registration with invalid data."""
        user_data = {
            "email": "invalid-email",
            "password": "123",  # Too short
            "full_name": "Invalid User"
        }

        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 422

    async def test_login_success(self, client: AsyncClient, db_session):
        """Test successful login."""
        # Create user
        user = await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )

        login_data = {
            "email": "test@example.com",
            "password": "correctpassword123"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["user"]["email"] == "test@example.com"

    async def test_login_wrong_password(self, client: AsyncClient, db_session):
        """Test login with wrong password."""
        # Create user
        await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )

        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword123"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    async def test_login_inactive_user(self, client: AsyncClient, db_session):
        """Test login with inactive user."""
        # Create inactive user
        await UserFactory.create(
            db_session,
            email="inactive@example.com",
            password="password123",
            is_active=False
        )

        login_data = {
            "email": "inactive@example.com",
            "password": "password123"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    async def test_get_current_user_success(self, authenticated_client: AsyncClient):
        """Test getting current user information."""
        response = await authenticated_client.get("/api/v1/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "is_active" in data

    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without authentication."""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 401

    async def test_refresh_token_success(self, authenticated_client: AsyncClient):
        """Test refreshing access token."""
        response = await authenticated_client.post("/api/v1/auth/refresh")

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    async def test_refresh_token_unauthorized(self, client: AsyncClient):
        """Test refreshing token without authentication."""
        response = await client.post("/api/v1/auth/refresh")

        assert response.status_code == 401
