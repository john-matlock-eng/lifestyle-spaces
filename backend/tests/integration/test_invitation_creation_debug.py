"""
Integration test to reproduce the invitation creation 500 error.

This test mimics the exact API call that's failing in production:
POST /api/spaces/{space_id}/invitations
Body: {"email": "matlock.john@gmail.com", "role": "member"}
"""
import pytest
import os
from datetime import datetime, timedelta, timezone
from moto import mock_dynamodb
import boto3
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user
from app.models.invitation import InvitationCreate


@pytest.fixture
def setup_dynamodb():
    """Set up mocked DynamoDB table."""
    with mock_dynamodb():
        # Create DynamoDB client
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

        # Create table with test name (matches config.py default for tests)
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

        # Wait for table to be ready
        table.wait_until_exists()

        # Create a test space
        space_id = "3bf108cc-54d4-4db5-91fa-e6fe256bbe39"
        user_id = "test-user-123"
        created_at = datetime.now(timezone.utc).isoformat()

        table.put_item(
            Item={
                'PK': f'SPACE#{space_id}',
                'SK': 'METADATA',
                'id': space_id,
                'space_id': space_id,
                'name': 'Test Space',
                'description': 'A test space for invitation testing',
                'type': 'workspace',
                'is_public': False,
                'owner_id': user_id,
                'created_by': user_id,
                'created_at': created_at,
                'updated_at': created_at,
                'EntityType': 'Space'
            }
        )

        # Add user as member/owner
        table.put_item(
            Item={
                'PK': f'SPACE#{space_id}',
                'SK': f'MEMBER#{user_id}',
                'user_id': user_id,
                'role': 'owner',
                'added_at': created_at,
                'EntityType': 'SpaceMember'
            }
        )

        yield table


def test_invitation_creation_with_real_service(setup_dynamodb):
    """
    Test that reproduces the exact error from production.

    This test:
    1. Creates a test space and user in DynamoDB
    2. Calls the POST /api/spaces/{space_id}/invitations endpoint
    3. Verifies it doesn't return a 500 error
    4. Shows the actual error message if it fails
    """
    # Set up test client
    client = TestClient(app)

    # Mock authenticated user
    mock_user = {
        "sub": "test-user-123",
        "email": "test@example.com",
        "username": "testuser",
        "full_name": "Test User"
    }

    # Override auth dependency
    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        # Make the exact API call that's failing
        space_id = "3bf108cc-54d4-4db5-91fa-e6fe256bbe39"
        response = client.post(
            f"/api/spaces/{space_id}/invitations",
            json={
                "email": "matlock.john@gmail.com",
                "role": "member"
            }
        )

        # Print response for debugging
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Body: {response.json()}")

        # Assert we don't get a 500 error
        assert response.status_code != 500, f"Got 500 error: {response.json()}"

        # Should be 201 Created
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"

        # Verify response structure
        data = response.json()
        assert "id" in data or "invitation_id" in data
        assert data.get("invitee_email") == "matlock.john@gmail.com"

    finally:
        # Clean up
        app.dependency_overrides.clear()


def test_invitation_service_create_directly():
    """
    Test the invitation service create_invitation method directly to isolate the issue.
    """
    with mock_dynamodb():
        # Set up DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='lifestyle-spaces-test',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()

        # Import service
        from app.services.invitation import InvitationService
        from app.core.database import DynamoDBClient

        # Create service
        db_client = DynamoDBClient()
        invitation_service = InvitationService(db_client)

        # Create invitation data
        invitation_data = InvitationCreate(
            space_id="3bf108cc-54d4-4db5-91fa-e6fe256bbe39",
            invitee_email="matlock.john@gmail.com"
        )

        # Call the method with the same signature as the route
        try:
            result = invitation_service.create_invitation(invitation_data, "test-user-123")

            print(f"\nService returned: {result}")
            print(f"Result type: {type(result)}")

            # Should return an Invitation object
            assert result is not None
            assert hasattr(result, 'invitation_id') or isinstance(result, dict)

        except Exception as e:
            print(f"\nException caught: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            raise
