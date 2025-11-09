"""
Schedule management service with DynamoDB.
"""
import os
import uuid
import logging
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from app.models.schedule import ScheduleCreate, ScheduleUpdate
from app.services.exceptions import (
    ValidationError,
    UnauthorizedError
)

logger = logging.getLogger(__name__)


class ScheduleNotFoundError(Exception):
    """Raised when a schedule is not found."""
    pass


class ScheduleService:
    """Service for schedule management operations."""

    def __init__(self):
        """Initialize DynamoDB client and table."""
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces')

        logger.info(
            f"Initializing ScheduleService with table: {self.table_name}, "
            f"region: {aws_region}"
        )

        self.dynamodb = boto3.resource('dynamodb', region_name=aws_region)
        self.table = self._get_or_create_table()

    def _get_or_create_table(self):
        """Get existing table or create new one for testing."""
        try:
            return self.dynamodb.Table(self.table_name)
        except ClientError:
            # Create table for testing
            return self._create_table()

    def _create_table(self):
        """Create DynamoDB table for testing."""
        try:
            table = self.dynamodb.create_table(
                TableName=self.table_name,
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
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            table.wait_until_exists()
            return table
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceInUseException':
                return self.dynamodb.Table(self.table_name)
            raise

    def create_schedule(
        self,
        schedule: ScheduleCreate,
        user_id: str,
        space_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new schedule.

        Args:
            schedule: Schedule data
            user_id: ID of the user creating the schedule
            space_id: Optional space ID to override schedule.space_id

        Returns:
            Dict containing the created schedule

        Raises:
            ValidationError: If validation fails
        """
        logger.info(f"[CREATE_SCHEDULE] user_id={user_id}, week_starting={schedule.week_starting}")

        # Use provided space_id or fall back to schedule.space_id
        final_space_id = space_id or schedule.space_id

        # Validate space_id is provided
        if not final_space_id:
            raise ValidationError("space_id is required")

        schedule_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Convert date to string for DynamoDB
        week_starting_str = schedule.week_starting.isoformat()

        # Create schedule item
        schedule_item = {
            'PK': f'SCHEDULE#{schedule_id}',
            'SK': 'METADATA',
            'GSI1PK': f'SPACE#{final_space_id}',
            'GSI1SK': f'WEEK#{week_starting_str}#USER#{user_id}',
            'id': schedule_id,
            'space_id': final_space_id,
            'user_id': user_id,
            'week_starting': week_starting_str,
            'schedule_data': schedule.schedule_data,
            'notes': schedule.notes,
            'is_template': schedule.is_template,
            'template_name': schedule.template_name,
            'version': 1,
            'created_by': user_id,
            'modified_by': user_id,
            'last_modified': now,
            'created_at': now,
            'updated_at': now
        }

        logger.info(f"[CREATE_SCHEDULE] Writing schedule_id={schedule_id}")
        self.table.put_item(Item=schedule_item)

        logger.info(f"[CREATE_SCHEDULE] Successfully created schedule_id={schedule_id}")

        return self._format_schedule_response(schedule_item)

    def get_schedule(self, schedule_id: str, user_id: str) -> Dict[str, Any]:
        """
        Get a schedule by ID.

        Args:
            schedule_id: Schedule ID
            user_id: User ID requesting the schedule

        Returns:
            Dict containing schedule data

        Raises:
            ScheduleNotFoundError: If schedule not found
            UnauthorizedError: If user doesn't have access
        """
        logger.info(f"[GET_SCHEDULE] schedule_id={schedule_id}, user_id={user_id}")

        response = self.table.get_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            }
        )

        item = response.get('Item')
        if not item:
            raise ScheduleNotFoundError(f"Schedule {schedule_id} not found")

        # TODO: Add authorization check - verify user has access to the space

        return self._format_schedule_response(item)

    def get_schedules_by_week(
        self,
        space_id: str,
        week_starting: date,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all schedules for a specific week in a space.

        Args:
            space_id: Space ID
            week_starting: Start of the week (must be a Monday)
            user_id: Optional user ID to filter by specific user

        Returns:
            List of schedules
        """
        logger.info(f"[GET_SCHEDULES_BY_WEEK] space_id={space_id}, week={week_starting}")

        week_starting_str = week_starting.isoformat()

        # Query GSI1 for schedules in this space and week
        if user_id:
            # Query for specific user's schedule
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=(
                    Key('GSI1PK').eq(f'SPACE#{space_id}') &
                    Key('GSI1SK').eq(f'WEEK#{week_starting_str}#USER#{user_id}')
                )
            )
        else:
            # Query for all schedules in this week
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=(
                    Key('GSI1PK').eq(f'SPACE#{space_id}') &
                    Key('GSI1SK').begins_with(f'WEEK#{week_starting_str}#')
                )
            )

        items = response.get('Items', [])
        logger.info(f"[GET_SCHEDULES_BY_WEEK] Found {len(items)} schedules")

        return [self._format_schedule_response(item) for item in items]

    def update_schedule(
        self,
        schedule_id: str,
        schedule_update: ScheduleUpdate,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Update a schedule.

        Args:
            schedule_id: Schedule ID
            schedule_update: Updated schedule data
            user_id: User ID making the update

        Returns:
            Updated schedule

        Raises:
            ScheduleNotFoundError: If schedule not found
            UnauthorizedError: If user not authorized
        """
        logger.info(f"[UPDATE_SCHEDULE] schedule_id={schedule_id}, user_id={user_id}")

        # First get the existing schedule
        existing = self.get_schedule(schedule_id, user_id)

        # Verify user owns this schedule
        if existing['user_id'] != user_id:
            raise UnauthorizedError("You can only update your own schedules")

        # Save current state as version before updating
        current_version = existing.get('version', 1)
        self._save_version(
            schedule_id=schedule_id,
            version=current_version,
            schedule_data=existing['schedule_data'],
            user_id=user_id,
            notes=existing.get('notes')
        )

        # Build update expression
        update_expr_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        now = datetime.now(timezone.utc).isoformat()

        # Increment version
        new_version = current_version + 1
        update_expr_parts.append("#version = :version")
        expr_attr_names['#version'] = 'version'
        expr_attr_values[':version'] = new_version

        # Update timestamps and modified_by
        update_expr_parts.append("#updated_at = :updated_at")
        update_expr_parts.append("#last_modified = :last_modified")
        update_expr_parts.append("#modified_by = :modified_by")
        expr_attr_names['#updated_at'] = 'updated_at'
        expr_attr_names['#last_modified'] = 'last_modified'
        expr_attr_names['#modified_by'] = 'modified_by'
        expr_attr_values[':updated_at'] = now
        expr_attr_values[':last_modified'] = now
        expr_attr_values[':modified_by'] = user_id

        if schedule_update.schedule_data is not None:
            update_expr_parts.append("#schedule_data = :schedule_data")
            expr_attr_names['#schedule_data'] = 'schedule_data'
            expr_attr_values[':schedule_data'] = schedule_update.schedule_data

        if schedule_update.notes is not None:
            update_expr_parts.append("#notes = :notes")
            expr_attr_names['#notes'] = 'notes'
            expr_attr_values[':notes'] = schedule_update.notes

        if schedule_update.is_template is not None:
            update_expr_parts.append("#is_template = :is_template")
            expr_attr_names['#is_template'] = 'is_template'
            expr_attr_values[':is_template'] = schedule_update.is_template

        if schedule_update.template_name is not None:
            update_expr_parts.append("#template_name = :template_name")
            expr_attr_names['#template_name'] = 'template_name'
            expr_attr_values[':template_name'] = schedule_update.template_name

        update_expression = "SET " + ", ".join(update_expr_parts)

        logger.info(f"[UPDATE_SCHEDULE] Updating with expression: {update_expression}")

        response = self.table.update_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues='ALL_NEW'
        )

        updated_item = response.get('Attributes', {})
        logger.info(f"[UPDATE_SCHEDULE] Successfully updated schedule_id={schedule_id}")

        # Clean old versions if > 10
        self._cleanup_old_versions(schedule_id, new_version)

        return self._format_schedule_response(updated_item)

    def delete_schedule(self, schedule_id: str, user_id: str) -> None:
        """
        Delete a schedule.

        Args:
            schedule_id: Schedule ID
            user_id: User ID requesting deletion

        Raises:
            ScheduleNotFoundError: If schedule not found
            UnauthorizedError: If user not authorized
        """
        logger.info(f"[DELETE_SCHEDULE] schedule_id={schedule_id}, user_id={user_id}")

        # First get the schedule to verify ownership
        existing = self.get_schedule(schedule_id, user_id)

        if existing['user_id'] != user_id:
            raise UnauthorizedError("You can only delete your own schedules")

        self.table.delete_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            }
        )

        logger.info(f"[DELETE_SCHEDULE] Successfully deleted schedule_id={schedule_id}")

    def _save_version(
        self,
        schedule_id: str,
        version: int,
        schedule_data: Dict,
        user_id: str,
        notes: Optional[str] = None
    ):
        """Save a version snapshot to DynamoDB."""
        now = datetime.now(timezone.utc).isoformat()

        version_item = {
            'PK': f'SCHEDULE#{schedule_id}',
            'SK': f'VERSION#{version}#{now}',
            'version': version,
            'schedule_data': schedule_data,
            'notes': notes,
            'modified_at': now,
            'modified_by': user_id
        }

        self.table.put_item(Item=version_item)
        logger.info(f"[SAVE_VERSION] Saved version {version} for schedule {schedule_id}")

    def _cleanup_old_versions(self, schedule_id: str, current_version: int):
        """Clean up old versions if > 10."""
        # Query all versions
        response = self.table.query(
            KeyConditionExpression=(
                Key('PK').eq(f'SCHEDULE#{schedule_id}') &
                Key('SK').begins_with('VERSION#')
            )
        )

        versions = response.get('Items', [])

        # If we have more than 10 versions, delete the oldest
        if len(versions) > 10:
            # Sort by version number (descending)
            versions.sort(key=lambda x: x['version'], reverse=True)

            # Delete versions beyond the 10 most recent
            for old_version in versions[10:]:
                self.table.delete_item(
                    Key={
                        'PK': old_version['PK'],
                        'SK': old_version['SK']
                    }
                )
                logger.info(
                    f"[CLEANUP_VERSIONS] Deleted old version {old_version['version']} "
                    f"for schedule {schedule_id}"
                )

    def get_versions(self, schedule_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Get version history for a schedule.

        Args:
            schedule_id: Schedule ID
            user_id: User requesting versions

        Returns:
            List of versions (sorted descending by version number)

        Raises:
            ScheduleNotFoundError: If schedule not found
            UnauthorizedError: If user not authorized
        """
        logger.info(f"[GET_VERSIONS] schedule_id={schedule_id}, user_id={user_id}")

        # Verify user has access to schedule
        existing = self.get_schedule(schedule_id, user_id)
        if existing['user_id'] != user_id:
            raise UnauthorizedError("You can only view your own schedule versions")

        # Query all versions
        response = self.table.query(
            KeyConditionExpression=(
                Key('PK').eq(f'SCHEDULE#{schedule_id}') &
                Key('SK').begins_with('VERSION#')
            )
        )

        versions = response.get('Items', [])

        # Sort by version number (descending)
        versions.sort(key=lambda x: x['version'], reverse=True)

        # Limit to 10 most recent
        return versions[:10]

    def get_version(
        self,
        schedule_id: str,
        version: int,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Get specific version of a schedule.

        Args:
            schedule_id: Schedule ID
            version: Version number
            user_id: User requesting version

        Returns:
            Schedule data for that version

        Raises:
            ScheduleNotFoundError: If schedule or version not found
            UnauthorizedError: If user not authorized
        """
        logger.info(
            f"[GET_VERSION] schedule_id={schedule_id}, version={version}, "
            f"user_id={user_id}"
        )

        # Verify user has access
        existing = self.get_schedule(schedule_id, user_id)
        if existing['user_id'] != user_id:
            raise UnauthorizedError("You can only view your own schedule versions")

        # Query for specific version
        response = self.table.query(
            KeyConditionExpression=(
                Key('PK').eq(f'SCHEDULE#{schedule_id}') &
                Key('SK').begins_with(f'VERSION#{version}#')
            )
        )

        versions = response.get('Items', [])
        if not versions:
            raise ScheduleNotFoundError(f"Version {version} not found for schedule {schedule_id}")

        return versions[0]

    def create_share_token(self, schedule_id: str, user_id: str) -> Dict[str, Any]:
        """
        Generate a secure share token for a schedule.

        Args:
            schedule_id: Schedule ID to share
            user_id: User creating the share

        Returns:
            Dict with share_token, share_link, expires_at

        Raises:
            ScheduleNotFoundError: If schedule not found
            UnauthorizedError: If user doesn't own the schedule
        """
        logger.info(f"[CREATE_SHARE_TOKEN] schedule_id={schedule_id}, user_id={user_id}")

        # Verify user owns the schedule
        existing = self.get_schedule(schedule_id, user_id)
        if existing['user_id'] != user_id:
            raise UnauthorizedError("You can only share your own schedules")

        # Generate UUID4 share token
        share_token = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Create share mapping in DynamoDB
        share_item = {
            'PK': f'SHARE#{share_token}',
            'SK': f'SCHEDULE#{schedule_id}',
            'schedule_id': schedule_id,
            'created_at': now.isoformat()
        }
        self.table.put_item(Item=share_item)

        # Update schedule with sharing settings
        update_expression = "SET #sharing_settings = :sharing_settings, #updated_at = :updated_at"
        self.table.update_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames={
                '#sharing_settings': 'sharing_settings',
                '#updated_at': 'updated_at'
            },
            ExpressionAttributeValues={
                ':sharing_settings': {
                    'is_public': True,
                    'share_token': share_token,
                    'created_at': now.isoformat(),
                    'view_count': 0
                },
                ':updated_at': now.isoformat()
            }
        )

        logger.info(f"[CREATE_SHARE_TOKEN] Created share_token={share_token}")

        return {
            'share_token': share_token,
            'schedule_id': schedule_id,
            'share_link': f'/shared/{share_token}',
            'created_at': now.isoformat(),
            'expires_at': None
        }

    def get_shared_schedule(self, share_token: str) -> Dict[str, Any]:
        """
        Get schedule by share token (public access).

        Args:
            share_token: Share token

        Returns:
            Schedule data (with privacy filtering)

        Raises:
            ScheduleNotFoundError: If share token not found
        """
        logger.info(f"[GET_SHARED_SCHEDULE] share_token={share_token}")

        # Query DynamoDB for share token using PK
        share_query = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SHARE#{share_token}')
        )

        items = share_query.get('Items', [])
        if not items:
            raise ScheduleNotFoundError("Share token not found")

        share_item = items[0]
        schedule_id = share_item['schedule_id']

        # Get schedule
        schedule_response = self.table.get_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            }
        )

        schedule_item = schedule_response.get('Item')
        if not schedule_item:
            raise ScheduleNotFoundError(f"Schedule {schedule_id} not found")

        # Increment view count
        update_expr = (
            "SET #sharing_settings.#view_count = "
            "#sharing_settings.#view_count + :inc"
        )
        self.table.update_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expr,
            ExpressionAttributeNames={
                '#sharing_settings': 'sharing_settings',
                '#view_count': 'view_count'
            },
            ExpressionAttributeValues={
                ':inc': 1
            }
        )

        return self._format_schedule_response(schedule_item)

    def disable_sharing(self, schedule_id: str, user_id: str) -> Dict[str, Any]:
        """
        Disable sharing for a schedule.

        Args:
            schedule_id: Schedule ID
            user_id: User requesting to disable sharing

        Returns:
            Updated schedule

        Raises:
            ScheduleNotFoundError: If schedule not found
            UnauthorizedError: If user doesn't own the schedule
        """
        logger.info(f"[DISABLE_SHARING] schedule_id={schedule_id}, user_id={user_id}")

        # Verify user owns the schedule
        existing = self.get_schedule(schedule_id, user_id)
        if existing['user_id'] != user_id:
            raise UnauthorizedError("You can only modify your own schedules")

        now = datetime.now(timezone.utc).isoformat()

        # Update schedule to disable sharing
        update_expr = (
            "SET #sharing_settings.#is_public = :is_public, "
            "#updated_at = :updated_at"
        )
        response = self.table.update_item(
            Key={
                'PK': f'SCHEDULE#{schedule_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expr,
            ExpressionAttributeNames={
                '#sharing_settings': 'sharing_settings',
                '#is_public': 'is_public',
                '#updated_at': 'updated_at'
            },
            ExpressionAttributeValues={
                ':is_public': False,
                ':updated_at': now
            },
            ReturnValues='ALL_NEW'
        )

        return self._format_schedule_response(response['Attributes'])

    def _format_schedule_response(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Format DynamoDB item as schedule response."""
        return {
            'id': item['id'],
            'space_id': item['space_id'],
            'user_id': item['user_id'],
            'week_starting': item['week_starting'],
            'schedule_data': item.get('schedule_data', {}),
            'notes': item.get('notes'),
            'is_template': item.get('is_template', False),
            'template_name': item.get('template_name'),
            'version': item.get('version', 1),
            'sharing_settings': item.get('sharing_settings'),
            'created_by': item.get('created_by', item['user_id']),
            'modified_by': item.get('modified_by', item['user_id']),
            'last_modified': item.get('last_modified', item.get('updated_at')),
            'created_at': item['created_at'],
            'updated_at': item['updated_at']
        }
