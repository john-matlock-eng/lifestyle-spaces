"""
Unit tests for main FastAPI app configuration.
"""
import pytest
from fastapi import FastAPI


class TestMainApp:
    """Test cases for main app configuration."""
    
    def test_app_instance(self):
        """Test that app is a FastAPI instance."""
        from app.main import app
        assert isinstance(app, FastAPI)
    
    def test_app_title(self):
        """Test that app has correct title."""
        from app.main import app
        assert app.title == "Lifestyle Spaces API"
    
    def test_app_version(self):
        """Test that app has a version."""
        from app.main import app
        assert app.version == "1.0.0"
    
    def test_cors_middleware_configured(self):
        """Test that CORS middleware is configured."""
        from app.main import app
        
        # Check if CORS middleware is in the middleware stack
        middleware_classes = [m.cls.__name__ for m in app.user_middleware]
        assert "CORSMiddleware" in str(middleware_classes)
    
    def test_api_routes_included(self):
        """Test that API routes are included."""
        from app.main import app
        
        # Get all routes
        routes = [route.path for route in app.routes]
        
        # Check that health endpoint exists
        assert "/health" in routes