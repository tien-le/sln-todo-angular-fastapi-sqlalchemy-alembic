"""
Tag service with business logic.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.tag import TagCreate, TagList, TagOut, TagUpdate
from app.db.repositories.tag_repository import TagRepository


class TagService:
    """Service for tag-related business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = TagRepository(db)

    async def list_tags(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 100
    ) -> TagList:
        """List tags for a user with pagination."""
        skip = (page - 1) * page_size

        tags = await self.repository.list_by_user(
            user_id=user_id,
            skip=skip,
            limit=page_size
        )

        total = await self.repository.count_by_user(user_id)

        return TagList(
            items=[TagOut.model_validate(tag) for tag in tags],
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size
        )

    async def create_tag(
        self,
        user_id: UUID,
        tag_in: TagCreate
    ) -> TagOut:
        """Create a new tag."""
        # Check if tag name already exists for user
        if await self.repository.name_exists_for_user(tag_in.name, user_id):
            raise ValueError("Tag name already exists")

        tag_data = tag_in.model_dump()
        tag_data["user_id"] = user_id

        tag = await self.repository.create(tag_data)
        return TagOut.model_validate(tag)

    async def get_tag(
        self,
        tag_id: UUID,
        user_id: UUID
    ) -> Optional[TagOut]:
        """Get a tag by ID."""
        tag = await self.repository.get_by_user(user_id, tag_id)
        return TagOut.model_validate(tag) if tag else None

    async def update_tag(
        self,
        tag_id: UUID,
        user_id: UUID,
        tag_in: TagUpdate
    ) -> Optional[TagOut]:
        """Update a tag."""
        tag = await self.repository.get_by_user(user_id, tag_id)
        if not tag:
            return None

        update_data = tag_in.model_dump(exclude_unset=True)

        # Check if new name conflicts with existing tags
        if "name" in update_data:
            if await self.repository.name_exists_for_user(
                update_data["name"], user_id, exclude_id=tag_id
            ):
                raise ValueError("Tag name already exists")

        for field, value in update_data.items():
            if hasattr(tag, field):
                setattr(tag, field, value)

        await self.db.flush()
        await self.db.refresh(tag)
        return TagOut.model_validate(tag)

    async def delete_tag(
        self,
        tag_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a tag."""
        tag = await self.repository.get_by_user(user_id, tag_id)
        if not tag:
            return False

        # Remove tag from all tasks using direct association table delete to avoid lazy-load during tests
        from sqlalchemy import delete

        from app.db.models.task_tag import task_tags
        await self.db.execute(
            delete(task_tags).where(task_tags.c.tag_id == tag_id)
        )
        await self.db.flush()

        # Delete the tag itself
        await self.repository.delete(tag_id)
        return True
