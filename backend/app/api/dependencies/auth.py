"""
Authentication dependencies.
"""
from typing import Optional
from uuid import UUID

from app.api.schemas.user import UserOut
from app.core.security import decode_access_token
from app.db.session import get_db
from app.services.auth_service import AuthService
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

# Configure to not auto-error so we can return 401 (Unauthorized) instead of 403
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> UserOut:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # No credentials provided -> 401
    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    try:
        user_id_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    auth_service = AuthService(db)
    user = await auth_service.get_current_user(user_id_uuid)

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: UserOut = Depends(get_current_user)
) -> UserOut:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_current_superuser(
    current_user: UserOut = Depends(get_current_active_user)
) -> UserOut:
    """Get current superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
