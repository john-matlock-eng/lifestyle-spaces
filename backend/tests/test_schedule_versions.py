"""
Tests for schedule version tracking functionality.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, date, timedelta
from app.services.schedule import ScheduleService, ScheduleNotFoundError
from app.services.exceptions import UnauthorizedError
from app.models.schedule import ScheduleCreate, ScheduleUpdate


class TestScheduleVersions:
    """Tests for schedule version tracking features."""

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
                    "activityType": "work"
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

    def test_version_auto_increment(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that version number auto-increments on updates."""
        # Mock existing schedule
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'version': 1,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        # Mock update response
        updated_item = existing_item.copy()
        updated_item['version'] = 2
        updated_item['schedule_data'] = {"tuesday": [{"startTime": "10:00", "endTime": "18:00", "activity": "Work", "activityType": "work"}]}
        mock_table.update_item.return_value = {'Attributes': updated_item}

        update = ScheduleUpdate(
            schedule_data={"tuesday": [{"startTime": "10:00", "endTime": "18:00", "activity": "Work", "activityType": "work"}]}
        )

        result = service.update_schedule('schedule-123', update, 'user-123')

        # Verify version was incremented
        assert result['version'] == 2

        # Verify version snapshot was saved
        assert mock_table.put_item.called
        version_item = mock_table.put_item.call_args[1]['Item']
        assert version_item['SK'].startswith('VERSION#1#')

    def test_get_version_history(self, service, mock_table, valid_schedule_data, monday_date):
        """Test retrieving version history for a schedule."""
        # Mock schedule ownership check
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'version': 3,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        # Mock version history query
        version_items = [
            {
                'PK': 'SCHEDULE#schedule-123',
                'SK': 'VERSION#3#2024-01-03T12:00:00Z',
                'version': 3,
                'schedule_data': {"wednesday": []},
                'modified_at': '2024-01-03T12:00:00Z',
                'modified_by': 'user-123'
            },
            {
                'PK': 'SCHEDULE#schedule-123',
                'SK': 'VERSION#2#2024-01-02T12:00:00Z',
                'version': 2,
                'schedule_data': {"tuesday": []},
                'modified_at': '2024-01-02T12:00:00Z',
                'modified_by': 'user-123'
            },
            {
                'PK': 'SCHEDULE#schedule-123',
                'SK': 'VERSION#1#2024-01-01T12:00:00Z',
                'version': 1,
                'schedule_data': {"monday": []},
                'modified_at': '2024-01-01T12:00:00Z',
                'modified_by': 'user-123'
            }
        ]
        mock_table.query.return_value = {'Items': version_items}

        result = service.get_versions('schedule-123', 'user-123')

        # Verify results are returned in descending order
        assert len(result) == 3
        assert result[0]['version'] == 3
        assert result[1]['version'] == 2
        assert result[2]['version'] == 1

        # Verify query was called correctly
        assert mock_table.query.called
        query_kwargs = mock_table.query.call_args[1]
        assert 'KeyConditionExpression' in query_kwargs

    def test_get_specific_version(self, service, mock_table, valid_schedule_data, monday_date):
        """Test retrieving a specific version of a schedule."""
        # Mock schedule ownership check
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'version': 3,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        # Mock specific version query
        version_items = [
            {
                'PK': 'SCHEDULE#schedule-123',
                'SK': 'VERSION#2#2024-01-02T12:00:00Z',
                'version': 2,
                'schedule_data': {"tuesday": []},
                'modified_at': '2024-01-02T12:00:00Z',
                'modified_by': 'user-123'
            }
        ]
        mock_table.query.return_value = {'Items': version_items}

        result = service.get_version('schedule-123', 2, 'user-123')

        # Verify correct version returned
        assert result['version'] == 2
        assert result['schedule_data'] == {"tuesday": []}

    def test_version_limit_10(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that only last 10 versions are kept."""
        # Mock existing schedule
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'version': 11,  # Already at version 11
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        # Mock existing versions (11 versions)
        version_items = [
            {
                'PK': 'SCHEDULE#schedule-123',
                'SK': f'VERSION#{i}#2024-01-{i:02d}T12:00:00Z',
                'version': i
            }
            for i in range(1, 12)
        ]
        mock_table.query.return_value = {'Items': version_items}

        updated_item = existing_item.copy()
        updated_item['version'] = 12
        mock_table.update_item.return_value = {'Attributes': updated_item}

        update = ScheduleUpdate(
            schedule_data={"friday": []}
        )

        service.update_schedule('schedule-123', update, 'user-123')

        # Verify oldest version was deleted
        assert mock_table.delete_item.called
        delete_call = mock_table.delete_item.call_args[1]
        assert 'VERSION#1#' in delete_call['Key']['SK']

    def test_version_tracking_on_update(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that version is saved when schedule is updated."""
        # Mock existing schedule at version 1
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'version': 1,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        updated_data = {"tuesday": [{"startTime": "10:00", "endTime": "18:00", "activity": "Work", "activityType": "work"}]}
        updated_item = existing_item.copy()
        updated_item['version'] = 2
        updated_item['schedule_data'] = updated_data
        mock_table.update_item.return_value = {'Attributes': updated_item}

        update = ScheduleUpdate(schedule_data=updated_data)

        service.update_schedule('schedule-123', update, 'user-123')

        # Verify version snapshot was created
        assert mock_table.put_item.called
        version_call = mock_table.put_item.call_args[1]['Item']
        assert version_call['PK'] == 'SCHEDULE#schedule-123'
        assert version_call['SK'].startswith('VERSION#1#')
        assert version_call['schedule_data'] == valid_schedule_data
        assert version_call['version'] == 1
        assert version_call['modified_by'] == 'user-123'

    def test_get_versions_unauthorized(self, service, mock_table, monday_date):
        """Test that only schedule owner can view version history."""
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',  # Owned by user-123
            'week_starting': monday_date.isoformat(),
            'schedule_data': {},
            'version': 1,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        # User-456 tries to view user-123's version history
        with pytest.raises(UnauthorizedError):
            service.get_versions('schedule-123', 'user-456')

    def test_get_version_not_found(self, service, mock_table, monday_date):
        """Test getting a version that doesn't exist."""
        schedule_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': {},
            'version': 2,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': schedule_item}

        # Query returns no items for version 5
        mock_table.query.return_value = {'Items': []}

        with pytest.raises(ScheduleNotFoundError, match="Version 5 not found"):
            service.get_version('schedule-123', 5, 'user-123')

    def test_create_schedule_starts_at_version_1(self, service, mock_table, valid_schedule_data, monday_date):
        """Test that new schedules start at version 1."""
        schedule = ScheduleCreate(
            week_starting=monday_date,
            space_id="space-123",
            schedule_data=valid_schedule_data
        )

        result = service.create_schedule(schedule, user_id="user-123")

        # Verify version is 1
        assert result['version'] == 1

        # Verify put_item was called with version 1
        call_args = mock_table.put_item.call_args[1]['Item']
        assert call_args['version'] == 1
