"""
Tag-related Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TagBase(BaseModel):
    """Base tag schema."""
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")


class TagCreate(TagBase):
    """Schema for creating a tag."""
    pass


class TagUpdate(BaseModel):
    """Schema for updating a tag."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class TagOut(TagBase):
    """Schema for tag output."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    task_count: Optional[int] = 0


class TagList(BaseModel):
    """Schema for paginated tag list."""
    items: List[TagOut]
    total: int
    page: int
    page_size: int
    pages: int
