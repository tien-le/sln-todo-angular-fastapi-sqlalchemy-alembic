"""
Task routes.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.schemas.task import TaskCreate, TaskList, TaskOut, TaskUpdate
from app.api.schemas.user import UserOut
from app.db.models.task import TaskPriority, TaskStatus
from app.db.session import get_db
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskList)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    tag_ids: Optional[List[UUID]] = Query(None),
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern=r"^-?(created_at|due_date|priority|title)$"),
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TaskList:
    """
    List tasks for the current user with filtering and pagination.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Filter by status
    - **priority**: Filter by priority
    - **tag_ids**: Filter by tag IDs
    - **search**: Search in title and description
    - **sort_by**: Sort field (prefix with '-' for descending)
    """
    service = TaskService(db)
    return await service.list_tasks(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        tag_ids=tag_ids,
        search=search,
        sort_by=sort_by
    )


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TaskOut:
    """Create a new task."""
    service = TaskService(db)
    return await service.create_task(user_id=current_user.id, task_in=task_in)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TaskOut:
    """Get a specific task by ID."""
    service = TaskService(db)
    task = await service.get_task(task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TaskOut:
    """Update a task."""
    service = TaskService(db)
    task = await service.update_task(
        task_id=task_id,
        user_id=current_user.id,
        task_in=task_in
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a task (soft delete)."""
    service = TaskService(db)
    success = await service.delete_task(task_id=task_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )


@router.patch("/{task_id}/complete", response_model=TaskOut)
async def complete_task(
    task_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TaskOut:
    """Mark a task as completed."""
    service = TaskService(db)
    task = await service.complete_task(task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task


@router.patch("/{task_id}/reopen", response_model=TaskOut)
async def reopen_task(
    task_id: UUID,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TaskOut:
    """Reopen a completed task."""
    service = TaskService(db)
    task = await service.reopen_task(task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or task is not completed"
        )
    return task
