"""
Space management service with DynamoDB.
"""
import os
import uuid
import secrets
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from app.models.space import SpaceCreate, SpaceUpdate
from app.services.exceptions import (
    SpaceNotFoundError,
    UnauthorizedError,
    InvalidInviteCodeError,
    AlreadyMemberError,
    SpaceLimitExceededError,
    ValidationError
)

logger = logging.getLogger(__name__)


class SpaceService:
    """Service for space management operations."""
    
    def __init__(self):
        """Initialize DynamoDB client and table."""
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces')
        
        logger.info(f"Initializing SpaceService with table: {self.table_name}, region: {aws_region}")
        
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
    
    def _ensure_table_exists(self) -> bool:
        """Check if the DynamoDB table exists."""
        try:
            self.table.load()
            return True
        except ClientError:
            return False
    
    def _generate_invite_code(self) -> str:
        """Generate a unique 8-character invite code."""
        return secrets.token_urlsafe(6)[:8].upper()
    
    def create_space(self, space: SpaceCreate, owner_id: str) -> Dict[str, Any]:
        """Create a new space with invite code generation."""
        logger.info(f"[CREATE_SPACE] Starting space creation for owner_id={owner_id}, space_name={space.name}")

        # Validate input
        if not space.name or not space.name.strip():
            raise ValidationError("Space name is required")

        space_id = str(uuid.uuid4())
        invite_code = self._generate_invite_code()
        logger.info(f"[CREATE_SPACE] Generated space_id={space_id}, invite_code={invite_code}")

        now = datetime.now(timezone.utc).isoformat()
        
        # Create space item
        space_item = {
            'PK': f'SPACE#{space_id}',
            'SK': 'METADATA',
            'id': space_id,
            'name': space.name.strip(),
            'description': space.description.strip() if space.description else None,
            'type': space.type,
            'is_public': space.is_public,
            'owner_id': owner_id,
            'invite_code': invite_code,
            'created_at': now,
            'updated_at': now,
            'metadata': space.metadata or {}
        }
        
        # Create owner membership (only store user_id and role)
        member_item = {
            'PK': f'SPACE#{space_id}',
            'SK': f'MEMBER#{owner_id}',
            'GSI1PK': f'USER#{owner_id}',
            'GSI1SK': f'SPACE#{space_id}',
            'user_id': owner_id,
            'role': 'owner',
            'joined_at': now
        }
        
        # Create invite code mapping
        invite_item = {
            'PK': f'INVITE#{invite_code}',
            'SK': f'SPACE#{space_id}',
            'space_id': space_id,
            'created_at': now
        }
        
        # Write all items
        logger.info(f"[CREATE_SPACE] Writing to DynamoDB: space_item with invite_code={invite_code}")
        with self.table.batch_writer() as batch:
            batch.put_item(Item=space_item)
            batch.put_item(Item=member_item)
            batch.put_item(Item=invite_item)

        logger.info(f"[CREATE_SPACE] DynamoDB write complete for space_id={space_id}")

        result = {
            'id': space_id,
            'name': space.name.strip(),
            'description': space.description.strip() if space.description else None,
            'type': space.type,
            'is_public': space.is_public,
            'owner_id': owner_id,
            'invite_code': invite_code,
            'created_at': now,
            'updated_at': now
        }

        logger.info(f"[CREATE_SPACE] Returning result with invite_code={result.get('invite_code')}")
        return result
    
    def get_space(self, space_id: str, user_id: str) -> Dict[str, Any]:
        """Get space by ID (check membership or public)."""
        # Get space metadata
        response = self.table.get_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
        )

        if 'Item' not in response:
            raise SpaceNotFoundError(f"Space {space_id} not found")

        space = response['Item']

        # Check if user is a member and get their role
        member_response = self.table.get_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
        )
        is_member = 'Item' in member_response
        user_role = member_response['Item'].get('role') if is_member else None

        # If not a member and space is not public, deny access
        if not is_member and not space.get('is_public', False):
            raise UnauthorizedError("You are not a member of this space")

        # Check if user is owner
        is_owner = space['owner_id'] == user_id

        # Get member count
        members_response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}') & Key('SK').begins_with('MEMBER#')
        )
        member_count = len(members_response.get('Items', []))

        # Build response
        result = {
            'id': space['id'],
            'name': space['name'],
            'description': space.get('description'),
            'type': space.get('type', 'workspace'),
            'is_public': space.get('is_public', False),
            'owner_id': space['owner_id'],
            'created_at': space['created_at'],
            'updated_at': space['updated_at'],
            'member_count': member_count,
            'is_owner': is_owner
        }

        # Include invite_code only for owners and admins
        # Use is_owner check OR role check for maximum robustness
        if is_owner or user_role in ['owner', 'admin']:
            result['invite_code'] = space.get('invite_code')
            logger.info(f"Including invite_code for user {user_id} in space {space_id} (is_owner={is_owner}, role={user_role})")
        else:
            logger.debug(f"Excluding invite_code for user {user_id} in space {space_id} (is_owner={is_owner}, role={user_role})")

        return result
    
    def update_space(self, space_id: str, update: SpaceUpdate, user_id: str) -> bool:
        """Update space (owner/admin only)."""
        # First check if space exists
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
            )
            if 'Item' not in response:
                raise SpaceNotFoundError(f"Space {space_id} not found")
        except ClientError:
            raise SpaceNotFoundError(f"Space {space_id} not found")
        
        # Check if user has permission
        if not self.can_edit_space(space_id, user_id):
            raise UnauthorizedError("Only admins can update space settings")
        
        # Validate input
        if update.name is not None and (not update.name or not update.name.strip()):
            raise ValidationError("Space name cannot be empty")
        
        # Build update expression
        update_expr = "SET updated_at = :updated_at"
        expr_values = {':updated_at': datetime.now(timezone.utc).isoformat()}
        expr_names = {}
        
        if update.name is not None:
            update_expr += ", #name = :name"
            expr_values[':name'] = update.name.strip()
            expr_names['#name'] = 'name'
        
        if update.description is not None:
            update_expr += ", description = :description"
            expr_values[':description'] = update.description.strip() if update.description else None
        
        if update.is_public is not None:
            update_expr += ", is_public = :is_public"
            expr_values[':is_public'] = update.is_public
        
        if update.metadata is not None:
            update_expr += ", metadata = :metadata"
            expr_values[':metadata'] = update.metadata
        
        # Update the space
        update_params = {
            'Key': {'PK': f'SPACE#{space_id}', 'SK': 'METADATA'},
            'UpdateExpression': update_expr,
            'ExpressionAttributeValues': expr_values
        }
        if expr_names:
            update_params['ExpressionAttributeNames'] = expr_names
        
        self.table.update_item(**update_params)
        
        return True
    
    def delete_space(self, space_id: str, user_id: str) -> None:
        """Delete a space."""
        # Check if user is owner
        space = self.get_space(space_id, user_id)
        if space['owner_id'] != user_id:
            raise UnauthorizedError(f"Only owner can delete space {space_id}")
        
        # Get all items related to this space
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}')
        )
        
        # Delete all items
        with self.table.batch_writer() as batch:
            for item in response['Items']:
                batch.delete_item(
                    Key={'PK': item['PK'], 'SK': item['SK']}
                )
    
    def list_user_spaces(self, user_id: str, page: int = 1, page_size: int = 20,
                        search: Optional[str] = None, is_public: Optional[bool] = None,
                        role: Optional[str] = None) -> Dict[str, Any]:
        """List spaces for a user with pagination/filters."""
        logger.info(f"list_user_spaces called - user_id: {user_id}, page: {page}, page_size: {page_size}")
        logger.info(f"Filters - search: {search}, is_public: {is_public}, role: {role}")
        
        # If no user_id provided, return empty list
        if not user_id:
            logger.warning("No user_id provided, returning empty list")
            return {
                'spaces': [],
                'total': 0,
                'page': page,
                'page_size': page_size
            }
        
        try:
            # Query GSI1 for user's spaces
            logger.info(f"Querying GSI1 with GSI1PK=USER#{user_id}")
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'USER#{user_id}') & Key('GSI1SK').begins_with('SPACE#')
            )
            logger.info(f"GSI1 query returned {len(response.get('Items', []))} items")
        except ClientError as e:
            logger.error(f"Error querying GSI1: {str(e)}", exc_info=True)
            # Return empty list on error instead of raising
            return {
                'spaces': [],
                'total': 0,
                'page': page,
                'page_size': page_size
            }
        except Exception as e:
            logger.error(f"Unexpected error querying GSI1: {str(e)}", exc_info=True)
            raise
        
        spaces = []
        for item in response.get('Items', []):
            space_id = item['GSI1SK'].replace('SPACE#', '')
            user_role = item.get('role', 'member')
            
            # Apply role filter if specified
            if role and role != user_role:
                continue
            
            try:
                # Get full space details
                space_response = self.table.get_item(
                    Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
                )
                
                if 'Item' not in space_response:
                    continue
                
                space = space_response['Item']
                
                # Apply is_public filter if specified
                if is_public is not None and space.get('is_public', False) != is_public:
                    continue
                
                # Apply search filter if specified
                if search:
                    search_lower = search.lower()
                    name_match = search_lower in space.get('name', '').lower()
                    desc_match = search_lower in (space.get('description') or '').lower()
                    if not (name_match or desc_match):
                        continue
                
                # Get member count
                members_response = self.table.query(
                    KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}') & Key('SK').begins_with('MEMBER#')
                )
                member_count = len(members_response.get('Items', []))
                
                # Build space object with proper field names
                # Note: These match the internal field names, not aliases
                # The SpaceResponse model will handle the alias conversion
                space_obj = {
                    'id': space['id'],
                    'name': space['name'],
                    'description': space.get('description'),
                    'type': space.get('type', 'workspace'),
                    'is_public': space.get('is_public', False),
                    'owner_id': space['owner_id'],
                    'created_at': space['created_at'],
                    'updated_at': space['updated_at'],
                    'member_count': member_count,
                    'is_owner': space['owner_id'] == user_id,  # Add is_owner field
                    'user_role': user_role
                }
                spaces.append(space_obj)
                
            except (SpaceNotFoundError, ClientError):
                pass  # Space might have been deleted
        
        # Sort by updated_at (newest first)
        spaces.sort(key=lambda x: x['updated_at'], reverse=True)
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_spaces = spaces[start:end]
        
        logger.info(f"Returning {len(paginated_spaces)} spaces out of {len(spaces)} total")
        
        return {
            'spaces': paginated_spaces,
            'total': len(spaces),
            'page': page,
            'page_size': page_size
        }
    
    def add_member(self, space_id: str, user_id: str, role: str, added_by: str) -> None:
        """Add a member to a space."""
        # Check if adder has permission
        if not self.can_edit_space(space_id, added_by):
            raise UnauthorizedError(f"User {added_by} cannot add members to space {space_id}")
        
        now = datetime.now(timezone.utc).isoformat()
        
        member_item = {
            'PK': f'SPACE#{space_id}',
            'SK': f'MEMBER#{user_id}',
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'SPACE#{space_id}',
            'user_id': user_id,
            'role': role,
            'joined_at': now
        }
        
        self.table.put_item(Item=member_item)
    
    def remove_member(self, space_id: str, member_id: str, removed_by: str) -> None:
        """Remove a member from a space."""
        # Check if remover has permission
        if not self.can_edit_space(space_id, removed_by):
            raise UnauthorizedError(f"User {removed_by} cannot remove members from space {space_id}")
        
        # Don't allow removing the owner
        space = self.get_space(space_id, removed_by)
        if space['owner_id'] == member_id:
            raise UnauthorizedError("Cannot remove space owner")
        
        self.table.delete_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{member_id}'}
        )
    
    def get_space_members(self, space_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Get members with their profiles (members only or public)."""
        # First check if space exists
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
            )
            if 'Item' not in response:
                raise SpaceNotFoundError(f"Space {space_id} not found")
            
            space = response['Item']
        except ClientError:
            raise SpaceNotFoundError(f"Space {space_id} not found")
        
        # Check if user is a member
        member_response = self.table.get_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
        )
        is_member = 'Item' in member_response
        
        # If not a member and space is not public, deny access
        if not is_member and not space.get('is_public', False):
            raise UnauthorizedError("You are not a member of this space")
        
        # Get all member records
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}') & Key('SK').begins_with('MEMBER#')
        )
        
        # Extract user IDs and membership data
        member_data = {}
        user_ids = []
        for item in response.get('Items', []):
            uid = item['user_id']
            user_ids.append(uid)
            member_data[uid] = {
                'user_id': uid,
                'role': item['role'],
                'joined_at': item['joined_at']
            }
        
        # Batch fetch user profiles
        from app.services.user_profile import UserProfileService
        user_profile_service = UserProfileService()
        profiles = user_profile_service.get_batch_user_profiles(user_ids)
        
        # Combine membership and profile data
        members = []
        for uid in user_ids:
            profile = profiles.get(uid, {})
            membership = member_data[uid]
            
            members.append({
                'user_id': uid,
                'username': profile.get('username', 'Unknown'),
                'email': profile.get('email', ''),
                'display_name': profile.get('display_name', profile.get('username', 'Unknown')),
                'role': membership['role'],
                'joined_at': membership['joined_at']
            })
        
        # Sort by role (owner first, then admin, then members)
        role_order = {'owner': 0, 'admin': 1, 'member': 2, 'viewer': 3}
        members.sort(key=lambda x: (role_order.get(x['role'], 99), x['joined_at']))
        
        return members
    
    def can_edit_space(self, space_id: str, user_id: str) -> bool:
        """Check if user can edit a space."""
        try:
            # Get member info
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )
            
            if 'Item' not in response:
                return False
            
            # Owners and admins can edit
            return response['Item']['role'] in ['owner', 'admin']
        except ClientError:
            return False
    
    def get_space_member_role(self, space_id: str, user_id: str) -> Optional[str]:
        """Get user's role in a space."""
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )

            if 'Item' in response:
                return response['Item']['role']
            return None
        except ClientError:
            return None

    def is_space_admin(self, space_id: str, user_id: str) -> bool:
        """Check if user is an admin or owner of the space."""
        role = self.get_space_member_role(space_id, user_id)
        return role in ['owner', 'admin']

    def join_space_with_invite_code(self, invite_code: str, user_id: str) -> Dict[str, Any]:
        """Join a space using invite code."""
        # Look up invite code
        try:
            response = self.table.get_item(
                Key={'PK': f'INVITE#{invite_code}', 'SK': f'SPACE#{invite_code}'}
            )
            
            if 'Item' not in response:
                # Try with proper SK pattern
                invite_response = self.table.query(
                    KeyConditionExpression=Key('PK').eq(f'INVITE#{invite_code}')
                )
                
                if not invite_response.get('Items'):
                    raise InvalidInviteCodeError("Invalid invite code")
                
                space_id = invite_response['Items'][0].get('space_id')
            else:
                space_id = response['Item'].get('space_id')
            
            if not space_id:
                raise InvalidInviteCodeError("Invalid invite code")
            
            # Check if already a member
            member_check = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )
            
            if 'Item' in member_check:
                raise AlreadyMemberError("You are already a member of this space")
            
            # Add as member (only store user_id and role)
            now = datetime.now(timezone.utc).isoformat()
            member_item = {
                'PK': f'SPACE#{space_id}',
                'SK': f'MEMBER#{user_id}',
                'GSI1PK': f'USER#{user_id}',
                'GSI1SK': f'SPACE#{space_id}',
                'user_id': user_id,
                'role': 'member',
                'joined_at': now
            }
            
            self.table.put_item(Item=member_item)
            
            # Get space details
            space = self.get_space(space_id, user_id)
            
            return {
                'space_id': space_id,
                'name': space['name'],
                'role': 'member',
                'joined_at': now
            }
            
        except InvalidInviteCodeError:
            raise
        except AlreadyMemberError:
            raise
        except Exception as e:
            raise InvalidInviteCodeError("Invalid invite code")
    
    def get_member(self, space_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific member of a space.
        
        Args:
            space_id: The space identifier
            user_id: The user identifier
            
        Returns:
            Member details if found, None otherwise
        """
        try:
            response = self.table.get_item(
                Key={'PK': f'SPACE#{space_id}', 'SK': f'MEMBER#{user_id}'}
            )
            
            if 'Item' not in response:
                return None
            
            return response['Item']
        except ClientError:
            return None
    
    def regenerate_invite_code(self, space_id: str) -> str:
        """Generate a new invite code for a space.
        
        Args:
            space_id: The space identifier
            
        Returns:
            The new invite code
            
        Raises:
            SpaceNotFoundError: If the space doesn't exist
        """
        # Get existing space
        response = self.table.get_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
        )
        
        if 'Item' not in response:
            raise SpaceNotFoundError(f"Space {space_id} not found")
        
        old_code = response['Item'].get('invite_code')
        new_code = self._generate_invite_code()
        
        # Update space with new code
        self.table.update_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'},
            UpdateExpression='SET invite_code = :code, updated_at = :updated',
            ExpressionAttributeValues={
                ':code': new_code,
                ':updated': datetime.now(timezone.utc).isoformat()
            }
        )
        
        # Delete old invite mapping if exists
        if old_code:
            try:
                self.table.delete_item(
                    Key={'PK': f'INVITE#{old_code}', 'SK': f'SPACE#{space_id}'}
                )
            except Exception:
                pass  # Old code might not exist or deletion might fail
        
        # Create new invite mapping
        self.table.put_item(
            Item={
                'PK': f'INVITE#{new_code}',
                'SK': f'SPACE#{space_id}',
                'space_id': space_id,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        return new_code