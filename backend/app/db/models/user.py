"""
User model.
"""
from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship

from app.db.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """User model."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # OAuth2 fields
    oauth_provider = Column(String(50), nullable=True)  # google, github, microsoft, etc.
    oauth_id = Column(String(255), nullable=True)  # External user ID from provider
    avatar_url = Column(String(500), nullable=True)  # User avatar from OAuth provider

    # Relationships
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
