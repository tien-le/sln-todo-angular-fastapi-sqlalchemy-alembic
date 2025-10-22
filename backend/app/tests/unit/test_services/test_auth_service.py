"""
Unit tests for AuthService.
"""
from uuid import uuid4

import pytest

from app.api.schemas.auth import LoginRequest
from app.services.auth_service import AuthService
from app.tests.factories.user_factory import UserFactory


@pytest.mark.asyncio
class TestAuthService:
    """Test AuthService business logic."""

    async def test_authenticate_user_success(self, db_session):
        """Test authenticating a user with correct credentials."""
        # Arrange
        user = await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )
        service = AuthService(db_session)

        # Act
        result = await service.authenticate_user("test@example.com", "correctpassword123")

        # Assert
        assert result is not None
        assert result.email == "test@example.com"
        assert result.id == user.id

    async def test_authenticate_user_wrong_password(self, db_session):
        """Test authenticating a user with wrong password."""
        # Arrange
        await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )
        service = AuthService(db_session)

        # Act
        result = await service.authenticate_user("test@example.com", "wrongpassword123")

        # Assert
        assert result is None

    async def test_authenticate_user_wrong_email(self, db_session):
        """Test authenticating a user with wrong email."""
        # Arrange
        await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )
        service = AuthService(db_session)

        # Act
        result = await service.authenticate_user("wrong@example.com", "correctpassword123")

        # Assert
        assert result is None

    async def test_authenticate_user_inactive(self, db_session):
        """Test authenticating an inactive user."""
        # Arrange
        await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123",
            is_active=False
        )
        service = AuthService(db_session)

        # Act
        result = await service.authenticate_user("test@example.com", "correctpassword123")

        # Assert
        assert result is None

    async def test_login_success(self, db_session):
        """Test successful login."""
        # Arrange
        user = await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )
        service = AuthService(db_session)
        login_request = LoginRequest(
            email="test@example.com",
            password="correctpassword123"
        )

        # Act
        result = await service.login(login_request)

        # Assert
        assert result is not None
        assert result.access_token is not None
        assert result.token_type == "bearer"
        assert result.user.email == "test@example.com"

    async def test_login_failure(self, db_session):
        """Test failed login."""
        # Arrange
        await UserFactory.create(
            db_session,
            email="test@example.com",
            password="correctpassword123"
        )
        service = AuthService(db_session)
        login_request = LoginRequest(
            email="test@example.com",
            password="wrongpassword123"
        )

        # Act
        result = await service.login(login_request)

        # Assert
        assert result is None

    async def test_get_current_user_success(self, db_session):
        """Test getting current user."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = AuthService(db_session)

        # Act
        result = await service.get_current_user(user.id)

        # Assert
        assert result is not None
        assert result.id == user.id
        assert result.email == user.email

    async def test_get_current_user_not_found(self, db_session):
        """Test getting non-existent current user."""
        # Arrange
        service = AuthService(db_session)

        # Act
        result = await service.get_current_user(uuid4())

        # Assert
        assert result is None

    async def test_get_current_user_inactive(self, db_session):
        """Test getting inactive current user."""
        # Arrange
        user = await UserFactory.create(db_session, is_active=False)
        service = AuthService(db_session)

        # Act
        result = await service.get_current_user(user.id)

        # Assert
        assert result is None

    async def test_refresh_token_success(self, db_session):
        """Test refreshing token for active user."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = AuthService(db_session)

        # Act
        result = await service.refresh_token(user.id)

        # Assert
        assert result is not None
        assert result.access_token is not None
        assert result.token_type == "bearer"

    async def test_refresh_token_inactive_user(self, db_session):
        """Test refreshing token for inactive user."""
        # Arrange
        user = await UserFactory.create(db_session, is_active=False)
        service = AuthService(db_session)

        # Act
        result = await service.refresh_token(user.id)

        # Assert
        assert result is None

    async def test_refresh_token_user_not_found(self, db_session):
        """Test refreshing token for non-existent user."""
        # Arrange
        service = AuthService(db_session)

        # Act
        result = await service.refresh_token(uuid4())

        # Assert
        assert result is None
