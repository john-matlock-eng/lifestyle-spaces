"""
Tests for schedule sharing functionality.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, date, timedelta
from app.services.schedule import ScheduleService, ScheduleNotFoundError
from app.services.exceptions import UnauthorizedError
from app.models.schedule import ScheduleCreate


class TestScheduleSharing:
    """Tests for schedule sharing features."""

    @pytest.fixture
    def mock_table(self):
        """Create a mock DynamoDB table."""
        with patch('app.services.schedule.boto3.resource') as mock_resource:
            mock_table = MagicMock()
            mock_resource.return_value.Table.return_value = mock_table
            yield mock_table

    @pytest.fixture
    def service(self, mock_table):
        """Create a ScheduleService instance with mocked DynamoDB."""
        with patch.object(ScheduleService, '_get_or_create_table', return_value=mock_table):
            return ScheduleService()

    @pytest.fixture
    def valid_schedule_data(self):
        """Create valid schedule data for testing."""
        return {
            "monday": [
                {
                    "startTime": "09:00",
                    "endTime": "17:00",
                    "activity": "Work",
                    "activityType": "work",
                    "description": "Regular work hours"
                }
            ]
        }

    @pytest.fixture
    def monday_date(self):
        """Get the next Monday from today."""
        today = date.today()
        days_ahead = 0 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)

    def test_create_share_token_success(self, service, mock_table, valid_schedule_data, monday_date):
        """Test creating a share token for a schedule."""
        # Mock get_schedule to return owner's schedule
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}
        mock_table.update_item.return_value = {'Attributes': schedule_item}

        result = service.create_share_token(
            schedule_id='schedule-123',
            user_id='user-123'
        )

        # Verify response structure
        assert 'share_token' in result
        assert 'share_link' in result
        assert 'created_at' in result
        assert result['schedule_id'] == 'schedule-123'

        # Verify share token was written to DynamoDB
        assert mock_table.put_item.called
        share_item = mock_table.put_item.call_args[1]['Item']
        assert share_item['PK'].startswith('SHARE#')
        assert share_item['SK'] == 'SCHEDULE#schedule-123'

        # Verify schedule was updated with sharing settings
        assert mock_table.update_item.called

    def test_create_share_token_unauthorized(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that only schedule owner can create share token."""
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',  # Owned by user-123
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        # User-456 tries to share user-123's schedule
        with pytest.raises(UnauthorizedError, match="You can only share your own schedules"):
            service.create_share_token(
                schedule_id='schedule-123',
                user_id='user-456'
            )

    def test_create_share_token_not_found(self, service, mock_table):
        """Test creating share token for non-existent schedule."""
        mock_table.get_item.return_value = {}

        with pytest.raises(ScheduleNotFoundError):
            service.create_share_token(
                schedule_id='nonexistent-id',
                user_id='user-123'
            )

    def test_get_shared_schedule_public(self, service, mock_table, valid_schedule_data, monday_date):
        """Test public access to shared schedule via share token."""
        # Mock share token lookup
        share_item = {
            'PK': 'SHARE#abc123',
            'SK': 'SCHEDULE#schedule-123',
            'schedule_id': 'schedule-123',
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'sharing_settings': {
                'is_public': True,
                'share_token': 'abc123',
                'view_count': 0
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Mock query to return share mapping
        mock_table.query.return_value = {'Items': [share_item]}
        # Mock get_item to return schedule
        mock_table.get_item.return_value = {'Item': schedule_item}

        result = service.get_shared_schedule(share_token='abc123')

        # Verify schedule returned
        assert result['id'] == 'schedule-123'
        assert result['schedule_data'] == valid_schedule_data

        # Verify view count was incremented
        assert mock_table.update_item.called

    def test_get_shared_schedule_invalid_token(self, service, mock_table):
        """Test accessing schedule with invalid share token."""
        # Mock query returning no items
        mock_table.query.return_value = {'Items': []}

        with pytest.raises(ScheduleNotFoundError, match="Share token not found"):
            service.get_shared_schedule(share_token='invalid-token')

    def test_share_token_uniqueness(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that share tokens are unique UUID4s."""
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}
        mock_table.update_item.return_value = {'Attributes': schedule_item}

        # Create multiple share tokens
        result1 = service.create_share_token('schedule-123', 'user-123')
        result2 = service.create_share_token('schedule-123', 'user-123')

        # Tokens should be different
        assert result1['share_token'] != result2['share_token']

        # Both should be valid UUIDs
        import uuid
        uuid.UUID(result1['share_token'])  # Raises ValueError if invalid
        uuid.UUID(result2['share_token'])

    def test_view_count_tracking(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that view count is tracked when accessing shared schedules."""
        share_item = {
            'PK': 'SHARE#abc123',
            'SK': 'SCHEDULE#schedule-123',
            'schedule_id': 'schedule-123',
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'sharing_settings': {
                'is_public': True,
                'share_token': 'abc123',
                'view_count': 5
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Mock query to return share mapping
        mock_table.query.return_value = {'Items': [share_item]}
        # Mock get_item to return schedule
        mock_table.get_item.return_value = {'Item': schedule_item}

        service.get_shared_schedule(share_token='abc123')

        # Verify update_item was called to increment view count
        assert mock_table.update_item.called
        update_call = mock_table.update_item.call_args[1]
        assert 'view_count' in update_call['UpdateExpression'].lower()

    def test_disable_sharing(self, service, mock_table, valid_schedule_data, monday_date):
        """Test disabling sharing for a schedule."""
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'sharing_settings': {
                'is_public': True,
                'share_token': 'abc123',
                'view_count': 10
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        result = service.disable_sharing(
            schedule_id='schedule-123',
            user_id='user-123'
        )

        # Verify schedule was updated to disable sharing
        assert mock_table.update_item.called
        update_call = mock_table.update_item.call_args[1]
        assert ':is_public' in update_call['ExpressionAttributeValues']
        assert update_call['ExpressionAttributeValues'][':is_public'] is False

    def test_disable_sharing_unauthorized(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that only owner can disable sharing."""
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        with pytest.raises(UnauthorizedError):
            service.disable_sharing(
                schedule_id='schedule-123',
                user_id='user-456'
            )
