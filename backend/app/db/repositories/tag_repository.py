"""
Tag-specific repository operations.
"""
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.tag import Tag
from app.db.models.task import Task
from app.db.repositories.base_repository import BaseRepository


class TagRepository(BaseRepository[Tag]):
    """Repository for Tag model with specific operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(Tag, db)

    async def get_by_user(self, user_id: UUID, tag_id: UUID) -> Optional[Tag]:
        """Get a tag by ID for a specific user."""
        result = await self.db.execute(
            select(Tag).where(
                and_(
                    Tag.id == tag_id,
                    Tag.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Tag]:
        """List tags for a user."""
        result = await self.db.execute(
            select(Tag)
            .where(Tag.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_by_user(self, user_id: UUID) -> int:
        """Count tags for a user."""
        result = await self.db.execute(
            select(func.count())
            .select_from(Tag)
            .where(Tag.user_id == user_id)
        )
        return result.scalar()

    async def get_by_name_and_user(self, name: str, user_id: UUID) -> Optional[Tag]:
        """Get a tag by name for a specific user."""
        result = await self.db.execute(
            select(Tag).where(
                and_(
                    Tag.name == name,
                    Tag.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def name_exists_for_user(self, name: str, user_id: UUID, exclude_id: Optional[UUID] = None) -> bool:
        """Check if tag name exists for user (excluding specific tag ID)."""
        query = select(Tag).where(
            and_(
                Tag.name == name,
                Tag.user_id == user_id
            )
        )

        if exclude_id:
            query = query.where(Tag.id != exclude_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_with_task_count(self, tag_id: UUID, user_id: UUID) -> Optional[Tag]:
        """Get a tag with its task count."""
        result = await self.db.execute(
            select(Tag)
            .where(
                and_(
                    Tag.id == tag_id,
                    Tag.user_id == user_id
                )
            )
            .options(selectinload(Tag.tasks))
        )
        tag = result.scalar_one_or_none()

        if tag:
            # Add task count
            task_count = await self.db.execute(
                select(func.count())
                .select_from(Task)
                .join(Tag.tasks)
                .where(Task.id == tag.id)
            )
            tag.task_count = task_count.scalar()

        return tag
