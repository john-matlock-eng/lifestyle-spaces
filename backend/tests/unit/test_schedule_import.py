"""
Tests for schedule import service
"""
import pytest
import json
from app.services.schedule_import_service import ScheduleImportService


class TestScheduleImportService:
    """Test schedule import functionality"""

    def test_parse_valid_json(self):
        """Test parsing valid schedule JSON"""
        service = ScheduleImportService()

        valid_json = json.dumps({
            "name": "Weekly Schedule",
            "days": {
                "monday": [
                    {"time": "9:00-10:00", "activity": "Morning meeting"},
                    {"time": "10:00-12:00", "activity": "Focus work"}
                ],
                "tuesday": [
                    {"time": "14:00-15:00", "activity": "1:1 with manager"}
                ]
            }
        })

        schedule, errors = service.parse_import_json(valid_json)

        assert errors == []
        assert schedule is not None
        assert "scheduleData" in schedule
        assert "monday" in schedule["scheduleData"]
        assert len(schedule["scheduleData"]["monday"]) == 2

    def test_invalid_json_syntax(self):
        """Test handling of invalid JSON syntax"""
        service = ScheduleImportService()

        invalid_json = '{"days": {"monday": [{'  # Missing closing braces

        schedule, errors = service.parse_import_json(invalid_json)

        assert schedule is None
        assert len(errors) > 0
        assert errors[0].field == "json"
        assert "Invalid JSON syntax" in errors[0].message

    def test_missing_days_field(self):
        """Test validation when 'days' field is missing"""
        service = ScheduleImportService()

        json_without_days = json.dumps({"name": "Schedule"})

        schedule, errors = service.parse_import_json(json_without_days)

        assert schedule is None
        assert len(errors) > 0
        assert any(err.field == "days" for err in errors)

    def test_invalid_day_name(self):
        """Test fuzzy matching for invalid day names"""
        service = ScheduleImportService()

        json_with_typo = json.dumps({
            "days": {
                "Mnday": [{"time": "9:00-10:00", "activity": "Work"}]  # Typo: Mnday
            }
        })

        schedule, errors = service.parse_import_json(json_with_typo)

        assert schedule is None
        assert len(errors) > 0
        assert any("Did you mean 'Monday'?" in err.message for err in errors)

    def test_time_format_normalization(self):
        """Test various time format inputs"""
        service = ScheduleImportService()

        # Test different formats
        test_cases = [
            ("9am-10am", ("09:00", "10:00")),
            ("9:00-10:00", ("09:00", "10:00")),
            ("09:00-10:00", ("09:00", "10:00")),
            ("9:00 AM - 10:00 AM", ("09:00", "10:00")),
            ("2pm-3pm", ("14:00", "15:00")),
            ("14:00-15:00", ("14:00", "15:00")),
        ]

        for input_time, expected_output in test_cases:
            result = service.normalize_time_format(input_time)
            assert result == expected_output, f"Failed for input: {input_time}"

    def test_activity_type_inference(self):
        """Test automatic activity type inference"""
        service = ScheduleImportService()

        test_cases = [
            ("Team meeting", "meeting"),
            ("1:1 with John", "meeting"),
            ("Deep work session", "focus"),
            ("Coding time", "focus"),
            ("Gym workout", "personal"),
            ("Lunch break", "personal"),
            ("Coffee with Sarah", "social"),
        ]

        for activity, expected_type in test_cases:
            result = service.infer_activity_type(activity)
            assert result == expected_type, f"Failed for: {activity}"

    def test_emoji_inference(self):
        """Test automatic emoji inference from activity"""
        service = ScheduleImportService()

        test_cases = [
            ("Gym workout", "💪"),
            ("Focus work", "🎯"),
            ("Coffee break", "☕"),
            ("Lunch", "🍽️"),
            ("Meeting", "📞"),
            ("Coding", "💻"),
        ]

        for activity, expected_emoji in test_cases:
            result = service.infer_emoji_from_activity(activity)
            assert result == expected_emoji, f"Failed for: {activity}"

    def test_conflict_detection(self):
        """Test detection of overlapping time blocks"""
        service = ScheduleImportService()

        overlapping_blocks = [
            {"startTime": "09:00", "endTime": "10:30", "activity": "Meeting"},
            {"startTime": "10:00", "endTime": "11:00", "activity": "Call"},  # Overlaps!
        ]

        conflicts = service.detect_conflicts("monday", overlapping_blocks)

        assert len(conflicts) == 1
        assert conflicts[0].day == "monday"
        assert "Overlapping" in conflicts[0].message

    def test_no_conflicts(self):
        """Test that non-overlapping blocks don't create conflicts"""
        service = ScheduleImportService()

        non_overlapping_blocks = [
            {"startTime": "09:00", "endTime": "10:00", "activity": "Meeting"},
            {"startTime": "10:00", "endTime": "11:00", "activity": "Call"},  # Adjacent, not overlapping
        ]

        conflicts = service.detect_conflicts("monday", non_overlapping_blocks)

        assert len(conflicts) == 0

    def test_full_import_with_inference(self):
        """Test complete import with all inference features"""
        service = ScheduleImportService()

        import_json = json.dumps({
            "name": "My Week",
            "description": "A typical work week",
            "days": {
                "monday": [
                    {"time": "9am-10am", "activity": "Team standup"},
                    {"time": "10:00-12:00", "activity": "Deep work coding"},
                    {"time": "12:00-13:00", "activity": "Lunch"},
                ],
                "wednesday": [
                    {"time": "14:00-15:00", "activity": "Gym workout"}
                ]
            }
        })

        schedule, errors = service.parse_import_json(import_json)

        assert errors == []
        assert schedule is not None

        # Check monday blocks
        monday_blocks = schedule["scheduleData"]["monday"]
        assert len(monday_blocks) == 3

        # Check standup
        standup = monday_blocks[0]
        assert standup["startTime"] == "09:00"
        assert standup["endTime"] == "10:00"
        assert standup["activityType"] == "meeting"
        assert standup["emoji"] == "📞"

        # Check deep work - should prioritize "coding" keyword over "deep work"
        deep_work = monday_blocks[1]
        assert deep_work["activityType"] == "focus"
        assert deep_work["emoji"] == "💻"  # Matches "coding" keyword first

        # Check wednesday workout
        wednesday_blocks = schedule["scheduleData"]["wednesday"]
        workout = wednesday_blocks[0]
        assert workout["activityType"] == "personal"
        assert workout["emoji"] == "💪"

        # Check metadata
        assert schedule["metadata"]["name"] == "My Week"

    def test_missing_activity(self):
        """Test validation when activity is missing"""
        service = ScheduleImportService()

        json_missing_activity = json.dumps({
            "days": {
                "monday": [
                    {"time": "9:00-10:00"}  # Missing activity
                ]
            }
        })

        schedule, errors = service.parse_import_json(json_missing_activity)

        assert schedule is None
        assert len(errors) > 0
        assert any("activity" in err.field.lower() for err in errors)

    def test_invalid_time_format(self):
        """Test handling of invalid time formats"""
        service = ScheduleImportService()

        json_invalid_time = json.dumps({
            "days": {
                "monday": [
                    {"time": "invalid", "activity": "Work"}
                ]
            }
        })

        schedule, errors = service.parse_import_json(json_invalid_time)

        assert schedule is None
        assert len(errors) > 0
        assert any("time" in err.field.lower() for err in errors)

    def test_parse_relative_date(self):
        """Test relative date parsing"""
        service = ScheduleImportService()

        # Test "today"
        today_result = service.parse_relative_date("today")
        assert today_result is not None
        assert len(today_result) == 10  # YYYY-MM-DD format

        # Test "tomorrow"
        tomorrow_result = service.parse_relative_date("tomorrow")
        assert tomorrow_result is not None

        # Test "next monday"
        next_monday = service.parse_relative_date("next monday")
        assert next_monday is not None

    def test_apply_defaults(self):
        """Test applying default values to all days"""
        service = ScheduleImportService()

        days = {
            "monday": [
                {"time": "9:00-10:00", "activity": "Meeting"}
            ]
        }

        defaults = {
            "color": "#4CAF50",
            "tags": ["work"]
        }

        result = service.apply_defaults_to_days(days, defaults)

        assert result["monday"][0]["color"] == "#4CAF50"
        assert result["monday"][0]["tags"] == ["work"]

    def test_fuzzy_day_matching(self):
        """Test fuzzy matching for day names"""
        service = ScheduleImportService()

        # Should suggest Monday for Mnday
        assert service._fuzzy_match_day("mnday") == "monday"

        # Should suggest Tuesday for Tueday
        assert service._fuzzy_match_day("tueday") == "tuesday"

        # Should return None for very different strings
        assert service._fuzzy_match_day("xyz") is None
