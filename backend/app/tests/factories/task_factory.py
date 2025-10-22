"""
Task factory for creating test tasks.
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.task import Task, TaskPriority, TaskStatus


class TaskFactory:
    """Factory for creating test tasks."""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status: TaskStatus = TaskStatus.PENDING,
        priority: TaskPriority = TaskPriority.MEDIUM,
        due_date: Optional[datetime] = None,
    ) -> Task:
        """
        Create a task in the database.

        Args:
            db: Database session
            user_id: User ID who owns the task
            title: Task title
            description: Task description
            status: Task status
            priority: Task priority
            due_date: Task due date

        Returns:
            Created task instance
        """
        task = Task(
            user_id=user_id,
            title=title or "Test Task",
            description=description or "Test task description",
            status=status,
            priority=priority,
            due_date=due_date or datetime.utcnow() + timedelta(days=7),
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)

        return task

    @staticmethod
    async def create_batch(
        db: AsyncSession, user_id: UUID, count: int = 5
    ) -> list[Task]:
        """
        Create multiple tasks.

        Args:
            db: Database session
            user_id: User ID who owns the tasks
            count: Number of tasks to create

        Returns:
            List of created tasks
        """
        tasks = []
        for i in range(count):
            task = await TaskFactory.create(
                db=db, user_id=user_id, title=f"Test Task {i+1}"
            )
            tasks.append(task)
        return tasks

    @staticmethod
    def build(**kwargs) -> dict:
        """
        Build task data without saving to database.

        Returns:
            Dictionary with task data
        """
        return {
            "title": kwargs.get("title", "Test Task"),
            "description": kwargs.get("description", "Test task description"),
            "status": kwargs.get("status", TaskStatus.PENDING),
            "priority": kwargs.get("priority", TaskPriority.MEDIUM),
            "due_date": kwargs.get("due_date", datetime.utcnow() + timedelta(days=7)),
        }
