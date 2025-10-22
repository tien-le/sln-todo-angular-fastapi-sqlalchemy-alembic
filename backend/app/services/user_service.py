"""
User service with business logic.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.user import PasswordChange, UserCreate, UserOut, UserUpdate
from app.core.security import get_password_hash, verify_password
from app.db.repositories.user_repository import UserRepository


class UserService:
    """Service for user-related business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = UserRepository(db)

    async def create_user(self, user_in: UserCreate) -> UserOut:
        """Create a new user."""
        # Check if email already exists
        if await self.repository.email_exists(user_in.email):
            raise ValueError("Email already registered")

        user_data = user_in.model_dump(exclude={"password"})
        user_data["hashed_password"] = get_password_hash(user_in.password)

        user = await self.repository.create(user_data)
        return UserOut.model_validate(user)

    async def get_user(self, user_id: UUID) -> Optional[UserOut]:
        """Get a user by ID."""
        user = await self.repository.get(user_id)
        return UserOut.model_validate(user) if user else None

    async def get_user_by_email(self, email: str) -> Optional[UserOut]:
        """Get a user by email."""
        user = await self.repository.get_by_email(email)
        return UserOut.model_validate(user) if user else None

    async def update_user(
        self,
        user_id: UUID,
        user_in: UserUpdate
    ) -> Optional[UserOut]:
        """Update a user."""
        user = await self.repository.get(user_id)
        if not user:
            return None

        update_data = user_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)

        await self.db.flush()
        await self.db.refresh(user)
        return UserOut.model_validate(user)

    async def change_password(
        self,
        user_id: UUID,
        password_change: PasswordChange
    ) -> bool:
        """Change user password."""
        user = await self.repository.get(user_id)
        if not user:
            return False

        # Verify current password
        if not verify_password(password_change.current_password, user.hashed_password):
            return False

        # Update password
        user.hashed_password = get_password_hash(password_change.new_password)
        await self.db.flush()
        return True

    async def deactivate_user(self, user_id: UUID) -> bool:
        """Deactivate a user account."""
        return await self.repository.deactivate_user(user_id)

    async def activate_user(self, user_id: UUID) -> bool:
        """Activate a user account."""
        return await self.repository.activate_user(user_id)

    async def delete_user(self, user_id: UUID) -> bool:
        """Delete a user account (soft delete by deactivating)."""
        return await self.repository.deactivate_user(user_id)
