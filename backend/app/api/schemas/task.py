"""
Task-related Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.task import TaskPriority, TaskStatus


class TaskBase(BaseModel):
    """Base task schema with common fields."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    tag_ids: List[UUID] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    tag_ids: Optional[List[UUID]] = None


class TagOut(BaseModel):
    """Schema for tag output."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str
    user_id: UUID
    created_at: datetime


class TaskOut(TaskBase):
    """Schema for task output."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    tags: List[TagOut] = []


class TaskList(BaseModel):
    """Schema for paginated task list."""
    items: List[TaskOut]
    total: int
    page: int
    page_size: int
    pages: int
