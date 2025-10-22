"""
Task service with business logic.
"""
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.task import TaskCreate, TaskList, TaskOut, TaskUpdate
from app.db.models.task import TaskStatus
from app.db.repositories.task_repository import TaskRepository


class TaskService:
    """Service for task-related business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = TaskRepository(db)

    async def list_tasks(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[TaskStatus] = None,
        priority: Optional[str] = None,
        tag_ids: Optional[List[UUID]] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at"
    ) -> TaskList:
        """List tasks with filtering, search, and pagination."""
        skip = (page - 1) * page_size

        tasks = await self.repository.list_by_user(
            user_id=user_id,
            skip=skip,
            limit=page_size,
            status=status,
            priority=priority,
            tag_ids=tag_ids,
            search=search,
            sort_by=sort_by
        )

        total = await self.repository.count_by_user(
            user_id=user_id,
            status=status,
            priority=priority,
            tag_ids=tag_ids,
            search=search
        )

        return TaskList(
            items=[TaskOut.model_validate(task) for task in tasks],
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size
        )

    async def create_task(
        self,
        user_id: UUID,
        task_in: TaskCreate
    ) -> TaskOut:
        """Create a new task."""
        task_data = task_in.model_dump(exclude={"tag_ids"})
        task_data["user_id"] = user_id

        task = await self.repository.create(task_data)

        # Associate tags if provided
        if task_in.tag_ids:
            await self.repository.associate_tags(task, task_in.tag_ids)

        await self.db.refresh(task, ["tags"])
        return TaskOut.model_validate(task)

    async def get_task(
        self,
        task_id: UUID,
        user_id: UUID
    ) -> Optional[TaskOut]:
        """Get a task by ID."""
        task = await self.repository.get_by_user(user_id, task_id)
        return TaskOut.model_validate(task) if task else None

    async def update_task(
        self,
        task_id: UUID,
        user_id: UUID,
        task_in: TaskUpdate
    ) -> Optional[TaskOut]:
        """Update a task."""
        task = await self.repository.get_by_user(user_id, task_id)
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True, exclude={"tag_ids"})

        for field, value in update_data.items():
            if hasattr(task, field):
                setattr(task, field, value)

        # Update tags if provided
        if task_in.tag_ids is not None:
            await self.repository.associate_tags(task, task_in.tag_ids)

        await self.db.flush()
        await self.db.refresh(task, ["tags"])
        return TaskOut.model_validate(task)

    async def delete_task(
        self,
        task_id: UUID,
        user_id: UUID
    ) -> bool:
        """Soft delete a task."""
        return await self.repository.soft_delete(task_id, user_id)

    async def complete_task(
        self,
        task_id: UUID,
        user_id: UUID
    ) -> Optional[TaskOut]:
        """Mark a task as completed."""
        task = await self.repository.complete_task(task_id, user_id)
        return TaskOut.model_validate(task) if task else None

    async def reopen_task(
        self,
        task_id: UUID,
        user_id: UUID
    ) -> Optional[TaskOut]:
        """Reopen a completed task."""
        task = await self.repository.reopen_task(task_id, user_id)
        return TaskOut.model_validate(task) if task else None
