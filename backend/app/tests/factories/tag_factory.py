"""
Factory for creating test tags.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.tag import Tag


class TagFactory:
    """Factory for creating test tags."""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: UUID,
        name: Optional[str] = None,
        color: Optional[str] = None
    ) -> Tag:
        """Create a tag in the database."""
        tag = Tag(
            user_id=user_id,
            name=name or "Test Tag",
            color=color or "#6B7280"
        )

        db.add(tag)
        await db.commit()
        await db.refresh(tag)

        return tag

    @staticmethod
    async def create_batch(
        db: AsyncSession,
        user_id: UUID,
        count: int = 5
    ) -> list[Tag]:
        """Create multiple tags."""
        tags = []
        for i in range(count):
            tag = await TagFactory.create(
                db=db,
                user_id=user_id,
                name=f"Test Tag {i+1}"
            )
            tags.append(tag)
        return tags

    @staticmethod
    def build(**kwargs) -> dict:
        """Build tag data without saving to database."""
        return {
            "name": kwargs.get("name", "Test Tag"),
            "color": kwargs.get("color", "#6B7280"),
        }