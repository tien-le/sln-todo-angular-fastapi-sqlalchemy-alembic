"""
Tests for database models.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.tag import Tag
from app.db.models.task import Task, TaskPriority, TaskStatus
from app.tests.factories.tag_factory import TagFactory
from app.tests.factories.task_factory import TaskFactory
from app.tests.factories.user_factory import UserFactory


@pytest.mark.asyncio
class TestUserModel:
    """Test User model."""

    async def test_create_user(self, db_session):
        """Test creating a user."""
        user = await UserFactory.create(
            db_session, email="test@example.com", full_name="Test User"
        )

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.is_active is True
        assert user.is_superuser is False
        assert user.created_at is not None
        assert user.updated_at is not None

    async def test_user_email_unique(self, db_session):
        """Test that user email must be unique."""
        email = "unique@example.com"
        await UserFactory.create(db_session, email=email)

        # Try to create another user with same email
        with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
            await UserFactory.create(db_session, email=email)

    async def test_user_repr(self, db_session):
        """Test user __repr__ method."""
        user = await UserFactory.create(db_session, email="repr@example.com")
        assert repr(user) == "<User repr@example.com>"


@pytest.mark.asyncio
class TestTaskModel:
    """Test Task model."""

    async def test_create_task(self, db_session):
        """Test creating a task."""
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(
            db_session,
            user_id=user.id,
            title="Test Task",
            description="Task description",
        )

        assert task.id is not None
        assert task.user_id == user.id
        assert task.title == "Test Task"
        assert task.description == "Task description"
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.MEDIUM
        assert task.is_deleted is False
        assert task.created_at is not None
        assert task.updated_at is not None

    async def test_task_default_values(self, db_session):
        """Test task default values."""
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(db_session, user_id=user.id, title="Task")

        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.MEDIUM
        assert task.is_deleted is False
        assert task.completed_at is None

    async def test_task_user_relationship(self, db_session):
        """Test task-user relationship."""
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(db_session, user_id=user.id)

        # Access relationship
        await db_session.refresh(task, ["user"])
        assert task.user.id == user.id
        assert task.user.email == user.email

    async def test_task_cascade_delete_with_user(self, db_session):
        """Test that tasks are deleted when user is deleted (cascade)."""
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(db_session, user_id=user.id)

        # Delete user
        await db_session.delete(user)
        await db_session.commit()

        # Task should be deleted too
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        deleted_task = result.scalar_one_or_none()
        assert deleted_task is None

    async def test_task_repr(self, db_session):
        """Test task __repr__ method."""
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(
            db_session, user_id=user.id, title="My Task", status=TaskStatus.IN_PROGRESS
        )
        assert repr(task) == "<Task My Task (in_progress)>"


@pytest.mark.asyncio
class TestTagModel:
    """Test Tag model."""

    async def test_create_tag(self, db_session):
        """Test creating a tag."""
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(
            db_session, user_id=user.id, name="Important", color="#FF0000"
        )

        assert tag.id is not None
        assert tag.user_id == user.id
        assert tag.name == "Important"
        assert tag.color == "#FF0000"
        assert tag.created_at is not None

    async def test_tag_default_color(self, db_session):
        """Test tag default color."""
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(db_session, user_id=user.id, name="Test")

        assert tag.color == "#6B7280"

    async def test_tag_user_unique_constraint(self, db_session):
        """Test that tag name must be unique per user."""
        user = await UserFactory.create(db_session)
        tag_name = "UniqueTag"

        await TagFactory.create(db_session, user_id=user.id, name=tag_name)

        # Try to create another tag with same name for same user
        with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
            await TagFactory.create(db_session, user_id=user.id, name=tag_name)

    async def test_tag_different_users_same_name(self, db_session):
        """Test that different users can have tags with same name."""
        user1 = await UserFactory.create(db_session, email="user1@example.com")
        user2 = await UserFactory.create(db_session, email="user2@example.com")
        tag_name = "Work"

        tag1 = await TagFactory.create(db_session, user_id=user1.id, name=tag_name)
        tag2 = await TagFactory.create(db_session, user_id=user2.id, name=tag_name)

        assert tag1.name == tag2.name
        assert tag1.user_id != tag2.user_id

    async def test_tag_cascade_delete_with_user(self, db_session):
        """Test that tags are deleted when user is deleted (cascade)."""
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(db_session, user_id=user.id)

        # Delete user
        await db_session.delete(user)
        await db_session.commit()

        # Tag should be deleted too
        result = await db_session.execute(select(Tag).where(Tag.id == tag.id))
        deleted_tag = result.scalar_one_or_none()
        assert deleted_tag is None

    async def test_tag_repr(self, db_session):
        """Test tag __repr__ method."""
        user = await UserFactory.create(db_session)
        tag = await TagFactory.create(db_session, user_id=user.id, name="MyTag")
        assert repr(tag) == "<Tag MyTag>"


@pytest.mark.asyncio
class TestTaskTagRelationship:
    """Test Task-Tag many-to-many relationship."""

    async def test_associate_tags_with_task(self, db_session):
        """Test associating tags with a task."""
        user = await UserFactory.create(db_session)

        # Create task with eager loading of tags relationship
        result = await db_session.execute(
            select(Task).options(selectinload(Task.tags))
        )
        # Create task fresh
        task = await TaskFactory.create(db_session, user_id=user.id)
        tags = await TagFactory.create_batch(db_session, user_id=user.id, count=3)

        # Re-fetch task with tags relationship loaded
        result = await db_session.execute(
            select(Task).options(selectinload(Task.tags)).where(Task.id == task.id)
        )
        task_with_tags = result.scalar_one()

        # Associate tags with task
        task_with_tags.tags.extend(tags)
        await db_session.commit()

        # Re-query to verify
        result = await db_session.execute(
            select(Task).options(selectinload(Task.tags)).where(Task.id == task.id)
        )
        updated_task = result.scalar_one()

        assert len(updated_task.tags) == 3
        assert all(tag.id in [t.id for t in updated_task.tags] for tag in tags)

    async def test_task_cascade_delete_with_tags(self, db_session):
        """Test that task-tag associations are deleted when task is deleted."""
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(db_session, user_id=user.id)
        tags = await TagFactory.create_batch(db_session, user_id=user.id, count=2)

        # Re-fetch task with tags relationship loaded
        result = await db_session.execute(
            select(Task).options(selectinload(Task.tags)).where(Task.id == task.id)
        )
        task_with_tags = result.scalar_one()

        # Associate tags
        task_with_tags.tags.extend(tags)
        await db_session.commit()
        task_id = task.id

        # Delete task
        await db_session.delete(task)
        await db_session.commit()

        # Verify task is deleted
        result = await db_session.execute(select(Task).where(Task.id == task_id))
        deleted_task = result.scalar_one_or_none()
        assert deleted_task is None

        # Tags should still exist
        for tag in tags:
            result = await db_session.execute(select(Tag).where(Tag.id == tag.id))
            existing_tag = result.scalar_one_or_none()
            assert existing_tag is not None
