"""
Authentication service with business logic.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.auth import LoginRequest, LoginResponse, Token
from app.api.schemas.user import UserOut
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.repositories.user_repository import UserRepository


class AuthService:
    """Service for authentication-related business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repository = UserRepository(db)

    async def authenticate_user(self, email: str, password: str) -> Optional[UserOut]:
        """Authenticate a user with email and password."""
        user = await self.user_repository.get_active_by_email(email)
        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return UserOut.model_validate(user)

    async def login(self, login_request: LoginRequest) -> Optional[LoginResponse]:
        """Login a user and return access token."""
        user = await self.authenticate_user(login_request.email, login_request.password)
        if not user:
            return None

        # Create access token
        access_token = create_access_token(subject=str(user.id))

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user
        )

    async def get_current_user(self, user_id: UUID) -> Optional[UserOut]:
        """Get current user by ID."""
        user = await self.user_repository.get(user_id)
        if not user or not user.is_active:
            return None

        return UserOut.model_validate(user)

    async def refresh_token(self, user_id: UUID) -> Optional[Token]:
        """Refresh access token for a user."""
        user = await self.user_repository.get(user_id)
        if not user or not user.is_active:
            return None

        access_token = create_access_token(subject=str(user_id))

        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
