"""
Unit tests for UserService.
"""
from uuid import uuid4

import pytest

from app.api.schemas.user import PasswordChange, UserCreate, UserUpdate
from app.services.user_service import UserService
from app.tests.factories.user_factory import UserFactory


@pytest.mark.asyncio
class TestUserService:
    """Test UserService business logic."""

    async def test_create_user_success(self, db_session):
        """Test creating a user with valid data."""
        # Arrange
        service = UserService(db_session)
        user_data = UserCreate(
            email="newuser@example.com",
            password="securepassword123",
            full_name="New User"
        )

        # Act
        user = await service.create_user(user_data)

        # Assert
        assert user.email == "newuser@example.com"
        assert user.full_name == "New User"
        assert user.is_active is True
        assert user.is_superuser is False
        assert user.id is not None

    async def test_create_user_duplicate_email(self, db_session):
        """Test creating a user with duplicate email raises error."""
        # Arrange
        email = "duplicate@example.com"
        await UserFactory.create(db_session, email=email)
        service = UserService(db_session)
        user_data = UserCreate(
            email=email,
            password="password123",
            full_name="Duplicate User"
        )

        # Act & Assert
        with pytest.raises(ValueError, match="Email already registered"):
            await service.create_user(user_data)

    async def test_get_user_success(self, db_session):
        """Test getting a user by ID."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = UserService(db_session)

        # Act
        result = await service.get_user(user.id)

        # Assert
        assert result is not None
        assert result.id == user.id
        assert result.email == user.email

    async def test_get_user_not_found(self, db_session):
        """Test getting a non-existent user."""
        # Arrange
        service = UserService(db_session)

        # Act
        result = await service.get_user(uuid4())

        # Assert
        assert result is None

    async def test_get_user_by_email_success(self, db_session):
        """Test getting a user by email."""
        # Arrange
        user = await UserFactory.create(db_session, email="test@example.com")
        service = UserService(db_session)

        # Act
        result = await service.get_user_by_email("test@example.com")

        # Assert
        assert result is not None
        assert result.email == "test@example.com"

    async def test_get_user_by_email_not_found(self, db_session):
        """Test getting a user by non-existent email."""
        # Arrange
        service = UserService(db_session)

        # Act
        result = await service.get_user_by_email("nonexistent@example.com")

        # Assert
        assert result is None

    async def test_update_user_success(self, db_session):
        """Test updating a user."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = UserService(db_session)
        update_data = UserUpdate(full_name="Updated Name")

        # Act
        updated_user = await service.update_user(user.id, update_data)

        # Assert
        assert updated_user is not None
        assert updated_user.full_name == "Updated Name"
        assert updated_user.email == user.email

    async def test_update_user_not_found(self, db_session):
        """Test updating a non-existent user."""
        # Arrange
        service = UserService(db_session)
        update_data = UserUpdate(full_name="Updated Name")

        # Act
        result = await service.update_user(uuid4(), update_data)

        # Assert
        assert result is None

    async def test_change_password_success(self, db_session):
        """Test changing password with correct current password."""
        # Arrange
        user = await UserFactory.create(db_session, password="oldpassword123")
        service = UserService(db_session)
        password_change = PasswordChange(
            current_password="oldpassword123",
            new_password="newpassword123"
        )

        # Act
        success = await service.change_password(user.id, password_change)

        # Assert
        assert success is True

    async def test_change_password_wrong_current_password(self, db_session):
        """Test changing password with wrong current password."""
        # Arrange
        user = await UserFactory.create(db_session, password="correctpassword123")
        service = UserService(db_session)
        password_change = PasswordChange(
            current_password="wrongpassword123",
            new_password="newpassword123"
        )

        # Act
        success = await service.change_password(user.id, password_change)

        # Assert
        assert success is False

    async def test_change_password_user_not_found(self, db_session):
        """Test changing password for non-existent user."""
        # Arrange
        service = UserService(db_session)
        password_change = PasswordChange(
            current_password="oldpassword123",
            new_password="newpassword123"
        )

        # Act
        success = await service.change_password(uuid4(), password_change)

        # Assert
        assert success is False

    async def test_deactivate_user_success(self, db_session):
        """Test deactivating a user."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = UserService(db_session)

        # Act
        success = await service.deactivate_user(user.id)

        # Assert
        assert success is True

    async def test_deactivate_user_not_found(self, db_session):
        """Test deactivating a non-existent user."""
        # Arrange
        service = UserService(db_session)

        # Act
        success = await service.deactivate_user(uuid4())

        # Assert
        assert success is False

    async def test_activate_user_success(self, db_session):
        """Test activating a user."""
        # Arrange
        user = await UserFactory.create(db_session, is_active=False)
        service = UserService(db_session)

        # Act
        success = await service.activate_user(user.id)

        # Assert
        assert success is True

    async def test_delete_user_success(self, db_session):
        """Test deleting a user (soft delete)."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = UserService(db_session)

        # Act
        success = await service.delete_user(user.id)

        # Assert
        assert success is True
