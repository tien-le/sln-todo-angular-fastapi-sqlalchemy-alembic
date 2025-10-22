"""
Authentication-related Pydantic schemas.
"""
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.api.schemas.user import UserOut


class Token(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """Schema for token payload."""
    sub: str  # user_id
    exp: int
    iat: int
    type: str = "access"


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Schema for login response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Schema for logout request."""
    token: Optional[str] = None
