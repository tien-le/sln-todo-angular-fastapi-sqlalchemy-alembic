"""
Tag model.
"""
from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.models.base import Base, TimestampMixin, UUIDMixin


class Tag(Base, UUIDMixin, TimestampMixin):
    """Tag model."""

    __tablename__ = "tags"
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_tag_name'),
    )

    name = Column(String(50), nullable=False, index=True)
    color = Column(String(7), default="#6B7280", nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="tags")
    tasks = relationship("Task", secondary="task_tags", back_populates="tags")

    def __repr__(self):
        return f"<Tag {self.name}>"
