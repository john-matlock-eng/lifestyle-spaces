"""
Pytest configuration for backend tests.
"""
import os
import sys
import pytest
import boto3
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from moto import mock_dynamodb

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
        'DYNAMODB_TABLE': 'test-table',
        'USER_POOL_ID': 'test-pool-id',
        'USER_POOL_CLIENT_ID': 'test-client-id',
        'ENVIRONMENT': 'test',
        'PYTEST_CURRENT_TEST': 'true'
    }):
        # Mock boto3 clients and resources
        with patch('boto3.client') as mock_boto_client, \
             patch('boto3.resource') as mock_boto_resource, \
             patch('app.services.user_profile.UserProfileService') as mock_profile_service_class, \
             patch('app.services.space.boto3.resource') as mock_space_boto_resource:
            
            mock_cognito = Mock()
            mock_dynamodb = Mock()
            mock_dynamodb_resource = Mock()
            mock_table = Mock()
            
            # Setup DynamoDB table mock
            mock_dynamodb_resource.Table.return_value = mock_table
            mock_table.get_item.return_value = {}
            mock_table.put_item.return_value = {}
            mock_table.query.return_value = {'Items': []}
            mock_table.scan.return_value = {'Items': []}
            
            # Setup batch writer mock
            mock_batch_writer = Mock()
            mock_batch_writer.__enter__ = Mock(return_value=mock_batch_writer)
            mock_batch_writer.__exit__ = Mock(return_value=None)
            mock_batch_writer.put_item = Mock()
            mock_table.batch_writer.return_value = mock_batch_writer
            
            def client_factory(service_name, **kwargs):
                if service_name == 'cognito-idp':
                    return mock_cognito
                elif service_name == 'dynamodb':
                    return mock_dynamodb
                return Mock()
            
            def resource_factory(service_name, **kwargs):
                if service_name == 'dynamodb':
                    return mock_dynamodb_resource
                return Mock()
            
            mock_boto_client.side_effect = client_factory
            mock_boto_resource.side_effect = resource_factory
            mock_space_boto_resource.side_effect = resource_factory
            
            # Mock UserProfileService instance
            mock_profile_instance = Mock()
            mock_profile_service_class.return_value = mock_profile_instance
            
            # Mock get_or_create_user_profile to return a default profile
            mock_profile_instance.get_or_create_user_profile.return_value = {
                'user_id': 'user-123',
                'email': 'test@example.com',
                'username': 'testuser',
                'display_name': 'Test User',
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
            
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


def pytest_runtest_teardown(item):
    """Clean up moto state after each test to prevent pollution."""
    # Import moto backend to clear state
    try:
        from moto.backends import get_backend
        # Reset DynamoDB backend for us-east-1 region
        backend = get_backend("dynamodb")["us-east-1"]
        if backend:
            backend.reset()
    except Exception:
        # If moto isn't available or backend can't be reset, that's fine
        pass


