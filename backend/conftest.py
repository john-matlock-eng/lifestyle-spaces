"""
Global pytest configuration for backend tests.
This file is automatically loaded by pytest and sets up the test environment.
"""
import os
import sys

# CRITICAL: Set test environment BEFORE any imports
# This must happen before any app modules are imported
os.environ['PYTEST_CURRENT_TEST'] = 'true'
os.environ['ENVIRONMENT'] = 'test'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-for-testing-only'
os.environ['DYNAMODB_TABLE'] = 'lifestyle-spaces-test'
os.environ['AWS_REGION'] = 'us-east-1'
os.environ['CORS_ORIGINS'] = '["*"]'

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Now we can import pytest
import pytest
from unittest.mock import patch

# Clear any cached settings before tests
@pytest.fixture(autouse=True, scope='session')
def setup_test_environment():
    """Setup test environment for all tests."""
    # Clear the lru_cache for get_settings to ensure fresh settings
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    # Cleanup after all tests
    get_settings.cache_clear()

@pytest.fixture(autouse=True)
def clear_settings_cache():
    """Clear settings cache before each test."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield