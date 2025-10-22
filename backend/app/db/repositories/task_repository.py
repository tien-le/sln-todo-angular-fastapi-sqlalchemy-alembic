"""
Task-specific repository operations.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.tag import Tag
from app.db.models.task import Task, TaskPriority, TaskStatus
from app.db.repositories.base_repository import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """Repository for Task model with specific operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(Task, db)

    async def get_by_user(
        self,
        user_id: UUID,
        task_id: UUID,
        include_deleted: bool = False
    ) -> Optional[Task]:
        """Get a task by ID for a specific user."""
        query = select(Task).where(
            and_(
                Task.id == task_id,
                Task.user_id == user_id
            )
        )

        if not include_deleted:
            query = query.where(Task.is_deleted == False)

        query = query.options(selectinload(Task.tags))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        tag_ids: Optional[List[UUID]] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        include_deleted: bool = False
    ) -> List[Task]:
        """List tasks for a user with filtering and sorting."""
        query = select(Task).where(Task.user_id == user_id)

        if not include_deleted:
            query = query.where(Task.is_deleted == False)

        # Apply filters
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if search:
            query = query.where(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )
        if tag_ids:
            query = query.join(Task.tags).where(Tag.id.in_(tag_ids))

        # Apply sorting
        descending = sort_by.startswith("-")
        field = sort_by.lstrip("-")
        if hasattr(Task, field):
            order_col = getattr(Task, field)
            query = query.order_by(
                order_col.desc() if descending else order_col.asc()
            )

        query = query.options(selectinload(Task.tags))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_by_user(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        tag_ids: Optional[List[UUID]] = None,
        search: Optional[str] = None,
        include_deleted: bool = False
    ) -> int:
        """Count tasks for a user with filtering."""
        query = select(func.count()).select_from(Task).where(Task.user_id == user_id)

        if not include_deleted:
            query = query.where(Task.is_deleted == False)

        # Apply filters
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if search:
            query = query.where(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )
        if tag_ids:
            query = query.join(Task.tags).where(Tag.id.in_(tag_ids))

        result = await self.db.execute(query)
        return result.scalar()

    async def soft_delete(self, task_id: UUID, user_id: UUID) -> bool:
        """Soft delete a task (mark as deleted)."""
        task = await self.get_by_user(user_id, task_id)
        if task:
            task.is_deleted = True
            await self.db.flush()
            return True
        return False

    async def complete_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        """Mark a task as completed."""
        task = await self.get_by_user(user_id, task_id)
        if task:
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            await self.db.flush()
            await self.db.refresh(task, ["tags"])
            return task
        return None

    async def reopen_task(self, task_id: UUID, user_id: UUID) -> Optional[Task]:
        """Reopen a completed task."""
        task = await self.get_by_user(user_id, task_id)
        if task and task.status == TaskStatus.COMPLETED:
            task.status = TaskStatus.PENDING
            task.completed_at = None
            await self.db.flush()
            await self.db.refresh(task, ["tags"])
            return task
        return None

    async def associate_tags(self, task: Task, tag_ids: List[UUID]) -> None:
        """Associate tags with a task."""
        # Clear existing tags
        task.tags.clear()

        # Add new tags
        if tag_ids:
            result = await self.db.execute(
                select(Tag).where(
                    and_(
                        Tag.id.in_(tag_ids),
                        Tag.user_id == task.user_id
                    )
                )
            )
            tags = result.scalars().all()
            task.tags.extend(tags)
            await self.db.flush()
