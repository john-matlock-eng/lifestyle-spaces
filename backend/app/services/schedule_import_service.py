"""
Schedule Import Service

Handles importing schedules from JSON format with intelligent parsing and validation.
"""

import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from pydantic import ValidationError as PydanticValidationError


class ValidationError:
    """Validation error with field and message"""
    def __init__(self, field: str, message: str, line: Optional[int] = None):
        self.field = field
        self.message = message
        self.line = line

    def to_dict(self) -> dict:
        return {
            "field": self.field,
            "message": self.message,
            "line": self.line
        }


class Conflict:
    """Time block conflict"""
    def __init__(self, day: str, block1: dict, block2: dict, message: str):
        self.day = day
        self.block1 = block1
        self.block2 = block2
        self.message = message

    def to_dict(self) -> dict:
        return {
            "day": self.day,
            "block1": self.block1,
            "block2": self.block2,
            "message": self.message
        }


class ScheduleImportService:
    """Service for importing schedules from JSON"""

    # Activity type keywords mapping
    ACTIVITY_TYPE_KEYWORDS = {
        "meeting": ["meeting", "standup", "1:1", "sync", "call", "demo", "presentation"],
        "focus": ["focus", "deep work", "coding", "development", "programming", "study"],
        "personal": ["gym", "workout", "exercise", "run", "yoga", "meditation", "lunch", "break"],
        "social": ["coffee", "dinner", "hangout", "party", "gathering"],
        "work": ["work", "project", "task", "review", "planning"]
    }

    # Emoji mapping by activity keywords (ordered by priority - more specific first)
    EMOJI_KEYWORDS = {
        "💻": ["coding", "programming", "development"],
        "📚": ["study", "reading", "research"],
        "💪": ["gym", "workout", "exercise", "run", "fitness"],
        "☕": ["coffee", "break", "rest"],
        "🍽️": ["lunch", "dinner", "meal", "food"],
        "📞": ["meeting", "call", "sync", "standup"],
        "🧘": ["meditation", "yoga", "mindfulness"],
        "🎉": ["party", "celebration", "event"],
        "✏️": ["writing", "planning", "notes"],
        "🎯": ["focus", "deep work", "learning"],  # More general, check last
    }

    VALID_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    def parse_import_json(self, json_str: str) -> Tuple[Optional[dict], List[ValidationError]]:
        """
        Parse and validate import JSON string

        Returns:
            Tuple of (parsed_schedule, errors)
        """
        errors = []

        # Parse JSON
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            errors.append(ValidationError("json", f"Invalid JSON syntax: {str(e)}", e.lineno))
            return None, errors

        # Validate schema
        schema_errors = self.validate_import_schema(data)
        if schema_errors:
            return None, schema_errors

        # Build schedule template
        try:
            schedule = self._build_schedule_from_data(data)
            return schedule, []
        except Exception as e:
            errors.append(ValidationError("schedule", f"Failed to parse schedule: {str(e)}"))
            return None, errors

    def validate_import_schema(self, data: dict) -> List[ValidationError]:
        """Validate the import JSON schema"""
        errors = []

        if not isinstance(data, dict):
            errors.append(ValidationError("root", "Import data must be a JSON object"))
            return errors

        # Check for required 'days' field
        if "days" not in data:
            errors.append(ValidationError("days", "Missing 'days' field"))
            return errors

        if not isinstance(data["days"], dict):
            errors.append(ValidationError("days", "'days' must be an object"))
            return errors

        # Validate each day
        for day_name, day_data in data["days"].items():
            day_lower = day_name.lower()

            # Check valid day name
            if day_lower not in self.VALID_DAYS:
                # Suggest similar day names
                suggestion = self._fuzzy_match_day(day_lower)
                msg = f"Invalid day name: '{day_name}'"
                if suggestion:
                    msg += f" → Did you mean '{suggestion.title()}'?"
                errors.append(ValidationError(f"days.{day_name}", msg))
                continue

            # Validate day structure
            if not isinstance(day_data, list):
                errors.append(ValidationError(
                    f"days.{day_name}",
                    f"Day '{day_name}' must be an array of time blocks"
                ))
                continue

            # Validate each time block
            for i, block in enumerate(day_data):
                block_errors = self._validate_time_block(block, day_name, i)
                errors.extend(block_errors)

        return errors

    def _validate_time_block(self, block: dict, day: str, index: int) -> List[ValidationError]:
        """Validate a single time block"""
        errors = []
        prefix = f"days.{day}[{index}]"

        if not isinstance(block, dict):
            errors.append(ValidationError(prefix, "Time block must be an object"))
            return errors

        # Required fields
        if "time" not in block:
            errors.append(ValidationError(f"{prefix}.time", "Missing 'time' field"))
        else:
            # Validate time format
            time_valid, time_error = self._validate_time_format(block["time"])
            if not time_valid:
                errors.append(ValidationError(
                    f"{prefix}.time",
                    f"Invalid time format: '{block['time']}' → {time_error}"
                ))

        if "activity" not in block:
            errors.append(ValidationError(f"{prefix}.activity", "Missing 'activity' field"))
        elif not isinstance(block["activity"], str) or not block["activity"].strip():
            errors.append(ValidationError(f"{prefix}.activity", "Activity must be a non-empty string"))

        return errors

    def _validate_time_format(self, time_str: str) -> Tuple[bool, Optional[str]]:
        """Validate time format and suggest corrections"""
        # Try to normalize the time
        try:
            start, end = self.normalize_time_format(time_str)
            return True, None
        except ValueError as e:
            return False, str(e)

    def normalize_time_format(self, time_str: str) -> Tuple[str, str]:
        """
        Normalize time format to HH:MM-HH:MM

        Supports formats like:
        - "9am-10am"
        - "9:00-10:00"
        - "09:00-10:00"
        - "9:00 AM - 10:00 AM"
        - "9-10"

        Returns:
            Tuple of (start_time, end_time) in HH:MM format
        """
        time_str = time_str.strip()

        # Split by dash or " to "
        parts = re.split(r'\s*[-–—]\s*|\s+to\s+', time_str, maxsplit=1)
        if len(parts) != 2:
            raise ValueError("Time must be in format 'start-end' (e.g., '9:00-10:00')")

        start_str, end_str = parts

        # Parse each part
        start_time = self._parse_single_time(start_str.strip())
        end_time = self._parse_single_time(end_str.strip())

        return start_time, end_time

    def _parse_single_time(self, time_str: str) -> str:
        """Parse a single time string to HH:MM format"""
        time_str = time_str.strip().lower()

        # Remove spaces
        time_str = time_str.replace(" ", "")

        # Check for AM/PM
        is_pm = "pm" in time_str
        is_am = "am" in time_str
        time_str = time_str.replace("am", "").replace("pm", "")

        # Parse hour and minute
        if ":" in time_str:
            parts = time_str.split(":")
            if len(parts) != 2:
                raise ValueError(f"Invalid time format: {time_str}")
            hour_str, min_str = parts
        else:
            # Just hour, no minutes
            hour_str = time_str
            min_str = "00"

        try:
            hour = int(hour_str)
            minute = int(min_str)
        except ValueError:
            raise ValueError(f"Invalid time format: {time_str}")

        # Apply AM/PM
        if is_pm and hour < 12:
            hour += 12
        elif is_am and hour == 12:
            hour = 0

        # Validate
        if hour < 0 or hour > 23:
            raise ValueError(f"Hour must be 0-23: {hour}")
        if minute < 0 or minute > 59:
            raise ValueError(f"Minute must be 0-59: {minute}")

        return f"{hour:02d}:{minute:02d}"

    def parse_relative_date(self, date_str: str) -> str:
        """
        Parse relative date strings to YYYY-MM-DD format

        Supports:
        - "next monday"
        - "tomorrow"
        - "today"
        - "2024-11-11"
        """
        date_str = date_str.strip().lower()

        # Already in YYYY-MM-DD format
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str

        today = datetime.now().date()

        # Handle "today"
        if date_str == "today":
            return today.isoformat()

        # Handle "tomorrow"
        if date_str == "tomorrow":
            tomorrow = today + timedelta(days=1)
            return tomorrow.isoformat()

        # Handle "next [day]"
        next_match = re.match(r'next\s+(\w+)', date_str)
        if next_match:
            day_name = next_match.group(1)
            return self._get_next_day_of_week(day_name, today)

        # Handle just day name (this week or next week)
        for i, day in enumerate(self.VALID_DAYS):
            if day_name.startswith(day):
                return self._get_next_day_of_week(day, today)

        raise ValueError(f"Unrecognized date format: {date_str}")

    def _get_next_day_of_week(self, day_name: str, from_date: datetime.date) -> str:
        """Get the next occurrence of a day of the week"""
        day_name = day_name.lower()

        # Find matching day
        target_day_idx = None
        for i, day in enumerate(self.VALID_DAYS):
            if day.startswith(day_name):
                target_day_idx = i
                break

        if target_day_idx is None:
            raise ValueError(f"Unknown day name: {day_name}")

        # Calculate days until target day
        current_day_idx = from_date.weekday()  # 0 = Monday
        days_ahead = target_day_idx - current_day_idx

        # If target day is today or earlier in the week, go to next week
        if days_ahead <= 0:
            days_ahead += 7

        target_date = from_date + timedelta(days=days_ahead)
        return target_date.isoformat()

    def infer_emoji_from_activity(self, activity: str) -> Optional[str]:
        """Infer emoji based on activity keywords"""
        activity_lower = activity.lower()

        for emoji, keywords in self.EMOJI_KEYWORDS.items():
            for keyword in keywords:
                if keyword in activity_lower:
                    return emoji

        return None

    def infer_activity_type(self, activity: str) -> str:
        """Infer activity type based on keywords"""
        activity_lower = activity.lower()

        for activity_type, keywords in self.ACTIVITY_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in activity_lower:
                    return activity_type

        return "other"

    def apply_defaults_to_days(self, days: dict, defaults: dict) -> dict:
        """Apply default values to all days"""
        result = {}

        for day, blocks in days.items():
            result[day] = []
            for block in blocks:
                # Merge with defaults
                merged_block = {**defaults, **block}
                result[day].append(merged_block)

        return result

    def detect_conflicts(self, day: str, time_blocks: List[dict]) -> List[Conflict]:
        """Detect overlapping time blocks"""
        conflicts = []

        # Sort blocks by start time
        sorted_blocks = sorted(time_blocks, key=lambda b: b.get("startTime", ""))

        # Check each pair of consecutive blocks
        for i in range(len(sorted_blocks) - 1):
            block1 = sorted_blocks[i]
            block2 = sorted_blocks[i + 1]

            start1 = block1.get("startTime", "")
            end1 = block1.get("endTime", "")
            start2 = block2.get("startTime", "")

            # Check if block1 overlaps with block2
            if end1 > start2:
                message = f"Overlapping blocks: {start1}-{end1} conflicts with {start2}-{block2.get('endTime', '')}"
                conflicts.append(Conflict(day, block1, block2, message))

        return conflicts

    def _build_schedule_from_data(self, data: dict) -> dict:
        """Build schedule template from validated data"""
        schedule_data = {}
        defaults = data.get("defaults", {})
        all_conflicts = []

        # Process each day
        for day_name, day_blocks in data["days"].items():
            day_lower = day_name.lower()
            processed_blocks = []

            for block in day_blocks:
                # Parse time
                time_str = block["time"]
                start_time, end_time = self.normalize_time_format(time_str)

                # Build time block
                activity = block["activity"]
                processed_block = {
                    "startTime": start_time,
                    "endTime": end_time,
                    "activity": activity,
                    "activityType": block.get("type") or self.infer_activity_type(activity),
                    "description": block.get("description", "")
                }

                # Infer emoji if not provided
                if "emoji" in block:
                    processed_block["emoji"] = block["emoji"]
                else:
                    inferred_emoji = self.infer_emoji_from_activity(activity)
                    if inferred_emoji:
                        processed_block["emoji"] = inferred_emoji

                # Apply defaults
                for key, value in defaults.items():
                    if key not in processed_block:
                        processed_block[key] = value

                processed_blocks.append(processed_block)

            # Detect conflicts
            conflicts = self.detect_conflicts(day_lower, processed_blocks)
            all_conflicts.extend(conflicts)

            # Store day data
            schedule_data[day_lower] = processed_blocks

        # Build final schedule object
        result = {
            "scheduleData": schedule_data,
            "conflicts": [c.to_dict() for c in all_conflicts],
            "metadata": {
                "name": data.get("name", "Imported Schedule"),
                "description": data.get("description", ""),
                "importedAt": datetime.now().isoformat()
            }
        }

        return result

    def _fuzzy_match_day(self, input_day: str) -> Optional[str]:
        """Find closest matching day name"""
        # Simple fuzzy matching based on edit distance
        best_match = None
        best_distance = float('inf')

        for valid_day in self.VALID_DAYS:
            distance = self._levenshtein_distance(input_day, valid_day)
            if distance < best_distance and distance <= 2:  # Max 2 edits
                best_distance = distance
                best_match = valid_day

        return best_match

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]
