"""
Test calendar URL functionality
"""
import pytest
from unittest.mock import MagicMock, patch
from moto import mock_dynamodb
import boto3
from app.services.space import SpaceService
from app.models.space import SpaceCreate, SpaceUpdate


@pytest.fixture
def mock_table():
    """Create a mock DynamoDB table using moto."""
    with mock_dynamodb():
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='test-table',
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
            GlobalSecondaryIndexes=[{
                'IndexName': 'GSI1',
                'KeySchema': [
                    {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                    {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            }],
            BillingMode='PAY_PER_REQUEST'
        )
        yield table


@pytest.fixture
def space_service(mock_table):
    """Create space service with mocked table."""
    with patch.object(SpaceService, '_get_or_create_table', return_value=mock_table):
        return SpaceService()


def test_create_space_with_calendar_url(space_service):
    """Test creating a space with a calendar URL."""
    space_data = SpaceCreate(
        name="Test Space",
        description="Test description",
        calendar_url="https://calendar.google.com/calendar/embed?src=test",
        is_public=False
    )
    
    result = space_service.create_space(space_data, "user-123")
    
    assert result['calendar_url'] == "https://calendar.google.com/calendar/embed?src=test"
    assert result['name'] == "Test Space"


def test_update_space_with_calendar_url(space_service):
    """Test updating a space with a calendar URL."""
    # First create a space
    space_data = SpaceCreate(
        name="Test Space",
        description="Test description",
        is_public=False
    )
    
    created_space = space_service.create_space(space_data, "user-123")
    space_id = created_space['id']
    
    # Update with calendar URL
    update_data = SpaceUpdate(
        calendar_url="https://calendar.google.com/calendar/embed?src=updated"
    )
    
    space_service.update_space(space_id, update_data, "user-123")
    
    # Verify it was saved
    updated_space = space_service.get_space(space_id, "user-123")
    assert updated_space['calendar_url'] == "https://calendar.google.com/calendar/embed?src=updated"


def test_get_space_returns_calendar_url(space_service):
    """Test that get_space returns the calendar URL."""
    # Create space with calendar URL
    space_data = SpaceCreate(
        name="Test Space",
        calendar_url="https://calendar.google.com/calendar/embed?src=test",
        is_public=False
    )

    created_space = space_service.create_space(space_data, "user-123")
    space_id = created_space['id']

    # Get the space
    retrieved_space = space_service.get_space(space_id, "user-123")

    assert retrieved_space['calendar_url'] == "https://calendar.google.com/calendar/embed?src=test"
