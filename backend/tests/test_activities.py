"""
Tests for Activity tracking functionality.
Following TDD approach - tests for activity recording and retrieval.
"""
import json
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, Mock, MagicMock
import pytest
from fastapi import status
from fastapi.testclient import TestClient


class TestActivityFeedAPI:
    """Tests for GET /api/spaces/{space_id}/activities endpoint."""

    def test_get_activities_success(self, test_client):
        """Test successful retrieval of space activities."""
        # Arrange
        space_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": user_id,
                "email": "test@example.com",
                "username": "testuser"
            }

            # Mock UserProfileService
            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "username": "testuser",
                    "email": "test@example.com",
                    "display_name": "Test User"
                }

                # Mock space membership check
                with patch('app.api.routes.activities.get_dynamodb_table') as mock_table:
                    mock_table_instance = Mock()
                    mock_table.return_value = mock_table_instance
                    mock_table_instance.get_item.return_value = {
                        'Item': {
                            'PK': f'SPACE#{space_id}',
                            'SK': f'MEMBER#{user_id}',
                            'role': 'member'
                        }
                    }

                    # Mock activity service
                    with patch('app.api.routes.activities.get_activity_service') as mock_service:
                        mock_service_instance = Mock()
                        mock_service.return_value = mock_service_instance

                        activities = [
                            {
                                "activityId": str(uuid.uuid4()),
                                "spaceId": space_id,
                                "activityType": "journal_created",
                                "userId": user_id,
                                "userName": "Test User",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "metadata": {
                                    "journal_id": str(uuid.uuid4()),
                                    "journal_title": "My Journal",
                                    "content_preview": "This is a test journal..."
                                }
                            }
                        ]

                        mock_service_instance.get_space_activities.return_value = (activities, None)

                        # Act
                        response = test_client.get(
                            f"/api/spaces/{space_id}/activities",
                            headers={"Authorization": "Bearer test-token"}
                        )

                        # Assert
                        assert response.status_code == status.HTTP_200_OK
                        data = response.json()
                        assert "activities" in data
                        assert len(data["activities"]) == 1
                        assert data["activities"][0]["activityType"] == "journal_created"
                        assert data["nextToken"] is None

    def test_get_activities_unauthorized_non_member(self, test_client):
        """Test that non-members cannot view activities."""
        # Arrange
        space_id = str(uuid.uuid4())
        user_id = "user-123"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": user_id,
                "email": "test@example.com",
                "username": "testuser"
            }

            # Mock UserProfileService
            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "username": "testuser",
                    "email": "test@example.com"
                }

                # Mock space membership check - not a member
                with patch('app.api.routes.activities.get_dynamodb_table') as mock_table:
                    mock_table_instance = Mock()
                    mock_table.return_value = mock_table_instance
                    mock_table_instance.get_item.return_value = {}  # No Item = not a member

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}/activities",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_activities_with_pagination(self, test_client):
        """Test activity pagination."""
        # Arrange
        space_id = str(uuid.uuid4())
        user_id = "user-123"
        next_token = "some-pagination-token"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": user_id,
                "email": "test@example.com",
                "username": "testuser"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": user_id,
                    "username": "testuser",
                    "email": "test@example.com"
                }

                with patch('app.api.routes.activities.get_dynamodb_table') as mock_table:
                    mock_table_instance = Mock()
                    mock_table.return_value = mock_table_instance
                    mock_table_instance.get_item.return_value = {
                        'Item': {'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
                    }

                    with patch('app.api.routes.activities.get_activity_service') as mock_service:
                        mock_service_instance = Mock()
                        mock_service.return_value = mock_service_instance
                        mock_service_instance.get_space_activities.return_value = ([], next_token)

                        # Act
                        response = test_client.get(
                            f"/api/spaces/{space_id}/activities?limit=25",
                            headers={"Authorization": "Bearer test-token"}
                        )

                        # Assert
                        assert response.status_code == status.HTTP_200_OK
                        data = response.json()
                        assert data["nextToken"] == next_token


class TestActivityService:
    """Tests for ActivityService functionality."""

    def test_record_journal_created_activity(self):
        """Test recording a journal created activity."""
        from app.services.activity import ActivityService
        from app.models.activity import ActivityType

        # Arrange
        with patch('app.services.activity.get_dynamodb_table') as mock_table:
            mock_table_instance = Mock()
            mock_table.return_value = mock_table_instance

            service = ActivityService()
            space_id = str(uuid.uuid4())
            user_id = "user-123"
            journal_id = str(uuid.uuid4())

            # Act
            activity = service.record_activity(
                space_id=space_id,
                activity_type=ActivityType.JOURNAL_CREATED,
                user_id=user_id,
                user_name="Test User",
                metadata={
                    'journal_id': journal_id,
                    'journal_title': "My Journal",
                    'content_preview': "This is a test..."
                }
            )

            # Assert
            assert activity.space_id == space_id
            assert activity.user_id == user_id
            assert activity.activity_type == ActivityType.JOURNAL_CREATED
            assert activity.metadata['journal_id'] == journal_id
            mock_table_instance.put_item.assert_called_once()

    def test_get_space_activities(self):
        """Test retrieving activities for a space."""
        from app.services.activity import ActivityService

        # Arrange
        space_id = str(uuid.uuid4())
        activity_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        with patch('app.services.activity.get_dynamodb_table') as mock_table:
            mock_table_instance = Mock()
            mock_table.return_value = mock_table_instance

            mock_table_instance.query.return_value = {
                'Items': [
                    {
                        'ActivityId': activity_id,
                        'SpaceId': space_id,
                        'ActivityType': 'journal_created',
                        'UserId': 'user-123',
                        'UserName': 'Test User',
                        'Timestamp': timestamp,
                        'Metadata': {
                            'journal_id': str(uuid.uuid4()),
                            'journal_title': 'My Journal'
                        }
                    }
                ]
            }

            service = ActivityService()

            # Act
            activities, next_token = service.get_space_activities(space_id=space_id, limit=50)

            # Assert
            assert len(activities) == 1
            assert activities[0].activity_id == activity_id
            assert activities[0].activity_type == 'journal_created'
            assert next_token is None

    def test_activity_types(self):
        """Test that all expected activity types are defined."""
        from app.models.activity import ActivityType

        # Assert all expected activity types exist
        assert ActivityType.JOURNAL_CREATED
        assert ActivityType.JOURNAL_UPDATED
        assert ActivityType.JOURNAL_DELETED
        assert ActivityType.HIGHLIGHT_CREATED
        assert ActivityType.HIGHLIGHT_DELETED
        assert ActivityType.COMMENT_CREATED
        assert ActivityType.MEMBER_JOINED
