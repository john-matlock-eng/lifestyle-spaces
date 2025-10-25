"""
Activity tracking service for recording and querying space activities.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from boto3.dynamodb.conditions import Key
import logging

from app.core.database import get_dynamodb_table
from app.models.activity import ActivityModel, ActivityType, ActivityResponse

logger = logging.getLogger(__name__)


class ActivityService:
    """Service for managing space activities."""

    def __init__(self):
        self.table = get_dynamodb_table()

    def _get_user_display_name(self, user_id: str) -> str:
        """
        Get user's display name from profile.

        Args:
            user_id: User ID to look up

        Returns:
            User's display name or fallback
        """
        try:
            response = self.table.get_item(
                Key={'PK': f'USER#{user_id}', 'SK': 'PROFILE'}
            )
            if 'Item' in response:
                item = response['Item']
                return (
                    item.get('preferred_name') or
                    item.get('display_name') or
                    item.get('full_name') or
                    item.get('username') or
                    f'User {user_id[:8]}'
                )
        except Exception as e:
            logger.warning(f"Failed to get user display name for {user_id}: {e}")

        return f'User {user_id[:8]}'

    def record_activity(
        self,
        space_id: str,
        activity_type: ActivityType,
        user_id: str,
        user_name: str,
        metadata: Dict[str, Any]
    ) -> ActivityModel:
        """
        Record a new activity in the space.

        Args:
            space_id: The space where the activity occurred
            activity_type: Type of activity
            user_id: User who performed the action
            user_name: Display name of the user
            metadata: Activity-specific metadata

        Returns:
            The created activity model
        """
        activity_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'

        activity = ActivityModel(
            activity_id=activity_id,
            space_id=space_id,
            activity_type=activity_type,
            user_id=user_id,
            user_name=user_name,
            timestamp=timestamp,
            metadata=metadata
        )

        # Store in DynamoDB
        # PK=SPACE#{space_id}, SK=ACTIVITY#{timestamp}#{activity_id}
        item = {
            'PK': f'SPACE#{space_id}',
            'SK': f'ACTIVITY#{timestamp}#{activity_id}',
            'EntityType': 'Activity',
            'ActivityId': activity_id,
            'SpaceId': space_id,
            'ActivityType': activity_type.value,
            'UserId': user_id,
            'UserName': user_name,
            'Timestamp': timestamp,
            'Metadata': metadata,
            'TTL': self._calculate_ttl(timestamp)  # Optional: auto-delete old activities
        }

        self.table.put_item(Item=item)
        return activity

    def get_space_activities(
        self,
        space_id: str,
        limit: int = 50,
        next_token: Optional[str] = None
    ) -> tuple[List[ActivityResponse], Optional[str]]:
        """
        Get recent activities for a space.

        Args:
            space_id: The space ID to get activities for
            limit: Maximum number of activities to return
            next_token: Pagination token from previous request

        Returns:
            Tuple of (list of activities, next_token for pagination)
        """
        query_params = {
            'KeyConditionExpression': Key('PK').eq(f'SPACE#{space_id}') &
                                     Key('SK').begins_with('ACTIVITY#'),
            'ScanIndexForward': False,  # Sort descending (newest first)
            'Limit': limit
        }

        if next_token:
            query_params['ExclusiveStartKey'] = self._decode_token(next_token)

        response = self.table.query(**query_params)
        items = response.get('Items', [])

        activities = []
        for item in items:
            activities.append(ActivityResponse(
                activity_id=item['ActivityId'],
                space_id=item['SpaceId'],
                activity_type=item['ActivityType'],
                user_id=item['UserId'],
                user_name=item['UserName'],
                timestamp=item['Timestamp'],
                metadata=item.get('Metadata', {})
            ))

        # Handle pagination
        last_evaluated_key = response.get('LastEvaluatedKey')
        new_next_token = self._encode_token(last_evaluated_key) if last_evaluated_key else None

        return activities, new_next_token

    def _calculate_ttl(self, timestamp: str, days: int = 90) -> int:
        """
        Calculate TTL for activity (auto-delete after 90 days).

        Args:
            timestamp: ISO 8601 timestamp
            days: Number of days to keep the activity

        Returns:
            Unix timestamp for TTL
        """
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        ttl = int(dt.timestamp()) + (days * 24 * 60 * 60)
        return ttl

    def _encode_token(self, last_key: Optional[Dict[str, Any]]) -> Optional[str]:
        """Encode DynamoDB LastEvaluatedKey as a pagination token."""
        if not last_key:
            return None
        import base64
        import json
        # Encode the full key as base64 JSON
        token_json = json.dumps(last_key)
        return base64.b64encode(token_json.encode()).decode()

    def _decode_token(self, token: str) -> Dict[str, str]:
        """Decode pagination token back to DynamoDB key."""
        import base64
        import json
        try:
            decoded = base64.b64decode(token.encode()).decode()
            return json.loads(decoded)
        except Exception:
            # Return empty dict if token is invalid
            return {}


# Singleton instance
_activity_service: Optional[ActivityService] = None


def get_activity_service() -> ActivityService:
    """Get or create the activity service singleton."""
    global _activity_service
    if _activity_service is None:
        _activity_service = ActivityService()
    return _activity_service
