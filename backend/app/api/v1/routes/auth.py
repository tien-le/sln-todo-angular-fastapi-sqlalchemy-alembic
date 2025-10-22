"""
Authentication routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.schemas.auth import LoginRequest, LoginResponse, Token
from app.api.schemas.user import UserCreate, UserOut
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserOut:
    """Register a new user."""
    user_service = UserService(db)
    try:
        return await user_service.create_user(user_in)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_request: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """Login a user."""
    auth_service = AuthService(db)
    login_response = await auth_service.login(login_request)

    if not login_response:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return login_response


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Refresh access token."""
    auth_service = AuthService(db)
    token = await auth_service.refresh_token(current_user.id)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token"
        )

    return token


@router.get("/me", response_model=UserOut)
async def get_current_user_info(
    current_user: UserOut = Depends(get_current_user)
) -> UserOut:
    """Get current user information."""
    return current_user
