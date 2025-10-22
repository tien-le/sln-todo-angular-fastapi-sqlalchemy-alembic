"""
Pytest configuration and shared fixtures.
"""
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.dependencies.auth import get_current_user
from app.db.models.base import Base
from app.db.session import get_db
from app.main import app
from app.tests.factories.user_factory import UserFactory

# Test database URL (SQLite in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

# Create test session maker
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


# Remove custom event_loop fixture to avoid deprecation; pytest-asyncio provides one.


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database session for each test.
    All tables are created and dropped for each test.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
        await session.rollback()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a test client with database session override.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Use explicit ASGI transport to avoid deprecation warning
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession):
    """Create a test user and return it."""
    user = await UserFactory.create(
        db=db_session,
        email="test@example.com",
        password="testpassword123"
    )
    return user


@pytest.fixture
async def authenticated_client(client: AsyncClient, test_user, db_session: AsyncSession) -> AsyncClient:
    """Authenticated client overriding get_current_user to return test_user."""
    async def override_get_current_user():
        return test_user

    # Apply override
    from app.main import app as fastapi_app
    fastapi_app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        yield client
    finally:
        fastapi_app.dependency_overrides.pop(get_current_user, None)
