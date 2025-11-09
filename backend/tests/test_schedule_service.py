"""
Unit tests for ScheduleService.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, date, timedelta
from botocore.exceptions import ClientError
from app.services.schedule import ScheduleService, ScheduleNotFoundError
from app.services.exceptions import ValidationError, UnauthorizedError
from app.models.schedule import ScheduleCreate, ScheduleUpdate


class TestScheduleService:
    """Tests for ScheduleService class."""

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
            ],
            "tuesday": [
                {
                    "startTime": "09:00",
                    "endTime": "12:00",
                    "activity": "Morning Meeting",
                    "activityType": "work"
                }
            ]
        }

    @pytest.fixture
    def monday_date(self):
        """Get the next Monday from today."""
        today = date.today()
        days_ahead = 0 - today.weekday()  # Monday is 0
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)

    def test_create_schedule_success(self, service, mock_table, valid_schedule_data, monday_date):
        """Test successful schedule creation."""
        schedule = ScheduleCreate(
            week_starting=monday_date,
            space_id="space-123",
            schedule_data=valid_schedule_data,
            notes="My weekly schedule"
        )

        result = service.create_schedule(schedule, user_id="user-123")

        # Verify table.put_item was called
        assert mock_table.put_item.called
        call_args = mock_table.put_item.call_args[1]['Item']

        # Verify response structure
        assert result['space_id'] == "space-123"
        assert result['user_id'] == "user-123"
        assert result['schedule_data'] == valid_schedule_data
        assert result['notes'] == "My weekly schedule"
        assert 'id' in result
        assert 'created_at' in result
        assert 'updated_at' in result

        # Verify DynamoDB item structure
        assert call_args['PK'].startswith('SCHEDULE#')
        assert call_args['SK'] == 'METADATA'
        assert call_args['GSI1PK'] == 'SPACE#space-123'
        assert call_args['GSI1SK'].startswith(f'WEEK#{monday_date.isoformat()}#USER#user-123')

    def test_create_schedule_with_template(self, service, mock_table, valid_schedule_data, monday_date):
        """Test creating a schedule template."""
        schedule = ScheduleCreate(
            week_starting=monday_date,
            space_id="space-123",
            schedule_data=valid_schedule_data,
            is_template=True,
            template_name="My Weekly Template"
        )

        result = service.create_schedule(schedule, user_id="user-123")

        assert result['is_template'] is True
        assert result['template_name'] == "My Weekly Template"

    def test_create_schedule_invalid_week_starting(self, valid_schedule_data):
        """Test that week_starting must be a Monday."""
        from pydantic import ValidationError as PydanticValidationError

        # Try to create with a Tuesday (not a Monday)
        tuesday = date.today()
        while tuesday.weekday() != 1:  # 1 = Tuesday
            tuesday += timedelta(days=1)

        with pytest.raises(PydanticValidationError):
            ScheduleCreate(
                week_starting=tuesday,
                space_id="space-123",
                schedule_data=valid_schedule_data
            )

    def test_create_schedule_missing_space_id(self, service, valid_schedule_data, monday_date):
        """Test that space_id is required."""
        schedule = ScheduleCreate(
            week_starting=monday_date,
            space_id="",
            schedule_data=valid_schedule_data
        )

        with pytest.raises(ValidationError, match="space_id is required"):
            service.create_schedule(schedule, user_id="user-123")

    def test_get_schedule_success(self, service, mock_table, valid_schedule_data, monday_date):
        """Test successful schedule retrieval."""
        mock_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'notes': 'Test notes',
            'is_template': False,
            'template_name': None,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': mock_item}

        result = service.get_schedule("schedule-123", "user-123")

        assert result['id'] == 'schedule-123'
        assert result['space_id'] == 'space-123'
        assert result['user_id'] == 'user-123'
        assert result['schedule_data'] == valid_schedule_data

        # Verify correct DynamoDB key was used
        mock_table.get_item.assert_called_once_with(
            Key={'PK': 'SCHEDULE#schedule-123', 'SK': 'METADATA'}
        )

    def test_get_schedule_not_found(self, service, mock_table):
        """Test getting non-existent schedule raises ScheduleNotFoundError."""
        mock_table.get_item.return_value = {}

        with pytest.raises(ScheduleNotFoundError, match="Schedule test-id not found"):
            service.get_schedule("test-id", "user-123")

    def test_get_schedules_by_week_all_users(self, service, mock_table, valid_schedule_data, monday_date):
        """Test getting all schedules for a week in a space."""
        mock_items = [
            {
                'id': 'schedule-1',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'week_starting': monday_date.isoformat(),
                'schedule_data': valid_schedule_data,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            },
            {
                'id': 'schedule-2',
                'space_id': 'space-123',
                'user_id': 'user-456',
                'week_starting': monday_date.isoformat(),
                'schedule_data': valid_schedule_data,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        ]
        mock_table.query.return_value = {'Items': mock_items}

        results = service.get_schedules_by_week(
            space_id="space-123",
            week_starting=monday_date
        )

        assert len(results) == 2
        assert results[0]['id'] == 'schedule-1'
        assert results[1]['id'] == 'schedule-2'

        # Verify query was called with correct parameters
        mock_table.query.assert_called_once()
        call_kwargs = mock_table.query.call_args[1]
        assert call_kwargs['IndexName'] == 'GSI1'

    def test_get_schedules_by_week_specific_user(self, service, mock_table, valid_schedule_data, monday_date):
        """Test getting schedules for a specific user in a week."""
        mock_items = [
            {
                'id': 'schedule-1',
                'space_id': 'space-123',
                'user_id': 'user-123',
                'week_starting': monday_date.isoformat(),
                'schedule_data': valid_schedule_data,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        ]
        mock_table.query.return_value = {'Items': mock_items}

        results = service.get_schedules_by_week(
            space_id="space-123",
            week_starting=monday_date,
            user_id="user-123"
        )

        assert len(results) == 1
        assert results[0]['user_id'] == 'user-123'

    def test_get_schedules_by_week_empty(self, service, mock_table, monday_date):
        """Test getting schedules when none exist for the week."""
        mock_table.query.return_value = {'Items': []}

        results = service.get_schedules_by_week(
            space_id="space-123",
            week_starting=monday_date
        )

        assert len(results) == 0

    def test_update_schedule_success(self, service, mock_table, valid_schedule_data, monday_date):
        """Test successful schedule update."""
        # Mock get_schedule to return existing schedule
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        # Mock update_item response
        updated_data = {"monday": [{"startTime": "10:00", "endTime": "18:00", "activity": "Work", "activityType": "work"}]}
        updated_item = existing_item.copy()
        updated_item['schedule_data'] = updated_data
        updated_item['notes'] = 'Updated notes'
        mock_table.update_item.return_value = {'Attributes': updated_item}

        update = ScheduleUpdate(
            schedule_data=updated_data,
            notes='Updated notes'
        )

        result = service.update_schedule("schedule-123", update, "user-123")

        assert result['schedule_data'] == updated_data
        assert result['notes'] == 'Updated notes'
        assert mock_table.update_item.called

    def test_update_schedule_not_found(self, service, mock_table):
        """Test updating non-existent schedule raises ScheduleNotFoundError."""
        mock_table.get_item.return_value = {}

        update = ScheduleUpdate(notes="New notes")

        with pytest.raises(ScheduleNotFoundError):
            service.update_schedule("nonexistent-id", update, "user-123")

    def test_update_schedule_unauthorized(self, service, mock_table, valid_schedule_data, monday_date):
        """Test user cannot update another user's schedule."""
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',  # Owned by user-123
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        update = ScheduleUpdate(notes="Trying to update someone else's schedule")

        with pytest.raises(UnauthorizedError, match="You can only update your own schedules"):
            service.update_schedule("schedule-123", update, "user-456")  # Different user

    def test_delete_schedule_success(self, service, mock_table, valid_schedule_data, monday_date):
        """Test successful schedule deletion."""
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        service.delete_schedule("schedule-123", "user-123")

        # Verify delete_item was called with correct key
        mock_table.delete_item.assert_called_once_with(
            Key={'PK': 'SCHEDULE#schedule-123', 'SK': 'METADATA'}
        )

    def test_delete_schedule_not_found(self, service, mock_table):
        """Test deleting non-existent schedule raises ScheduleNotFoundError."""
        mock_table.get_item.return_value = {}

        with pytest.raises(ScheduleNotFoundError):
            service.delete_schedule("nonexistent-id", "user-123")

    def test_delete_schedule_unauthorized(self, service, mock_table, valid_schedule_data, monday_date):
        """Test user cannot delete another user's schedule."""
        existing_item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',  # Owned by user-123
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        mock_table.get_item.return_value = {'Item': existing_item}

        with pytest.raises(UnauthorizedError, match="You can only delete your own schedules"):
            service.delete_schedule("schedule-123", "user-456")  # Different user

    def test_schedule_data_validation_invalid_day(self, monday_date):
        """Test that invalid day names are rejected."""
        from pydantic import ValidationError as PydanticValidationError

        invalid_data = {
            "notaday": [
                {
                    "startTime": "09:00",
                    "endTime": "17:00",
                    "activity": "Work",
                    "activityType": "work"
                }
            ]
        }

        with pytest.raises(PydanticValidationError):
            ScheduleCreate(
                week_starting=monday_date,
                space_id="space-123",
                schedule_data=invalid_data
            )

    def test_format_schedule_response(self, service, valid_schedule_data, monday_date):
        """Test schedule response formatting."""
        item = {
            'id': 'schedule-123',
            'space_id': 'space-123',
            'user_id': 'user-123',
            'week_starting': monday_date.isoformat(),
            'schedule_data': valid_schedule_data,
            'notes': 'Test notes',
            'is_template': False,
            'template_name': None,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        result = service._format_schedule_response(item)

        assert result['id'] == 'schedule-123'
        assert result['space_id'] == 'space-123'
        assert result['user_id'] == 'user-123'
        assert result['week_starting'] == monday_date.isoformat()
        assert result['schedule_data'] == valid_schedule_data
        assert result['notes'] == 'Test notes'
        assert result['is_template'] is False
        assert result['template_name'] is None
