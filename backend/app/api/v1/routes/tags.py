"""
Tag routes.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.schemas.tag import TagCreate, TagList, TagOut, TagUpdate
from app.api.schemas.user import UserOut
from app.db.session import get_db
from app.services.tag_service import TagService

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=TagList)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TagList:
    """
    List tags for the current user with pagination.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 100, max: 100)
    """
    service = TagService(db)
    return await service.list_tags(
        user_id=current_user.id,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=TagOut, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_in: TagCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TagOut:
    """Create a new tag."""
    service = TagService(db)
    try:
        return await service.create_tag(user_id=current_user.id, tag_in=tag_in)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{tag_id}", response_model=TagOut)
async def get_tag(
    tag_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TagOut:
    """Get a specific tag by ID."""
    service = TagService(db)
    tag = await service.get_tag(tag_id=tag_id, user_id=current_user.id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    return tag


@router.put("/{tag_id}", response_model=TagOut)
async def update_tag(
    tag_id: UUID,
    tag_in: TagUpdate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TagOut:
    """Update a tag."""
    service = TagService(db)
    try:
        tag = await service.update_tag(
            tag_id=tag_id,
            user_id=current_user.id,
            tag_in=tag_in
        )
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        return tag
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a tag."""
    service = TagService(db)
    success = await service.delete_tag(tag_id=tag_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
