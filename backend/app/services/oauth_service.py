"""
OAuth2 service for handling OAuth2 authentication flows.
"""
import secrets
from typing import Dict, Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.oauth import OAuth2ProviderEnum, OAuth2UserInfo
from app.api.schemas.user import UserOut
from app.core.config import settings
from app.core.security import create_access_token
from app.db.repositories.user_repository import UserRepository


class OAuth2Service:
    """Service for OAuth2 authentication."""

    # OAuth2 provider configurations
    PROVIDER_CONFIG = {
        OAuth2ProviderEnum.GOOGLE: {
            "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "access_token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scope": "openid email profile",
            "client_id_key": "GOOGLE_CLIENT_ID",
            "client_secret_key": "GOOGLE_CLIENT_SECRET",
            "redirect_uri_key": "GOOGLE_REDIRECT_URI",
        },
        OAuth2ProviderEnum.GITHUB: {
            "authorize_url": "https://github.com/login/oauth/authorize",
            "access_token_url": "https://github.com/login/oauth/access_token",
            "userinfo_url": "https://api.github.com/user",
            "scope": "user:email",
            "client_id_key": "GITHUB_CLIENT_ID",
            "client_secret_key": "GITHUB_CLIENT_SECRET",
            "redirect_uri_key": "GITHUB_REDIRECT_URI",
        },
        OAuth2ProviderEnum.MICROSOFT: {
            "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "access_token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "userinfo_url": "https://graph.microsoft.com/v1.0/me",
            "scope": "openid email profile",
            "client_id_key": "MICROSOFT_CLIENT_ID",
            "client_secret_key": "MICROSOFT_CLIENT_SECRET",
            "redirect_uri_key": "MICROSOFT_REDIRECT_URI",
        },
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repository = UserRepository(db)

    def _get_provider_config(self, provider: str) -> Dict:
        """Get OAuth2 provider configuration."""
        if provider not in self.PROVIDER_CONFIG:
            raise ValueError(f"Unsupported OAuth2 provider: {provider}")
        return self.PROVIDER_CONFIG[provider]

    def _get_provider_credentials(self, provider: str) -> tuple:
        """Get OAuth2 provider credentials from settings."""
        config = self._get_provider_config(provider)
        client_id = getattr(settings, config["client_id_key"])
        client_secret = getattr(settings, config["client_secret_key"])
        redirect_uri = getattr(settings, config["redirect_uri_key"])

        if not client_id or not client_secret:
            raise ValueError(f"OAuth2 credentials not configured for {provider}")

        return client_id, client_secret, redirect_uri

    def get_authorization_url(self, provider: str, state: Optional[str] = None) -> tuple:
        """
        Get OAuth2 authorization URL.

        Args:
            provider: OAuth2 provider name
            state: CSRF state token (generated if not provided)

        Returns:
            Tuple of (authorization_url, state)
        """
        config = self._get_provider_config(provider)
        client_id, _, redirect_uri = self._get_provider_credentials(provider)

        # Generate CSRF state token if not provided
        if not state:
            state = secrets.token_urlsafe(32)

        # Build authorization URL
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": config["scope"],
            "state": state,
        }

        # Add provider-specific parameters
        if provider == OAuth2ProviderEnum.MICROSOFT:
            params["response_mode"] = "query"

        authorization_url = f"{config['authorize_url']}?{urlencode(params)}"
        return authorization_url, state

    async def exchange_code_for_token(
        self, provider: str, code: str, redirect_uri: Optional[str] = None
    ) -> str:
        """
        Exchange authorization code for access token.

        Args:
            provider: OAuth2 provider name
            code: Authorization code
            redirect_uri: Redirect URI (uses default if not provided)

        Returns:
            Access token
        """
        config = self._get_provider_config(provider)
        client_id, client_secret, default_redirect_uri = self._get_provider_credentials(provider)

        # Prepare token request
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri or default_redirect_uri,
        }

        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["access_token_url"],
                data=data,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            token_data = response.json()

        return token_data.get("access_token")

    async def get_user_info(self, provider: str, access_token: str) -> OAuth2UserInfo:
        """
        Get user information from OAuth2 provider.

        Args:
            provider: OAuth2 provider name
            access_token: OAuth2 access token

        Returns:
            OAuth2UserInfo object
        """
        config = self._get_provider_config(provider)

        # Fetch user info from provider
        async with httpx.AsyncClient() as client:
            response = await client.get(
                config["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            user_data = response.json()

        # Normalize user info based on provider
        if provider == OAuth2ProviderEnum.GOOGLE:
            return OAuth2UserInfo(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data.get("name"),
                picture=user_data.get("picture"),
                provider=provider,
            )
        elif provider == OAuth2ProviderEnum.GITHUB:
            # GitHub may require additional call to get email
            email = user_data.get("email")
            if not email:
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                email_response.raise_for_status()
                emails = email_response.json()
                primary_email = next(
                    (e for e in emails if e.get("primary")), emails[0] if emails else None
                )
                email = primary_email.get("email") if primary_email else None

            return OAuth2UserInfo(
                id=str(user_data["id"]),
                email=email,
                name=user_data.get("name"),
                picture=user_data.get("avatar_url"),
                provider=provider,
            )
        elif provider == OAuth2ProviderEnum.MICROSOFT:
            return OAuth2UserInfo(
                id=user_data["id"],
                email=user_data.get("mail") or user_data.get("userPrincipalName"),
                name=user_data.get("displayName"),
                picture=None,  # Microsoft Graph requires separate call for photo
                provider=provider,
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def authenticate_or_create_user(
        self, oauth_user_info: OAuth2UserInfo
    ) -> tuple[UserOut, str]:
        """
        Authenticate existing user or create new user from OAuth2 info.

        Args:
            oauth_user_info: OAuth2UserInfo object

        Returns:
            Tuple of (UserOut, access_token)
        """
        # Try to find user by OAuth provider and ID
        user = await self.user_repository.get_by_oauth(
            oauth_user_info.provider, oauth_user_info.id
        )

        # If not found, try to find by email
        if not user and oauth_user_info.email:
            user = await self.user_repository.get_by_email(oauth_user_info.email)

            # If found, link OAuth account
            if user:
                user.oauth_provider = oauth_user_info.provider
                user.oauth_id = oauth_user_info.id
                if oauth_user_info.picture:
                    user.avatar_url = oauth_user_info.picture
                await self.db.commit()
                await self.db.refresh(user)

        # If still not found, create new user
        if not user:
            user = await self.user_repository.create_oauth_user(
                email=oauth_user_info.email,
                full_name=oauth_user_info.name,
                oauth_provider=oauth_user_info.provider,
                oauth_id=oauth_user_info.id,
                avatar_url=oauth_user_info.picture,
            )

        # Create access token
        access_token = create_access_token(subject=str(user.id))

        return UserOut.model_validate(user), access_token

    async def link_oauth_account(
        self, user_id: str, oauth_user_info: OAuth2UserInfo
    ) -> UserOut:
        """
        Link OAuth2 account to existing user.

        Args:
            user_id: User ID
            oauth_user_info: OAuth2UserInfo object

        Returns:
            Updated UserOut object
        """
        from uuid import UUID

        user = await self.user_repository.get(UUID(user_id))
        if not user:
            raise ValueError("User not found")

        # Check if OAuth account is already linked to another user
        existing_user = await self.user_repository.get_by_oauth(
            oauth_user_info.provider, oauth_user_info.id
        )
        if existing_user and str(existing_user.id) != user_id:
            raise ValueError("OAuth account already linked to another user")

        # Update user with OAuth info
        user.oauth_provider = oauth_user_info.provider
        user.oauth_id = oauth_user_info.id
        if oauth_user_info.picture:
            user.avatar_url = oauth_user_info.picture

        await self.db.commit()
        await self.db.refresh(user)

        return UserOut.model_validate(user)

    async def unlink_oauth_account(self, user_id: str, provider: str) -> UserOut:
        """
        Unlink OAuth2 account from user.

        Args:
            user_id: User ID
            provider: OAuth2 provider to unlink

        Returns:
            Updated UserOut object
        """
        from uuid import UUID

        user = await self.user_repository.get(UUID(user_id))
        if not user:
            raise ValueError("User not found")

        if user.oauth_provider != provider:
            raise ValueError("OAuth provider not linked to this account")

        # Don't allow unlinking if user has no password (OAuth-only account)
        if not user.hashed_password:
            raise ValueError("Cannot unlink OAuth account without setting a password first")

        # Clear OAuth info
        user.oauth_provider = None
        user.oauth_id = None

        await self.db.commit()
        await self.db.refresh(user)

        return UserOut.model_validate(user)
