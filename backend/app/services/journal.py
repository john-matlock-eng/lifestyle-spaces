"""
Journal management service with DynamoDB.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from app.models.journal import JournalCreate, JournalUpdate
from app.services.exceptions import (
    SpaceNotFoundError,
    UnauthorizedError,
    ValidationError,
    JournalNotFoundError
)

logger = logging.getLogger(__name__)


class JournalService:
    """Service for journal management operations."""

    def __init__(self):
        """Initialize DynamoDB client and table."""
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces')

        logger.info(f"Initializing JournalService with table: {self.table_name}, region: {aws_region}")

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

    def _calculate_word_count(self, content: str) -> int:
        """Calculate word count from content."""
        if not content:
            return 0
        # Simple word count by splitting on whitespace
        return len(content.split())

    def _is_space_member(self, space_id: str, user_id: str) -> bool:
        """Check if user is a member of the space."""
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )
            return 'Item' in response
        except ClientError:
            return False

    def _get_space(self, space_id: str) -> Optional[Dict[str, Any]]:
        """Get space metadata."""
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
            )
            return response.get('Item')
        except ClientError:
            return None

    def _get_user_role(self, space_id: str, user_id: str) -> Optional[str]:
        """Get user's role in a space."""
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )
            if 'Item' in response:
                return response['Item'].get('role')
            return None
        except ClientError:
            return None

    def create_journal_entry(self, space_id: str, user_id: str, data: JournalCreate) -> Dict[str, Any]:
        """
        Create a new journal entry.

        Args:
            space_id: Space ID where journal is created
            user_id: User creating the journal
            data: Journal creation data

        Returns:
            Created journal entry

        Raises:
            SpaceNotFoundError: If space doesn't exist
            UnauthorizedError: If user is not a space member
            ValidationError: If data is invalid
        """
        logger.info(f"[CREATE_JOURNAL] Starting journal creation for user={user_id}, space={space_id}")

        # Validate space exists
        space = self._get_space(space_id)
        if not space:
            raise SpaceNotFoundError(f"Space {space_id} not found")

        # Validate user is space member
        if not self._is_space_member(space_id, user_id):
            raise UnauthorizedError("You must be a space member to create journals")

        # Generate journal ID
        journal_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Calculate word count
        word_count = self._calculate_word_count(data.content)

        # Create journal item
        journal_item = {
            'PK': f'SPACE#{space_id}',
            'SK': f'JOURNAL#{journal_id}',
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'JOURNAL#{journal_id}#{now}',
            'journal_id': journal_id,
            'space_id': space_id,
            'user_id': user_id,
            'title': data.title.strip(),
            'content': data.content,
            'template_id': data.template_id,
            'template_data': data.template_data or {},
            'tags': data.tags,
            'mood': data.mood,
            'emotions': data.emotions or [],
            'created_at': now,
            'updated_at': now,
            'is_encrypted': False,
            'word_count': word_count,
            'is_pinned': data.is_pinned
        }

        # Write to DynamoDB
        self.table.put_item(Item=journal_item)

        logger.info(f"[CREATE_JOURNAL] Journal created: {journal_id}")

        return {
            'journal_id': journal_id,
            'space_id': space_id,
            'user_id': user_id,
            'title': data.title.strip(),
            'content': data.content,
            'template_id': data.template_id,
            'template_data': data.template_data or {},
            'tags': data.tags,
            'mood': data.mood,
            'emotions': data.emotions or [],
            'created_at': now,
            'updated_at': now,
            'word_count': word_count,
            'is_pinned': data.is_pinned
        }

    def get_journal_entry(self, space_id: str, journal_id: str, user_id: str) -> Dict[str, Any]:
        """
        Get a journal entry by ID.

        Args:
            space_id: Space ID where the journal exists
            journal_id: Journal ID to retrieve
            user_id: User requesting the journal

        Returns:
            Journal entry with author info

        Raises:
            JournalNotFoundError: If journal doesn't exist
            UnauthorizedError: If user doesn't have access
        """
        logger.info(f"[GET_JOURNAL] Fetching journal={journal_id} in space={space_id} for user={user_id}")

        # Verify user is space member first
        if not self._is_space_member(space_id, user_id):
            logger.error(f"[GET_JOURNAL] User {user_id} is not a member of space {space_id}")
            raise UnauthorizedError("You don't have access to this journal")

        # Direct key lookup - most efficient!
        response = self.table.get_item(
            Key={
                'PK': f'SPACE#{space_id}',
                'SK': f'JOURNAL#{journal_id}'
            }
        )

        if 'Item' not in response:
            logger.error(f"[GET_JOURNAL] Journal {journal_id} not found in space {space_id}")
            raise JournalNotFoundError(f"Journal {journal_id} not found")

        journal = response['Item']
        logger.info(f"[GET_JOURNAL] Journal found via direct key lookup")

        # Get author info
        author_info = self._get_author_info(journal['user_id'])

        return {
            'journal_id': journal['journal_id'],
            'space_id': journal['space_id'],
            'user_id': journal['user_id'],
            'title': journal['title'],
            'content': journal['content'],
            'template_id': journal.get('template_id'),
            'template_data': journal.get('template_data', {}),
            'tags': journal.get('tags', []),
            'mood': journal.get('mood'),
            'emotions': journal.get('emotions', []),
            'created_at': journal['created_at'],
            'updated_at': journal['updated_at'],
            'word_count': journal.get('word_count', 0),
            'is_pinned': journal.get('is_pinned', False),
            'author': author_info
        }

    def update_journal_entry(self, space_id: str, journal_id: str, user_id: str, data: JournalUpdate) -> Dict[str, Any]:
        """
        Update a journal entry.

        Args:
            space_id: Space ID where the journal exists
            journal_id: Journal ID to update
            user_id: User updating the journal
            data: Update data

        Returns:
            Updated journal entry

        Raises:
            JournalNotFoundError: If journal doesn't exist
            UnauthorizedError: If user is not the author
        """
        logger.info(f"[UPDATE_JOURNAL] Updating journal={journal_id} in space={space_id} by user={user_id}")

        # Direct key lookup
        response = self.table.get_item(
            Key={
                'PK': f'SPACE#{space_id}',
                'SK': f'JOURNAL#{journal_id}'
            }
        )

        if 'Item' not in response:
            raise JournalNotFoundError(f"Journal {journal_id} not found")

        journal = response['Item']

        # Verify user is the author
        if journal['user_id'] != user_id:
            raise UnauthorizedError("Only the author can update this journal")

        # Build update expression
        update_expr = "SET updated_at = :updated_at"
        expr_values = {':updated_at': datetime.now(timezone.utc).isoformat()}
        expr_names = {}

        if data.title is not None:
            update_expr += ", title = :title"
            expr_values[':title'] = data.title.strip()

        if data.content is not None:
            update_expr += ", content = :content, word_count = :word_count"
            expr_values[':content'] = data.content
            expr_values[':word_count'] = self._calculate_word_count(data.content)

        if data.tags is not None:
            update_expr += ", tags = :tags"
            expr_values[':tags'] = data.tags

        if data.mood is not None:
            update_expr += ", mood = :mood"
            expr_values[':mood'] = data.mood

        if data.emotions is not None:
            update_expr += ", emotions = :emotions"
            expr_values[':emotions'] = data.emotions

        if data.is_pinned is not None:
            update_expr += ", is_pinned = :is_pinned"
            expr_values[':is_pinned'] = data.is_pinned

        # Update the journal
        update_params = {
            'Key': {'PK': journal['PK'], 'SK': journal['SK']},
            'UpdateExpression': update_expr,
            'ExpressionAttributeValues': expr_values,
            'ReturnValues': 'ALL_NEW'
        }
        if expr_names:
            update_params['ExpressionAttributeNames'] = expr_names

        response = self.table.update_item(**update_params)
        updated_journal = response['Attributes']

        # Get author info
        author_info = self._get_author_info(updated_journal['user_id'])

        return {
            'journal_id': updated_journal['journal_id'],
            'space_id': updated_journal['space_id'],
            'user_id': updated_journal['user_id'],
            'title': updated_journal['title'],
            'content': updated_journal['content'],
            'template_id': updated_journal.get('template_id'),
            'template_data': updated_journal.get('template_data', {}),
            'tags': updated_journal.get('tags', []),
            'mood': updated_journal.get('mood'),
            'emotions': updated_journal.get('emotions', []),
            'created_at': updated_journal['created_at'],
            'updated_at': updated_journal['updated_at'],
            'word_count': updated_journal.get('word_count', 0),
            'is_pinned': updated_journal.get('is_pinned', False),
            'author': author_info
        }

    def delete_journal_entry(self, space_id: str, journal_id: str, user_id: str) -> bool:
        """
        Delete a journal entry.

        Args:
            space_id: Space ID where the journal exists
            journal_id: Journal ID to delete
            user_id: User deleting the journal

        Returns:
            True if deleted successfully

        Raises:
            JournalNotFoundError: If journal doesn't exist
            UnauthorizedError: If user is not the author or space owner
        """
        logger.info(f"[DELETE_JOURNAL] Deleting journal={journal_id} in space={space_id} by user={user_id}")

        # Direct key lookup
        response = self.table.get_item(
            Key={
                'PK': f'SPACE#{space_id}',
                'SK': f'JOURNAL#{journal_id}'
            }
        )

        if 'Item' not in response:
            raise JournalNotFoundError(f"Journal {journal_id} not found")

        journal = response['Item']

        is_author = journal['user_id'] == user_id
        is_space_owner = self._get_user_role(space_id, user_id) == 'owner'

        # Verify user is author or space owner
        if not (is_author or is_space_owner):
            raise UnauthorizedError("Only the author or space owner can delete this journal")

        # Delete the journal
        self.table.delete_item(
            Key={'PK': journal['PK'], 'SK': journal['SK']}
        )

        logger.info(f"[DELETE_JOURNAL] Journal deleted: {journal_id}")
        return True

    def list_space_journals(
        self,
        space_id: str,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        tags: Optional[List[str]] = None,
        mood: Optional[str] = None,
        author_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List journals in a space with filtering and pagination.

        Args:
            space_id: Space ID
            user_id: User requesting journals
            page: Page number (1-indexed)
            page_size: Number of items per page
            tags: Filter by tags
            mood: Filter by mood
            author_id: Filter by author

        Returns:
            Paginated list of journals

        Raises:
            SpaceNotFoundError: If space doesn't exist
            UnauthorizedError: If user is not a space member
        """
        logger.info(f"[LIST_SPACE_JOURNALS] Listing journals for space={space_id}, user={user_id}")

        # Validate space exists
        space = self._get_space(space_id)
        if not space:
            raise SpaceNotFoundError(f"Space {space_id} not found")

        # Validate user is space member
        if not self._is_space_member(space_id, user_id):
            raise UnauthorizedError("You must be a space member to view journals")

        # Query journals for this space
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}') & Key('SK').begins_with('JOURNAL#')
        )

        journals = response.get('Items', [])

        # Apply filters
        if tags:
            journals = [j for j in journals if any(tag in j.get('tags', []) for tag in tags)]

        if mood:
            journals = [j for j in journals if j.get('mood') == mood]

        if author_id:
            journals = [j for j in journals if j.get('user_id') == author_id]

        # Sort by created_at descending (newest first), with pinned items first
        journals.sort(key=lambda x: (not x.get('is_pinned', False), x.get('created_at', '')), reverse=True)

        # Pagination
        total = len(journals)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_journals = journals[start:end]

        # Enrich with author info
        enriched_journals = []
        for journal in paginated_journals:
            author_info = self._get_author_info(journal['user_id'])
            enriched_journals.append({
                'journal_id': journal['journal_id'],
                'space_id': journal['space_id'],
                'user_id': journal['user_id'],
                'title': journal['title'],
                'content': journal['content'],
                'template_id': journal.get('template_id'),
                'template_data': journal.get('template_data', {}),
                'tags': journal.get('tags', []),
                'mood': journal.get('mood'),
                'emotions': journal.get('emotions', []),
                'created_at': journal['created_at'],
                'updated_at': journal['updated_at'],
                'word_count': journal.get('word_count', 0),
                'is_pinned': journal.get('is_pinned', False),
                'author': author_info
            })

        return {
            'journals': enriched_journals,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        }

    def list_user_journals(self, user_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """
        List all journals created by a user across all spaces.

        Args:
            user_id: User ID
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            Paginated list of journals
        """
        logger.info(f"[LIST_USER_JOURNALS] Listing journals for user={user_id}")

        # Query user's journals via GSI1
        response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'USER#{user_id}') & Key('GSI1SK').begins_with('JOURNAL#')
        )

        journals = response.get('Items', [])

        # Filter out journals from spaces user is no longer a member of
        accessible_journals = []
        for journal in journals:
            space_id = journal.get('space_id')
            if self._is_space_member(space_id, user_id):
                accessible_journals.append(journal)

        # Sort by created_at descending (newest first)
        accessible_journals.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        # Pagination
        total = len(accessible_journals)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_journals = accessible_journals[start:end]

        # Enrich with author info
        enriched_journals = []
        for journal in paginated_journals:
            author_info = self._get_author_info(journal['user_id'])
            enriched_journals.append({
                'journal_id': journal['journal_id'],
                'space_id': journal['space_id'],
                'user_id': journal['user_id'],
                'title': journal['title'],
                'content': journal['content'],
                'template_id': journal.get('template_id'),
                'template_data': journal.get('template_data', {}),
                'tags': journal.get('tags', []),
                'mood': journal.get('mood'),
                'emotions': journal.get('emotions', []),
                'created_at': journal['created_at'],
                'updated_at': journal['updated_at'],
                'word_count': journal.get('word_count', 0),
                'is_pinned': journal.get('is_pinned', False),
                'author': author_info
            })

        return {
            'journals': enriched_journals,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        }

    def _get_author_info(self, user_id: str) -> Dict[str, Any]:
        """Get author information for a user."""
        try:
            from app.services.user_profile import UserProfileService
            user_profile_service = UserProfileService()
            profile = user_profile_service.get_user_profile(user_id)

            if profile:
                return {
                    'user_id': user_id,
                    'username': profile.get('username', 'Unknown'),
                    'display_name': profile.get('display_name', profile.get('username', 'Unknown'))
                }
        except Exception:
            pass

        # Return minimal info if profile not found
        return {
            'user_id': user_id,
            'username': 'Unknown',
            'display_name': 'Unknown'
        }
