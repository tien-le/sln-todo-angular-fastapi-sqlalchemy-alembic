"""
User routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.schemas.user import PasswordChange, UserOut, UserUpdate
from app.db.session import get_db
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: UserOut = Depends(get_current_user)
) -> UserOut:
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserOut)
async def update_current_user(
    user_in: UserUpdate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserOut:
    """Update current user profile."""
    user_service = UserService(db)
    updated_user = await user_service.update_user(current_user.id, user_in)

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return updated_user


@router.put("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_change: PasswordChange,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Change user password."""
    user_service = UserService(db)
    success = await user_service.change_password(current_user.id, password_change)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    return {"message": "Password changed successfully"}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete current user account."""
    user_service = UserService(db)
    success = await user_service.delete_user(current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
