"""
Database dependencies.
"""

from app.db.session import get_db

# Re-export the database dependency for convenience
__all__ = ["get_db"]
