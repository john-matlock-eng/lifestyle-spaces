"""
Pytest configuration and fixtures for all tests.
"""
import os
import sys

# Set test environment variables BEFORE importing app
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-for-testing-only')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('ACCESS_TOKEN_EXPIRE_MINUTES', '30')
os.environ.setdefault('DYNAMODB_TABLE', 'lifestyle-spaces-test')
os.environ.setdefault('CORS_ORIGINS', '["*"]')  # JSON array format
os.environ.setdefault('AWS_REGION', 'us-east-1')
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')
os.environ.setdefault('ENVIRONMENT', 'test')

# Now import other modules after environment is set
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from moto import mock_dynamodb
import boto3

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def test_client() -> Generator:
    """Create a test client for the FastAPI app."""
    from app.main import app
    
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_dynamodb_table():
    """Create a mock DynamoDB table for testing."""
    with mock_dynamodb():
        # Create DynamoDB client
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        
        # Create test table
        table = dynamodb.create_table(
            TableName='lifestyle-spaces-test',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1SK', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'GSI1',
                    'KeySchema': [
                        {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        yield table


@pytest.fixture
def mock_auth_token():
    """Generate a mock authentication token for testing."""
    return "Bearer test-token-123"


@pytest.fixture(autouse=True)
def set_test_env_vars():
    """Ensure test environment variables remain set during testing."""
    # Environment variables are already set at module level
    # This fixture ensures they stay consistent
    original_env = {}
    test_vars = {
        'JWT_SECRET_KEY': 'test-secret-key-for-testing-only',
        'JWT_ALGORITHM': 'HS256',
        'ACCESS_TOKEN_EXPIRE_MINUTES': '30',
        'DYNAMODB_TABLE': 'lifestyle-spaces-test',
        'CORS_ORIGINS': '["*"]',  # JSON array format
        'AWS_REGION': 'us-east-1',
        'AWS_DEFAULT_REGION': 'us-east-1',
        'ENVIRONMENT': 'test'
    }
    
    # Store original values and set test values
    for key, value in test_vars.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
    
    yield
    
    # Restore original values
    for key, value in original_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value