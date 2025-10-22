"""
Integration tests for users API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestUsersAPI:
    """Integration tests for users API endpoints."""

    async def test_get_current_user_profile(
        self,
        authenticated_client: AsyncClient
    ):
        """Test getting current user profile."""
        response = await authenticated_client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "is_active" in data

    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without authentication."""
        response = await client.get("/api/v1/users/me")

        assert response.status_code == 401

    async def test_update_current_user_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating current user profile."""
        update_data = {
            "full_name": "Updated Name"
        }

        response = await authenticated_client.put(
            "/api/v1/users/me",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"

    async def test_update_current_user_invalid_data(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating current user with invalid data."""
        update_data = {
            "full_name": "x" * 300  # Too long
        }

        response = await authenticated_client.put(
            "/api/v1/users/me",
            json=update_data
        )

        assert response.status_code == 422

    async def test_change_password_success(
        self,
        authenticated_client: AsyncClient,
        test_user
    ):
        """Test changing password with correct current password."""
        password_data = {
            "current_password": test_user._plain_password,
            "new_password": "newpassword123"
        }

        response = await authenticated_client.put(
            "/api/v1/users/me/password",
            json=password_data
        )

        assert response.status_code == 200
        data = response.json()
        assert "Password changed successfully" in data["message"]

    async def test_change_password_wrong_current_password(
        self,
        authenticated_client: AsyncClient
    ):
        """Test changing password with wrong current password."""
        password_data = {
            "current_password": "wrongpassword123",
            "new_password": "newpassword123"
        }

        response = await authenticated_client.put(
            "/api/v1/users/me/password",
            json=password_data
        )

        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

    async def test_change_password_invalid_data(
        self,
        authenticated_client: AsyncClient
    ):
        """Test changing password with invalid data."""
        password_data = {
            "current_password": "password123",
            "new_password": "123"  # Too short
        }

        response = await authenticated_client.put(
            "/api/v1/users/me/password",
            json=password_data
        )

        assert response.status_code == 422

    async def test_delete_current_user_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test deleting current user account."""
        response = await authenticated_client.delete("/api/v1/users/me")

        assert response.status_code == 204

    async def test_delete_current_user_unauthorized(self, client: AsyncClient):
        """Test deleting current user without authentication."""
        response = await client.delete("/api/v1/users/me")

        assert response.status_code == 401
