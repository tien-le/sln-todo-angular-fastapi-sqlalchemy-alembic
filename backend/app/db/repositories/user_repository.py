"""
User-specific repository operations.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model with specific operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_active_by_email(self, email: str) -> Optional[User]:
        """Get an active user by email."""
        result = await self.db.execute(
            select(User).where(
                User.email == email,
                User.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none() is not None

    async def deactivate_user(self, user_id: UUID) -> bool:
        """Deactivate a user account."""
        user = await self.get(user_id)
        if user:
            user.is_active = False
            await self.db.flush()
            return True
        return False

    async def activate_user(self, user_id: UUID) -> bool:
        """Activate a user account."""
        user = await self.get(user_id)
        if user:
            user.is_active = True
            await self.db.flush()
            return True
        return False

    async def get_by_oauth(self, provider: str, oauth_id: str) -> Optional[User]:
        """Get a user by OAuth provider and ID."""
        result = await self.db.execute(
            select(User).where(
                User.oauth_provider == provider,
                User.oauth_id == oauth_id
            )
        )
        return result.scalar_one_or_none()

    async def create_oauth_user(
        self,
        email: str,
        full_name: Optional[str],
        oauth_provider: str,
        oauth_id: str,
        avatar_url: Optional[str] = None
    ) -> User:
        """Create a new user from OAuth2 authentication."""
        user = User(
            email=email,
            full_name=full_name,
            oauth_provider=oauth_provider,
            oauth_id=oauth_id,
            avatar_url=avatar_url,
            is_active=True,
            is_superuser=False
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
