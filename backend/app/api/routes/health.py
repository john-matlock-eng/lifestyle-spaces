"""
Health check endpoint.
"""
from fastapi import APIRouter
from app.core.config import settings
from app import __version__

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Health status information
    """
    return {
        "status": "healthy",
        "version": __version__,
        "environment": settings.environment
    }