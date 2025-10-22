"""
API router aggregation.
"""
from fastapi import APIRouter

from app.api.v1.routes import auth, oauth, tags, tasks, users

api_router = APIRouter()

# Include routers (routers already define their own prefixes)
api_router.include_router(auth.router)
api_router.include_router(oauth.router)
api_router.include_router(users.router)
api_router.include_router(tasks.router)
api_router.include_router(tags.router)
