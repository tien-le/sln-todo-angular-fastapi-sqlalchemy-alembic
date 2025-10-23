"""
Application configuration using Pydantic settings.
"""
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

    # Project Configuration
    PROJECT_NAME: str = "TODO Application"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Security Configuration
    SECRET_KEY: str = "dev-secret-key-change-in-production-please-use-strong-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://todo:todo@postgres:5432/todo_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v):
        """Convert Railway's postgresql:// to postgresql+asyncpg:// for SQLAlchemy."""
        if isinstance(v, str) and v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:4200",
        "http://localhost:4201",
        "http://localhost:3000",
        "http://localhost:8080"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and v:
            # Split by comma and strip whitespace
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Testing Configuration
    TESTING: bool = False

    # Logging Configuration
    LOG_LEVEL: str = "INFO"

    # OAuth2 Configuration
    OAUTH2_ENABLED: bool = True

    # Google OAuth2
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:4200/auth/callback/google"

    # GitHub OAuth2
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:4200/auth/callback/github"

    # Microsoft OAuth2
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_REDIRECT_URI: str = "http://localhost:4200/auth/callback/microsoft"

    # Frontend URL for OAuth redirects
    FRONTEND_URL: str = "http://localhost:4200"


settings = Settings()
