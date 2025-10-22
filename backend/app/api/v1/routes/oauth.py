"""
OAuth2 authentication routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.schemas.auth import LoginResponse
from app.api.schemas.oauth import (
    OAuth2AuthorizationRequest,
    OAuth2AuthorizationResponse,
    OAuth2CallbackRequest,
    OAuth2LinkAccountRequest,
    OAuth2UnlinkAccountRequest,
)
from app.api.schemas.user import UserOut
from app.core.config import settings
from app.db.session import get_db
from app.services.oauth_service import OAuth2Service

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.post("/authorize", response_model=OAuth2AuthorizationResponse)
async def get_authorization_url(
    request: OAuth2AuthorizationRequest,
    db: AsyncSession = Depends(get_db),
) -> OAuth2AuthorizationResponse:
    """
    Get OAuth2 authorization URL for a provider.

    This endpoint initiates the OAuth2 flow by generating an authorization URL
    that the frontend should redirect the user to.
    """
    if not settings.OAUTH2_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="OAuth2 authentication is not enabled",
        )

    try:
        oauth_service = OAuth2Service(db)
        authorization_url, state = oauth_service.get_authorization_url(request.provider)

        return OAuth2AuthorizationResponse(
            authorization_url=authorization_url,
            state=state,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/callback", response_model=LoginResponse)
async def oauth_callback(
    callback_request: OAuth2CallbackRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """
    Handle OAuth2 provider callback.

    This endpoint processes the authorization code from the OAuth provider,
    exchanges it for an access token, retrieves user information, and either
    creates a new user or authenticates an existing one.
    """
    if not settings.OAUTH2_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="OAuth2 authentication is not enabled",
        )

    try:
        oauth_service = OAuth2Service(db)

        # Exchange code for access token
        access_token = await oauth_service.exchange_code_for_token(
            callback_request.provider,
            callback_request.code,
        )

        # Get user info from provider
        oauth_user_info = await oauth_service.get_user_info(
            callback_request.provider,
            access_token,
        )

        # Authenticate or create user
        user, jwt_token = await oauth_service.authenticate_or_create_user(oauth_user_info)

        return LoginResponse(
            access_token=jwt_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth authentication failed: {str(e)}",
        )


@router.post("/link", response_model=UserOut)
async def link_oauth_account(
    link_request: OAuth2LinkAccountRequest,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """
    Link OAuth2 account to current user.

    This allows users to link their social accounts to their existing account,
    enabling them to sign in using either method.
    """
    if not settings.OAUTH2_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="OAuth2 authentication is not enabled",
        )

    try:
        oauth_service = OAuth2Service(db)

        # Exchange code for access token
        access_token = await oauth_service.exchange_code_for_token(
            link_request.provider,
            link_request.code,
        )

        # Get user info from provider
        oauth_user_info = await oauth_service.get_user_info(
            link_request.provider,
            access_token,
        )

        # Link OAuth account to current user
        updated_user = await oauth_service.link_oauth_account(
            str(current_user.id),
            oauth_user_info,
        )

        return updated_user

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link OAuth account: {str(e)}",
        )


@router.post("/unlink", response_model=UserOut)
async def unlink_oauth_account(
    unlink_request: OAuth2UnlinkAccountRequest,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """
    Unlink OAuth2 account from current user.

    This removes the OAuth provider association from the user account.
    Users must have a password set before they can unlink their OAuth account.
    """
    if not settings.OAUTH2_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="OAuth2 authentication is not enabled",
        )

    try:
        oauth_service = OAuth2Service(db)
        updated_user = await oauth_service.unlink_oauth_account(
            str(current_user.id),
            unlink_request.provider,
        )

        return updated_user

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unlink OAuth account: {str(e)}",
        )


@router.get("/providers")
async def get_oauth_providers() -> dict:
    """
    Get list of configured OAuth2 providers.

    Returns information about which OAuth2 providers are available and configured.
    """
    providers = []

    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
        providers.append({
            "name": "google",
            "display_name": "Google",
            "enabled": True,
        })

    if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
        providers.append({
            "name": "github",
            "display_name": "GitHub",
            "enabled": True,
        })

    if settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET:
        providers.append({
            "name": "microsoft",
            "display_name": "Microsoft",
            "enabled": True,
        })

    return {
        "oauth2_enabled": settings.OAUTH2_ENABLED,
        "providers": providers,
    }
