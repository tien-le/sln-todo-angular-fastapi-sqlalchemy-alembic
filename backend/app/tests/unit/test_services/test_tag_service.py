"""
Unit tests for TagService.
"""
from uuid import uuid4

import pytest

from app.api.schemas.tag import TagCreate, TagUpdate
from app.services.tag_service import TagService
from app.tests.factories.tag_factory import TagFactory
from app.tests.factories.user_factory import UserFactory


@pytest.mark.asyncio
class TestTagService:
    """Test TagService business logic."""

    async def test_create_tag_success(self, db_session):
        """Test creating a tag with valid data."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TagService(db_session)
        tag_data = TagCreate(
            name="Work",
            color="#FF5733"
        )

        # Act
        tag = await service.create_tag(user_id=user.id, tag_in=tag_data)

        # Assert
        assert tag.name == "Work"
        assert tag.color == "#FF5733"
        assert tag.user_id == user.id
        assert tag.id is not None

    async def test_create_tag_duplicate_name(self, db_session):
        """Test creating a tag with duplicate name raises error."""
        # Arrange
        user = await UserFactory.create(db_session)
        await TagFactory.create(db_session, user_id=user.id, name="Work")
        service = TagService(db_session)
        tag_data = TagCreate(name="Work", color="#FF5733")

        # Act & Assert
        with pytest.raises(ValueError, match="Tag name already exists"):
            await service.create_tag(user_id=user.id, tag_in=tag_data)

    async def test_list_tags_success(self, db_session):
        """Test listing tags for a user."""
        # Arrange
        user = await UserFactory.create(db_session)
        await TagFactory.create(db_session, user_id=user.id, name="Work")
        await TagFactory.create(db_session, user_id=user.id, name="Personal")
        service = TagService(db_session)

        # Act
        result = await service.list_tags(user_id=user.id)

        # Assert
        assert result.total == 2
        assert len(result.items) == 2
        assert result.page == 1

    async def test_list_tags_empty(self, db_session):
        """Test listing tags for user with no tags."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TagService(db_session)

        # Act
        result = await service.list_tags(user_id=user.id)

        # Assert
        assert result.total == 0
        assert len(result.items) == 0

    async def test_get_tag_success(self, db_session):
        """Test getting a tag by ID."""
        # Arrange
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(db_session, user_id=user.id, name="Work")
        service = TagService(db_session)

        # Act
        result = await service.get_tag(tag.id, user.id)

        # Assert
        assert result is not None
        assert result.name == "Work"
        assert result.id == tag.id

    async def test_get_tag_not_found(self, db_session):
        """Test getting a non-existent tag."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TagService(db_session)

        # Act
        result = await service.get_tag(uuid4(), user.id)

        # Assert
        assert result is None

    async def test_get_tag_wrong_user(self, db_session):
        """Test getting a tag belonging to another user."""
        # Arrange
        user1 = await UserFactory.create(db_session, email="user1@example.com")
        user2 = await UserFactory.create(db_session, email="user2@example.com")
        tag = await TagFactory.create(db_session, user_id=user1.id, name="Work")
        service = TagService(db_session)

        # Act
        result = await service.get_tag(tag.id, user2.id)

        # Assert
        assert result is None

    async def test_update_tag_success(self, db_session):
        """Test updating a tag."""
        # Arrange
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(db_session, user_id=user.id, name="Work")
        service = TagService(db_session)
        update_data = TagUpdate(name="Updated Work", color="#00FF00")

        # Act
        updated_tag = await service.update_tag(tag.id, user.id, update_data)

        # Assert
        assert updated_tag is not None
        assert updated_tag.name == "Updated Work"
        assert updated_tag.color == "#00FF00"

    async def test_update_tag_not_found(self, db_session):
        """Test updating a non-existent tag."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TagService(db_session)
        update_data = TagUpdate(name="Updated Work")

        # Act
        result = await service.update_tag(uuid4(), user.id, update_data)

        # Assert
        assert result is None

    async def test_update_tag_duplicate_name(self, db_session):
        """Test updating a tag with duplicate name raises error."""
        # Arrange
        user = await UserFactory.create(db_session)
        await TagFactory.create(db_session, user_id=user.id, name="Work")
        tag = await TagFactory.create(db_session, user_id=user.id, name="Personal")
        service = TagService(db_session)
        update_data = TagUpdate(name="Work")

        # Act & Assert
        with pytest.raises(ValueError, match="Tag name already exists"):
            await service.update_tag(tag.id, user.id, update_data)

    async def test_delete_tag_success(self, db_session):
        """Test deleting a tag."""
        # Arrange
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(db_session, user_id=user.id, name="Work")
        service = TagService(db_session)

        # Act
        success = await service.delete_tag(tag.id, user.id)

        # Assert
        assert success is True

    async def test_delete_tag_not_found(self, db_session):
        """Test deleting a non-existent tag."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TagService(db_session)

        # Act
        success = await service.delete_tag(uuid4(), user.id)

        # Assert
        assert success is False

    async def test_pagination(self, db_session):
        """Test tag list pagination."""
        # Arrange
        user = await UserFactory.create(db_session)
        # Create 25 tags
        for i in range(25):
            await TagFactory.create(
                db_session, user_id=user.id, name=f"Tag {i+1}"
            )

        service = TagService(db_session)

        # Act - Get first page
        result = await service.list_tags(
            user_id=user.id,
            page=1,
            page_size=10
        )

        # Assert
        assert result.total == 25
        assert len(result.items) == 10
        assert result.page == 1
        assert result.pages == 3
