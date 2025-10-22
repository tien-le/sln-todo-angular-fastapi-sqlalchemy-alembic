"""
Unit tests for TaskService.
"""
from datetime import datetime, timedelta
from uuid import uuid4

import pytest

from app.api.schemas.task import TaskCreate, TaskUpdate
from app.db.models.task import TaskPriority, TaskStatus
from app.services.task_service import TaskService
from app.tests.factories.task_factory import TaskFactory
from app.tests.factories.user_factory import UserFactory


@pytest.mark.asyncio
class TestTaskService:
    """Test TaskService business logic."""

    async def test_create_task_with_valid_data(self, db_session):
        """Test creating a task with valid data."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TaskService(db_session)
        task_data = TaskCreate(
            title="Test Task",
            description="Test Description",
            priority=TaskPriority.HIGH,
            due_date=datetime.utcnow() + timedelta(days=7)
        )

        # Act
        task = await service.create_task(user_id=user.id, task_in=task_data)

        # Assert
        assert task.title == "Test Task"
        assert task.description == "Test Description"
        assert task.priority == TaskPriority.HIGH
        assert task.status == TaskStatus.PENDING
        assert task.user_id == user.id
        assert task.id is not None

    async def test_create_task_with_minimal_data(self, db_session):
        """Test creating a task with only required fields."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TaskService(db_session)
        task_data = TaskCreate(title="Minimal Task")

        # Act
        task = await service.create_task(user_id=user.id, task_in=task_data)

        # Assert
        assert task.title == "Minimal Task"
        assert task.status == TaskStatus.PENDING
        assert task.priority == TaskPriority.MEDIUM
        assert task.description is None

    async def test_list_tasks_returns_only_user_tasks(self, db_session):
        """Test that list_tasks returns only the user's tasks."""
        # Arrange
        user1 = await UserFactory.create(db_session, email="user1@example.com")
        user2 = await UserFactory.create(db_session, email="user2@example.com")

        await TaskFactory.create(db_session, user_id=user1.id, title="User 1 Task")
        await TaskFactory.create(db_session, user_id=user2.id, title="User 2 Task")

        service = TaskService(db_session)

        # Act
        result = await service.list_tasks(user_id=user1.id)

        # Assert
        assert result.total == 1
        assert result.items[0].title == "User 1 Task"

    async def test_update_task_success(self, db_session):
        """Test successfully updating a task."""
        # Arrange
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(db_session, user_id=user.id)
        service = TaskService(db_session)

        update_data = TaskUpdate(
            title="Updated Title",
            status=TaskStatus.IN_PROGRESS
        )

        # Act
        updated_task = await service.update_task(
            task_id=task.id,
            user_id=user.id,
            task_in=update_data
        )

        # Assert
        assert updated_task is not None
        assert updated_task.title == "Updated Title"
        assert updated_task.status == TaskStatus.IN_PROGRESS

    async def test_update_task_not_found(self, db_session):
        """Test updating a non-existent task."""
        # Arrange
        user = await UserFactory.create(db_session)
        service = TaskService(db_session)

        # Act
        result = await service.update_task(
            task_id=uuid4(),
            user_id=user.id,
            task_in=TaskUpdate(title="Updated")
        )

        # Assert
        assert result is None

    async def test_delete_task_success(self, db_session):
        """Test soft deleting a task."""
        # Arrange
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(db_session, user_id=user.id)
        service = TaskService(db_session)

        # Act
        success = await service.delete_task(task_id=task.id, user_id=user.id)

        # Assert
        assert success is True

        # Verify task is marked as deleted
        result = await service.get_task(task_id=task.id, user_id=user.id)
        assert result is None

    async def test_complete_task_sets_status_and_timestamp(self, db_session):
        """Test completing a task sets status and completion time."""
        # Arrange
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(
            db_session,
            user_id=user.id,
            status=TaskStatus.IN_PROGRESS
        )
        service = TaskService(db_session)

        # Act
        completed_task = await service.complete_task(
            task_id=task.id,
            user_id=user.id
        )

        # Assert
        assert completed_task.status == TaskStatus.COMPLETED
        assert completed_task.completed_at is not None

    async def test_filter_tasks_by_status(self, db_session):
        """Test filtering tasks by status."""
        # Arrange
        user = await UserFactory.create(db_session)
        await TaskFactory.create(
            db_session, user_id=user.id, status=TaskStatus.PENDING
        )
        await TaskFactory.create(
            db_session, user_id=user.id, status=TaskStatus.COMPLETED
        )
        service = TaskService(db_session)

        # Act
        result = await service.list_tasks(
            user_id=user.id,
            status=TaskStatus.PENDING
        )

        # Assert
        assert result.total == 1
        assert result.items[0].status == TaskStatus.PENDING

    async def test_search_tasks_by_title(self, db_session):
        """Test searching tasks by title."""
        # Arrange
        user = await UserFactory.create(db_session)
        await TaskFactory.create(
            db_session, user_id=user.id, title="Buy groceries"
        )
        await TaskFactory.create(
            db_session, user_id=user.id, title="Write report"
        )
        service = TaskService(db_session)

        # Act
        result = await service.list_tasks(
            user_id=user.id,
            search="groceries"
        )

        # Assert
        assert result.total == 1
        assert "groceries" in result.items[0].title.lower()

    async def test_pagination(self, db_session):
        """Test task list pagination."""
        # Arrange
        user = await UserFactory.create(db_session)
        # Create 25 tasks
        for i in range(25):
            await TaskFactory.create(
                db_session, user_id=user.id, title=f"Task {i+1}"
            )

        service = TaskService(db_session)

        # Act - Get first page
        result = await service.list_tasks(
            user_id=user.id,
            page=1,
            page_size=10
        )

        # Assert
        assert result.total == 25
        assert len(result.items) == 10
        assert result.page == 1
        assert result.pages == 3

    async def test_reopen_task_success(self, db_session):
        """Test reopening a completed task."""
        # Arrange
        user = await UserFactory.create(db_session)
        task = await TaskFactory.create(
            db_session,
            user_id=user.id,
            status=TaskStatus.COMPLETED
        )
        service = TaskService(db_session)

        # Act
        reopened_task = await service.reopen_task(
            task_id=task.id,
            user_id=user.id
        )

        # Assert
        assert reopened_task.status == TaskStatus.PENDING
        assert reopened_task.completed_at is None
