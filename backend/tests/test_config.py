"""
Test application configuration settings.
"""
import os
import pytest
from app.core.config import Settings, get_settings


def test_settings_in_test_mode():
    """Test that settings provide proper defaults in test mode."""
    # PYTEST_CURRENT_TEST should be set by pytest
    assert os.getenv("PYTEST_CURRENT_TEST") is not None
    
    settings = Settings()
    
    # Verify test mode defaults
    assert settings.environment == "test"
    assert settings.debug is True
    assert settings.dynamodb_table == "lifestyle-spaces-test"
    # The JWT secret key comes from .env.test file when it exists or CI environment
    assert settings.jwt_secret_key in ["test-secret-key-for-testing-only", "test-secret-key-for-ci-only-not-for-production", "test-secret-key-for-ci"]
    assert settings.jwt_algorithm == "HS256"
    assert settings.access_token_expire_minutes == 30
    assert settings.aws_region == "us-east-1"
    assert settings.api_v1_prefix == "/api/v1"
    
    # Verify CORS settings - can be overridden by .env.test file
    # The .env.test file sets CORS_ORIGINS=* which gets parsed as a single string
    assert settings.cors_origins in [["http://testserver"], ["*"]]
    assert settings.cors_allow_credentials is True
    assert settings.cors_allow_methods == ["*"]
    assert settings.cors_allow_headers == ["*"]


def test_get_settings_returns_cached_instance():
    """Test that get_settings returns the same cached instance."""
    settings1 = get_settings()
    settings2 = get_settings()
    
    # Should be the same instance due to lru_cache
    assert settings1 is settings2


def test_settings_model_config():
    """Test that model config is properly set for test mode."""
    settings = Settings()
    
    # The model_config is evaluated at import time, so we check the actual behavior
    # Check that test defaults are being used
    assert settings.environment == "test"
    assert settings.dynamodb_table == "lifestyle-spaces-test"


def test_settings_field_descriptions():
    """Test that all fields have proper descriptions."""
    settings = Settings()
    
    # Check that important fields have descriptions
    field_info = settings.model_fields
    
    assert "jwt_secret_key" in field_info
    assert field_info["jwt_secret_key"].description == "JWT secret key for token signing"
    
    assert "dynamodb_table" in field_info
    assert field_info["dynamodb_table"].description == "DynamoDB table name"
    
    assert "environment" in field_info
    assert field_info["environment"].description == "Application environment"