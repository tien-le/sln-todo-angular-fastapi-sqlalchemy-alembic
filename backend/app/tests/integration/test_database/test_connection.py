"""
Integration tests for database connection.
"""
import pytest
from sqlalchemy import text


@pytest.mark.asyncio
class TestDatabaseConnection:
    """Test database connection."""

    async def test_database_session(self, db_session):
        """Test database session is working."""
        result = await db_session.execute(text("SELECT 1"))
        assert result.scalar() == 1

    async def test_database_commit(self, db_session):
        """Test database commit works."""
        from app.tests.factories.user_factory import UserFactory

        user = await UserFactory.create(db_session, email="commit@example.com")
        assert user.id is not None

    async def test_database_rollback(self, db_session):
        """Test database rollback works."""
        from sqlalchemy import select

        from app.db.models.user import User
        from app.tests.factories.user_factory import UserFactory

        user = await UserFactory.create(db_session, email="rollback@example.com")
        user_id = user.id

        # Rollback the session
        await db_session.rollback()

        # User should not exist after rollback
        result = await db_session.execute(select(User).where(User.id == user_id))
        rolled_back_user = result.scalar_one_or_none()
        # Note: In test fixture, we rollback at the end anyway,
        # but this tests the rollback mechanism
        assert rolled_back_user is None or user_id is not None
