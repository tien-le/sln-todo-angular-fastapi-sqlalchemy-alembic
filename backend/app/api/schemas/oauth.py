"""
OAuth2 schemas for request and response validation.
"""
from typing import Optional

from pydantic import BaseModel, Field


class OAuth2ProviderEnum:
    """Supported OAuth2 providers."""
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"


class OAuth2AuthorizationRequest(BaseModel):
    """Request to initiate OAuth2 authorization flow."""
    provider: str = Field(..., description="OAuth2 provider (google, github, microsoft)")
    redirect_uri: Optional[str] = Field(None, description="Custom redirect URI")


class OAuth2AuthorizationResponse(BaseModel):
    """Response containing OAuth2 authorization URL."""
    authorization_url: str = Field(..., description="URL to redirect user for authorization")
    state: str = Field(..., description="State parameter for CSRF protection")


class OAuth2CallbackRequest(BaseModel):
    """Request from OAuth2 provider callback."""
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: str = Field(..., description="State parameter for verification")
    provider: str = Field(..., description="OAuth2 provider name")


class OAuth2UserInfo(BaseModel):
    """User information from OAuth2 provider."""
    id: str = Field(..., description="User ID from provider")
    email: str = Field(..., description="User email")
    name: Optional[str] = Field(None, description="User full name")
    picture: Optional[str] = Field(None, description="User avatar URL")
    provider: str = Field(..., description="OAuth2 provider name")


class OAuth2LinkAccountRequest(BaseModel):
    """Request to link OAuth2 account to existing user."""
    provider: str = Field(..., description="OAuth2 provider to link")
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: str = Field(..., description="State parameter for verification")


class OAuth2UnlinkAccountRequest(BaseModel):
    """Request to unlink OAuth2 account."""
    provider: str = Field(..., description="OAuth2 provider to unlink")
