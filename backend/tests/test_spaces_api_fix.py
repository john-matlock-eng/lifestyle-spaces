"""
Test the spaces API fixes for:
1. 200 response with proper JSON body when no spaces
2. 201 create space returns proper JSON with spaceId field
3. Created space appears in the list
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.models.space import SpaceResponse, SpaceListResponse

@pytest.fixture
def client():
    """Create test client with cleared dependency overrides."""
    app.dependency_overrides.clear()
    return TestClient(app)


@pytest.fixture
def mock_current_user():
    """Mock current user for authentication."""
    return {
        "sub": "test-user-123",
        "email": "test@example.com",
        "username": "testuser"
    }


@pytest.fixture
def mock_dynamodb_table():
    """Create a mock DynamoDB table."""
    table = MagicMock()
    return table


@patch('app.services.space.boto3.resource')
def test_empty_spaces_returns_proper_json(mock_boto3, mock_current_user, mock_dynamodb_table, client):
    """Test that /api/users/spaces returns proper JSON even when empty."""
    # Setup mocks
    mock_boto3.return_value.Table.return_value = mock_dynamodb_table
    
    # Override authentication dependency
    from app.core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    
    # Mock empty query result
    mock_dynamodb_table.query.return_value = {
        'Items': [],
        'Count': 0
    }
    
    # Make request
    response = client.get(
        "/api/users/spaces",
        headers={"Authorization": "Bearer fake-token"}
    )
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert "spaces" in data
    assert data["spaces"] == []
    assert data["total"] == 0
    assert data["hasMore"] == False
    assert data.get("page") == 1
    assert data.get("pageSize") == 20


@patch('app.services.space.boto3.resource')
def test_create_space_returns_proper_json(mock_boto3, mock_current_user, mock_dynamodb_table, client):
    """Test that POST /api/spaces returns proper JSON with spaceId field."""
    # Setup mocks
    mock_boto3.return_value.Table.return_value = mock_dynamodb_table
    
    # Override authentication dependency
    from app.core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    
    # Mock batch writer
    mock_batch_writer = MagicMock()
    mock_batch_writer.__enter__ = MagicMock(return_value=mock_batch_writer)
    mock_batch_writer.__exit__ = MagicMock(return_value=None)
    mock_dynamodb_table.batch_writer.return_value = mock_batch_writer
    
    # Make request
    response = client.post(
        "/api/spaces",
        json={
            "name": "Test Space",
            "description": "A test space",
            "isPublic": False
        },
        headers={"Authorization": "Bearer fake-token"}
    )
    
    # Verify response
    assert response.status_code == 201
    data = response.json()
    
    # Check required fields with proper aliases
    assert "spaceId" in data
    assert data["name"] == "Test Space"
    assert data["description"] == "A test space"
    assert "ownerId" in data
    assert data["ownerId"] == "test-user-123"
    assert "createdAt" in data
    assert "updatedAt" in data
    assert "memberCount" in data
    assert data["memberCount"] == 1
    assert "isPublic" in data
    assert data["isPublic"] == False
    assert "isOwner" in data
    assert data["isOwner"] == True
    assert "inviteCode" in data


@patch('app.services.space.boto3.resource')
def test_created_space_appears_in_list(mock_boto3, mock_current_user, mock_dynamodb_table, client):
    """Test that a created space appears in the user's space list."""
    # Setup mocks
    mock_boto3.return_value.Table.return_value = mock_dynamodb_table
    
    # Override authentication dependency
    from app.core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    
    space_id = "test-space-456"
    now = datetime.now(timezone.utc).isoformat()
    
    # Mock GSI1 query result with a space
    mock_dynamodb_table.query.side_effect = [
        # First call: GSI1 query for user's spaces
        {
            'Items': [{
                'PK': f'SPACE#{space_id}',
                'SK': f'MEMBER#{mock_current_user["sub"]}',
                'GSI1PK': f'USER#{mock_current_user["sub"]}',
                'GSI1SK': f'SPACE#{space_id}',
                'user_id': mock_current_user["sub"],
                'role': 'owner',
                'joined_at': now
            }],
            'Count': 1
        },
        # Second call: Query for member count
        {
            'Items': [{'role': 'owner'}],
            'Count': 1
        }
    ]
    
    # Mock get_item for space metadata
    mock_dynamodb_table.get_item.return_value = {
        'Item': {
            'PK': f'SPACE#{space_id}',
            'SK': 'METADATA',
            'id': space_id,
            'name': 'Test Space',
            'description': 'A test space',
            'type': 'workspace',
            'is_public': False,
            'owner_id': mock_current_user["sub"],
            'created_at': now,
            'updated_at': now
        }
    }
    
    # Make request
    response = client.get(
        "/api/users/spaces",
        headers={"Authorization": "Bearer fake-token"}
    )
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    
    assert "spaces" in data
    assert len(data["spaces"]) == 1
    assert data["total"] == 1
    assert data["hasMore"] == False
    
    # Check the space data has proper aliases
    space = data["spaces"][0]
    assert space["spaceId"] == space_id
    assert space["name"] == "Test Space"
    assert space["description"] == "A test space"
    assert space["ownerId"] == mock_current_user["sub"]
    assert space["memberCount"] == 1
    assert space["isPublic"] == False
    assert space["isOwner"] == True
    assert "createdAt" in space
    assert "updatedAt" in space


@patch('app.services.space.boto3.resource')
def test_multiple_spaces_with_pagination(mock_boto3, mock_current_user, mock_dynamodb_table, client):
    """Test pagination works correctly with multiple spaces."""
    # Setup mocks
    mock_boto3.return_value.Table.return_value = mock_dynamodb_table
    
    # Override authentication dependency
    from app.core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create mock items for 3 spaces
    mock_items = []
    for i in range(3):
        space_id = f"space-{i}"
        mock_items.append({
            'PK': f'SPACE#{space_id}',
            'SK': f'MEMBER#{mock_current_user["sub"]}',
            'GSI1PK': f'USER#{mock_current_user["sub"]}',
            'GSI1SK': f'SPACE#{space_id}',
            'user_id': mock_current_user["sub"],
            'role': 'owner' if i == 0 else 'member',
            'joined_at': now
        })
    
    # Mock GSI1 query
    mock_dynamodb_table.query.side_effect = [
        # GSI1 query for user's spaces
        {'Items': mock_items, 'Count': 3},
        # Member count queries for each space
        {'Items': [{'role': 'owner'}], 'Count': 1},
        {'Items': [{'role': 'member'}], 'Count': 2},
        {'Items': [{'role': 'member'}], 'Count': 3}
    ]
    
    # Mock get_item calls for space metadata
    def get_item_side_effect(Key):
        space_id = Key['PK'].replace('SPACE#', '')
        idx = int(space_id.split('-')[1])
        return {
            'Item': {
                'PK': f'SPACE#{space_id}',
                'SK': 'METADATA',
                'id': space_id,
                'name': f'Space {idx}',
                'description': f'Description {idx}',
                'type': 'workspace',
                'is_public': idx == 1,  # Make second space public
                'owner_id': mock_current_user["sub"] if idx == 0 else f'other-user-{idx}',
                'created_at': now,
                'updated_at': now
            }
        }
    
    mock_dynamodb_table.get_item.side_effect = get_item_side_effect
    
    # Test with limit=2
    response = client.get(
        "/api/users/spaces?limit=2",
        headers={"Authorization": "Bearer fake-token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["spaces"]) == 2
    assert data["total"] == 3
    assert data["hasMore"] == True
    assert data["page"] == 1
    assert data["pageSize"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])