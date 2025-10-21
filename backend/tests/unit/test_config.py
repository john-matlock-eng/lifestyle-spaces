"""
Unit tests for configuration module.
"""
import pytest
import os


class TestConfig:
    """Test cases for configuration settings."""
    
    def test_settings_load_from_env(self):
        """Test that settings load from environment variables."""
        from app.core.config import settings
        
        assert settings.environment == "test"
        assert settings.aws_region == "us-east-1"
        assert settings.dynamodb_table == "lifestyle-spaces-test"
    
    def test_jwt_settings(self):
        """Test JWT configuration settings."""
        from app.core.config import settings
        
        # Accept multiple valid test secret keys including CI
        assert settings.jwt_secret_key in [
            "test-secret-key-for-testing-only", 
            "test-secret-key-for-ci",
            "test-secret-key-for-ci-only-do-not-use-in-production"
        ]
        assert settings.jwt_algorithm == "HS256"
        assert settings.access_token_expire_minutes == 30
    
    def test_cors_settings(self):
        """Test CORS configuration settings."""
        from app.core.config import settings
        
        assert settings.cors_origins is not None
        assert isinstance(settings.cors_origins, list)
        # Verify CORS is configured (either default or overridden)
        assert len(settings.cors_origins) > 0
        assert settings.cors_allow_credentials is True
        assert settings.cors_allow_methods == ["*"]
        assert settings.cors_allow_headers == ["*"]
    
    def test_api_prefix(self):
        """Test API prefix configuration."""
        from app.core.config import settings
        
        assert settings.api_v1_prefix == "/api/v1"
    
    def test_settings_singleton(self):
        """Test that settings is a singleton."""
        from app.core.config import settings as settings1
        from app.core.config import settings as settings2
        
        assert settings1 is settings2