"""
Reading position management service with DynamoDB.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from app.models.reading_position import ReadingPositionCreate, ReadingPositionUpdate
from app.services.exceptions import UnauthorizedError, JournalNotFoundError

logger = logging.getLogger(__name__)


class ReadingPositionService:
    """Service for reading position management operations."""

    def __init__(self):
        """Initialize DynamoDB client and table."""
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces')

        logger.info(f"Initializing ReadingPositionService with table: {self.table_name}, region: {aws_region}")

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
                        'BillingMode': 'PAY_PER_REQUEST'
                    }
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            table.wait_until_exists()
            return table
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceInUseException':
                return self.dynamodb.Table(self.table_name)
            raise

    def _is_space_member(self, space_id: str, user_id: str) -> bool:
        """Check if user is a member of the space."""
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )
            return 'Item' in response
        except ClientError:
            return False

    def _journal_exists(self, space_id: str, journal_id: str) -> bool:
        """Check if journal exists in the space."""
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'JOURNAL#{journal_id}'}
            )
            return 'Item' in response
        except ClientError:
            return False

    def save_position(
        self,
        user_id: str,
        journal_id: str,
        space_id: str,
        position_data: ReadingPositionCreate
    ) -> Dict[str, Any]:
        """
        Save or update a reading position.

        Args:
            user_id: User ID
            journal_id: Journal ID
            space_id: Space ID for authorization
            position_data: Reading position data

        Returns:
            Created/updated reading position

        Raises:
            UnauthorizedError: If user doesn't have access to the journal
            JournalNotFoundError: If journal doesn't exist
        """
        logger.info(f"[SAVE_POSITION] user={user_id}, journal={journal_id}, space={space_id}")

        # Validate user is space member
        if not self._is_space_member(space_id, user_id):
            raise UnauthorizedError("You must be a member of the space to save reading positions")

        # Validate journal exists
        if not self._journal_exists(space_id, journal_id):
            raise JournalNotFoundError(f"Journal {journal_id} not found in space {space_id}")

        now = datetime.now(timezone.utc).isoformat()

        # Calculate TTL (30 days from now)
        expires_at = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())

        # Create reading position item
        position_item = {
            'PK': f'USER#{user_id}',
            'SK': f'READING_POS#{journal_id}',
            'GSI1PK': f'JOURNAL#{journal_id}',
            'GSI1SK': f'USER#{user_id}',
            'user_id': user_id,
            'journal_id': journal_id,
            'space_id': space_id,
            'scroll_position': position_data.scroll_position,
            'current_section_id': position_data.current_section_id,
            'progress_percent': position_data.progress_percent,
            'words_read': position_data.words_read,
            'total_words': position_data.total_words,
            'updated_at': now,
            'expires_at': expires_at
        }

        # Check if position already exists to set created_at
        existing = self.get_position(user_id, journal_id)
        if existing:
            position_item['created_at'] = existing.get('created_at', now)
        else:
            position_item['created_at'] = now

        # Write to DynamoDB (upsert)
        self.table.put_item(Item=position_item)

        logger.info(f"[SAVE_POSITION] Position saved for user={user_id}, journal={journal_id}")

        return {
            'user_id': user_id,
            'journal_id': journal_id,
            'space_id': space_id,
            'scroll_position': position_data.scroll_position,
            'current_section_id': position_data.current_section_id,
            'progress_percent': position_data.progress_percent,
            'words_read': position_data.words_read,
            'total_words': position_data.total_words,
            'created_at': position_item['created_at'],
            'updated_at': now,
            'expires_at': expires_at
        }

    def get_position(self, user_id: str, journal_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a reading position.

        Args:
            user_id: User ID
            journal_id: Journal ID

        Returns:
            Reading position if found, None otherwise
        """
        logger.info(f"[GET_POSITION] user={user_id}, journal={journal_id}")

        try:
            response = self.table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'READING_POS#{journal_id}'
                }
            )

            if 'Item' not in response:
                logger.info(f"[GET_POSITION] Position not found")
                return None

            position = response['Item']
            logger.info(f"[GET_POSITION] Position found")

            return {
                'user_id': position['user_id'],
                'journal_id': position['journal_id'],
                'space_id': position['space_id'],
                'scroll_position': position['scroll_position'],
                'current_section_id': position.get('current_section_id'),
                'progress_percent': position['progress_percent'],
                'words_read': position['words_read'],
                'total_words': position['total_words'],
                'created_at': position['created_at'],
                'updated_at': position['updated_at']
            }
        except ClientError as e:
            logger.error(f"[GET_POSITION] Error: {e}")
            return None

    def delete_position(self, user_id: str, journal_id: str) -> bool:
        """
        Delete a reading position.

        Args:
            user_id: User ID
            journal_id: Journal ID

        Returns:
            True if deleted, False if not found or error
        """
        logger.info(f"[DELETE_POSITION] user={user_id}, journal={journal_id}")

        try:
            # Check if position exists
            response = self.table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'READING_POS#{journal_id}'
                }
            )

            if 'Item' not in response:
                logger.info(f"[DELETE_POSITION] Position not found")
                return False

            # Delete the position
            self.table.delete_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'READING_POS#{journal_id}'
                }
            )

            logger.info(f"[DELETE_POSITION] Position deleted")
            return True

        except ClientError as e:
            logger.error(f"[DELETE_POSITION] Error: {e}")
            return False

    def get_user_positions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get user's recent reading positions.

        Args:
            user_id: User ID
            limit: Maximum number of positions to return

        Returns:
            List of reading positions sorted by updated_at (most recent first)
        """
        logger.info(f"[GET_USER_POSITIONS] user={user_id}, limit={limit}")

        try:
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') & Key('SK').begins_with('READING_POS#')
            )

            positions = response.get('Items', [])

            # Sort by updated_at descending (most recent first)
            positions.sort(key=lambda x: x.get('updated_at', ''), reverse=True)

            # Apply limit
            positions = positions[:limit]

            # Convert to response format
            result = []
            for pos in positions:
                result.append({
                    'user_id': pos['user_id'],
                    'journal_id': pos['journal_id'],
                    'space_id': pos['space_id'],
                    'scroll_position': pos['scroll_position'],
                    'current_section_id': pos.get('current_section_id'),
                    'progress_percent': pos['progress_percent'],
                    'words_read': pos['words_read'],
                    'total_words': pos['total_words'],
                    'created_at': pos['created_at'],
                    'updated_at': pos['updated_at']
                })

            logger.info(f"[GET_USER_POSITIONS] Found {len(result)} positions")
            return result

        except ClientError as e:
            logger.error(f"[GET_USER_POSITIONS] Error: {e}")
            return []

    def cleanup_old_positions(self, days: int = 30) -> int:
        """
        Clean up reading positions older than specified days.

        Args:
            days: Number of days threshold

        Returns:
            Number of positions deleted
        """
        logger.info(f"[CLEANUP_OLD_POSITIONS] days={days}")

        try:
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

            # Scan for old positions
            response = self.table.scan(
                FilterExpression='begins_with(SK, :sk_prefix) AND updated_at < :cutoff',
                ExpressionAttributeValues={
                    ':sk_prefix': 'READING_POS#',
                    ':cutoff': cutoff_date
                }
            )

            old_positions = response.get('Items', [])
            deleted_count = 0

            for position in old_positions:
                try:
                    self.table.delete_item(
                        Key={'PK': position['PK'], 'SK': position['SK']}
                    )
                    deleted_count += 1
                except ClientError as e:
                    logger.warning(f"[CLEANUP_OLD_POSITIONS] Failed to delete {position['PK']}#{position['SK']}: {e}")

            logger.info(f"[CLEANUP_OLD_POSITIONS] Deleted {deleted_count} positions")
            return deleted_count

        except ClientError as e:
            logger.error(f"[CLEANUP_OLD_POSITIONS] Error: {e}")
            return 0
