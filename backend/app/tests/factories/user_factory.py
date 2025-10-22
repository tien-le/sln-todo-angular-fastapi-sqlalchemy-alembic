"""
User factory for creating test users.
"""
from typing import Optional
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.models.user import User


class UserFactory:
    """Factory for creating test users."""

    @staticmethod
    async def create(
        db: AsyncSession,
        email: Optional[str] = None,
        password: Optional[str] = None,
        full_name: Optional[str] = None,
        is_active: bool = True,
        is_superuser: bool = False,
    ) -> User:
        """
        Create a user in the database.

        Args:
            db: Database session
            email: User email (auto-generated if None)
            password: Plain text password (default: "testpassword123")
            full_name: User's full name
            is_active: Whether user is active
            is_superuser: Whether user is a superuser

        Returns:
            Created user instance
        """
        email = email or f"user{uuid4().hex[:8]}@example.com"
        password = password or "testpassword123"

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name or "Test User",
            is_active=is_active,
            is_superuser=is_superuser,
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Store plain password for testing
        user._plain_password = password  # type: ignore

        return user

    @staticmethod
    def build(**kwargs) -> dict:
        """
        Build user data without saving to database.

        Returns:
            Dictionary with user data
        """
        return {
            "email": kwargs.get("email", f"user{uuid4().hex[:8]}@example.com"),
            "password": kwargs.get("password", "testpassword123"),
            "full_name": kwargs.get("full_name", "Test User"),
        }
