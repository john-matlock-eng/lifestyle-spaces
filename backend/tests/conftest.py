"""
Pytest configuration for backend tests.
"""
import os
import sys
import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)

@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    # Clear settings cache before creating test client
    from app.core.config import get_settings
    get_settings.cache_clear()
    
    # Mock AWS services before importing the app
    with patch.dict(os.environ, {
        'AWS_REGION': 'us-east-1',
        'DYNAMODB_TABLE_NAME': 'test-table',
        'USER_POOL_ID': 'test-pool-id',
        'USER_POOL_CLIENT_ID': 'test-client-id',
        'ENVIRONMENT': 'test',
        'PYTEST_CURRENT_TEST': 'true'
    }):
        # Mock boto3 clients
        with patch('boto3.client') as mock_boto_client:
            mock_cognito = Mock()
            mock_dynamodb = Mock()
            
            def client_factory(service_name, **kwargs):
                if service_name == 'cognito-idp':
                    return mock_cognito
                elif service_name == 'dynamodb':
                    return mock_dynamodb
                return Mock()
            
            mock_boto_client.side_effect = client_factory
            
            # Import app after mocking and clearing cache
            from app.main import app
            client = TestClient(app)
            return client

@pytest.fixture(autouse=True)
def test_environment():
    """Set test environment for all tests."""
    os.environ['ENVIRONMENT'] = 'test'
    os.environ['PYTEST_CURRENT_TEST'] = 'true'
    yield