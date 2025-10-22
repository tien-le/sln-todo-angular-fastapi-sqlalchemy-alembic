"""
Integration tests for tasks API endpoints.
"""
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from app.db.models.task import TaskPriority, TaskStatus
from app.tests.factories.task_factory import TaskFactory


@pytest.mark.asyncio
class TestTasksAPI:
    """Integration tests for tasks API endpoints."""

    async def test_list_tasks_unauthenticated(self, client: AsyncClient):
        """Test listing tasks without authentication returns 401."""
        response = await client.get("/api/v1/tasks")
        assert response.status_code == 401

    async def test_create_task_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test creating a task via API."""
        task_data = {
            "title": "New Task",
            "description": "Task description",
            "priority": "high",
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }

        response = await authenticated_client.post(
            "/api/v1/tasks",
            json=task_data
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Task"
        assert data["priority"] == "high"
        assert "id" in data

    async def test_create_task_validation_error(
        self,
        authenticated_client: AsyncClient
    ):
        """Test creating a task with invalid data."""
        task_data = {
            "title": "",  # Empty title should fail validation
            "priority": "invalid_priority"
        }

        response = await authenticated_client.post(
            "/api/v1/tasks",
            json=task_data
        )

        assert response.status_code == 422

    async def test_get_task_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test retrieving a specific task."""
        task = await TaskFactory.create(db_session, user_id=test_user.id)

        response = await authenticated_client.get(f"/api/v1/tasks/{task.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(task.id)
        assert data["title"] == task.title

    async def test_get_task_not_found(
        self,
        authenticated_client: AsyncClient
    ):
        """Test retrieving a non-existent task."""
        from uuid import uuid4
        fake_id = uuid4()

        response = await authenticated_client.get(f"/api/v1/tasks/{fake_id}")

        assert response.status_code == 404

    async def test_update_task_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test updating a task."""
        task = await TaskFactory.create(db_session, user_id=test_user.id)

        update_data = {
            "title": "Updated Title",
            "status": "in_progress"
        }

        response = await authenticated_client.put(
            f"/api/v1/tasks/{task.id}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["status"] == "in_progress"

    async def test_delete_task_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test deleting a task."""
        task = await TaskFactory.create(db_session, user_id=test_user.id)

        response = await authenticated_client.delete(f"/api/v1/tasks/{task.id}")

        assert response.status_code == 204

        # Verify task is deleted
        get_response = await authenticated_client.get(f"/api/v1/tasks/{task.id}")
        assert get_response.status_code == 404

    async def test_complete_task_endpoint(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test completing a task via endpoint."""
        task = await TaskFactory.create(
            db_session,
            user_id=test_user.id,
            status=TaskStatus.IN_PROGRESS
        )

        response = await authenticated_client.patch(
            f"/api/v1/tasks/{task.id}/complete"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None

    async def test_reopen_task_endpoint(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test reopening a completed task via endpoint."""
        task = await TaskFactory.create(
            db_session,
            user_id=test_user.id,
            status=TaskStatus.COMPLETED
        )

        response = await authenticated_client.patch(
            f"/api/v1/tasks/{task.id}/reopen"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["completed_at"] is None

    async def test_filter_tasks_by_status(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test filtering tasks by status."""
        await TaskFactory.create(
            db_session, user_id=test_user.id, status=TaskStatus.PENDING
        )
        await TaskFactory.create(
            db_session, user_id=test_user.id, status=TaskStatus.COMPLETED
        )

        response = await authenticated_client.get(
            "/api/v1/tasks?status=pending"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "pending"

    async def test_filter_tasks_by_priority(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test filtering tasks by priority."""
        await TaskFactory.create(
            db_session, user_id=test_user.id, priority=TaskPriority.HIGH
        )
        await TaskFactory.create(
            db_session, user_id=test_user.id, priority=TaskPriority.LOW
        )

        response = await authenticated_client.get(
            "/api/v1/tasks?priority=high"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["priority"] == "high"

    async def test_search_tasks(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test searching tasks by title."""
        await TaskFactory.create(
            db_session, user_id=test_user.id, title="Buy groceries"
        )
        await TaskFactory.create(
            db_session, user_id=test_user.id, title="Write report"
        )

        response = await authenticated_client.get(
            "/api/v1/tasks?search=groceries"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert "groceries" in data["items"][0]["title"].lower()

    async def test_pagination(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test task list pagination."""
        # Create 25 tasks
        await TaskFactory.create_batch(db_session, user_id=test_user.id, count=25)

        # Get first page
        response = await authenticated_client.get(
            "/api/v1/tasks?page=1&page_size=10"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["pages"] == 3

    async def test_sort_tasks(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test sorting tasks."""
        await TaskFactory.create(
            db_session, user_id=test_user.id, title="Task A"
        )
        await TaskFactory.create(
            db_session, user_id=test_user.id, title="Task B"
        )

        response = await authenticated_client.get(
            "/api/v1/tasks?sort_by=title"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["title"] == "Task A"
        assert data["items"][1]["title"] == "Task B"

    async def test_sort_tasks_descending(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test sorting tasks in descending order."""
        await TaskFactory.create(
            db_session, user_id=test_user.id, title="Task A"
        )
        await TaskFactory.create(
            db_session, user_id=test_user.id, title="Task B"
        )

        response = await authenticated_client.get(
            "/api/v1/tasks?sort_by=-title"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["title"] == "Task B"
        assert data["items"][1]["title"] == "Task A"
