"""
Integration test to verify space creation generates invite codes.
"""
import pytest
import os
from moto import mock_dynamodb
from app.services.space import SpaceService
from app.models.space import SpaceCreate


@pytest.fixture
def dynamodb_table():
    """Create a DynamoDB table for testing."""
    with mock_dynamodb():
        import boto3

        # Create DynamoDB table
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces-test')

        table = dynamodb.create_table(
            TableName=table_name,
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
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )

        yield table


def test_create_space_generates_invite_code(dynamodb_table):
    """Test that creating a space generates an invite code."""
    # Arrange
    service = SpaceService()
    space_data = SpaceCreate(
        name="Test Space",
        description="Test description",
        type="workspace",
        is_public=False
    )
    owner_id = "test-user-123"

    # Act
    result = service.create_space(space=space_data, owner_id=owner_id)

    # Assert
    assert result is not None, "Result should not be None"
    assert 'invite_code' in result, "Result should contain invite_code"
    assert result['invite_code'] is not None, "Invite code should not be None"
    assert len(result['invite_code']) == 8, "Invite code should be 8 characters"
    # Check it's valid hex (0-9A-F)
    assert all(c in '0123456789ABCDEF' for c in result['invite_code']), "Invite code should be hex characters only"

    print(f"[OK] Space created with invite code: {result['invite_code']}")

    # Verify it's stored in DynamoDB
    space_id = result['id']
    response = dynamodb_table.get_item(
        Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
    )

    assert 'Item' in response, "Space should be stored in DynamoDB"
    assert response['Item']['invite_code'] == result['invite_code'], "Stored invite code should match returned invite code"

    print(f"[OK] Invite code verified in DynamoDB: {response['Item']['invite_code']}")


def test_create_space_stores_invite_mapping(dynamodb_table):
    """Test that creating a space stores the invite code mapping."""
    # Arrange
    service = SpaceService()
    space_data = SpaceCreate(
        name="Test Space 2",
        description="Test description",
        type="workspace",
        is_public=False
    )
    owner_id = "test-user-456"

    # Act
    result = service.create_space(space=space_data, owner_id=owner_id)

    # Assert
    invite_code = result['invite_code']
    space_id = result['id']

    # Verify invite code mapping exists
    response = dynamodb_table.get_item(
        Key={'PK': f'INVITE#{invite_code}', 'SK': f'SPACE#{space_id}'}
    )

    assert 'Item' in response, "Invite code mapping should exist"
    assert response['Item']['space_id'] == space_id, "Mapping should point to correct space"

    print(f"[OK] Invite code mapping verified: INVITE#{invite_code} -> SPACE#{space_id}")


def test_get_space_includes_invite_code_for_owner(dynamodb_table):
    """Test that getting a space includes invite code for the owner."""
    # Arrange
    service = SpaceService()
    space_data = SpaceCreate(
        name="Test Space 3",
        description="Test description",
        type="workspace",
        is_public=False
    )
    owner_id = "test-user-789"

    # Act - Create space
    created_space = service.create_space(space=space_data, owner_id=owner_id)
    space_id = created_space['id']
    invite_code = created_space['invite_code']

    # Act - Get space as owner
    retrieved_space = service.get_space(space_id=space_id, user_id=owner_id)

    # Assert
    assert 'invite_code' in retrieved_space, "Retrieved space should include invite code"
    assert retrieved_space['invite_code'] == invite_code, "Retrieved invite code should match created invite code"

    print(f"[OK] Space retrieval includes invite code for owner: {retrieved_space['invite_code']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
