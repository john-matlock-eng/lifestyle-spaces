"""
Health check endpoint.
"""
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.core.config import settings
from app import __version__

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Health status information
    """
    logger.info("Health check endpoint called via FastAPI")
    response_data = {
        "status": "healthy",
        "version": __version__,
        "environment": settings.environment
    }
    logger.info(f"Health check returning: {response_data}")
    return response_data


@router.get("/api/test-simple")
async def test_simple():
    """Dead simple test endpoint for debugging."""
    logger.info("Test simple endpoint called")
    return {"test": "ok"}


@router.get("/api/test-json")
async def test_json():
    """Test endpoint with explicit JSONResponse."""
    logger.info("Test JSON endpoint called")
    data = {"message": "JSON response test", "value": 123}
    return JSONResponse(content=data, status_code=200)