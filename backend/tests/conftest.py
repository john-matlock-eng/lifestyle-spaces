"""
Pytest configuration and fixtures for all tests.
"""
import os
import sys
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws
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
    with mock_aws():
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
    """Set environment variables for testing."""
    os.environ['ENVIRONMENT'] = 'test'
    os.environ['AWS_REGION'] = 'us-east-1'
    os.environ['DYNAMODB_TABLE'] = 'lifestyle-spaces-test'
    os.environ['JWT_SECRET_KEY'] = 'test-secret-key-for-testing-only'
    os.environ['JWT_ALGORITHM'] = 'HS256'
    os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'] = '30'
    yield
    # Cleanup
    for key in ['ENVIRONMENT', 'AWS_REGION', 'DYNAMODB_TABLE', 'JWT_SECRET_KEY', 'JWT_ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES']:
        os.environ.pop(key, None)