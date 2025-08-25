"""
Space management service with DynamoDB.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from app.models.space import SpaceCreate, SpaceUpdate
from app.services.exceptions import (
    SpaceNotFoundError,
    UnauthorizedError
)


class SpaceService:
    """Service for space management operations."""
    
    def __init__(self):
        """Initialize DynamoDB client and table."""
        self.dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        self.table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces')
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
    
    def create_space(self, space: SpaceCreate, owner_id: str) -> Dict[str, Any]:
        """Create a new space."""
        space_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Create space item
        space_item = {
            'PK': f'SPACE#{space_id}',
            'SK': 'METADATA',
            'id': space_id,
            'name': space.name,
            'description': space.description,
            'type': space.type,
            'is_public': space.is_public,
            'owner_id': owner_id,
            'created_at': now,
            'updated_at': now,
            'metadata': space.metadata or {}
        }
        
        # Create owner membership
        member_item = {
            'PK': f'SPACE#{space_id}',
            'SK': f'MEMBER#{owner_id}',
            'GSI1PK': f'USER#{owner_id}',
            'GSI1SK': f'SPACE#{space_id}',
            'user_id': owner_id,
            'role': 'owner',
            'joined_at': now
        }
        
        # Write both items
        with self.table.batch_writer() as batch:
            batch.put_item(Item=space_item)
            batch.put_item(Item=member_item)
        
        return {
            'id': space_id,
            'name': space.name,
            'description': space.description,
            'type': space.type,
            'is_public': space.is_public,
            'owner_id': owner_id,
            'created_at': now,
            'updated_at': now
        }
    
    def get_space(self, space_id: str, user_id: str) -> Dict[str, Any]:
        """Get space by ID."""
        # Get space metadata
        response = self.table.get_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'}
        )
        
        if 'Item' not in response:
            raise SpaceNotFoundError(f"Space {space_id} not found")
        
        space = response['Item']
        
        # Check if user is owner
        is_owner = space['owner_id'] == user_id
        
        # Get member count
        members_response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}') & Key('SK').begins_with('MEMBER#')
        )
        member_count = len(members_response.get('Items', []))
        
        return {
            'id': space['id'],
            'name': space['name'],
            'description': space.get('description'),
            'type': space['type'],
            'is_public': space['is_public'],
            'owner_id': space['owner_id'],
            'created_at': space['created_at'],
            'updated_at': space['updated_at'],
            'member_count': member_count,
            'is_owner': is_owner
        }
    
    def update_space(self, space_id: str, update: SpaceUpdate, user_id: str) -> Dict[str, Any]:
        """Update a space."""
        # Check if user has permission
        if not self.can_edit_space(space_id, user_id):
            raise UnauthorizedError(f"User {user_id} cannot edit space {space_id}")
        
        # Build update expression
        update_expr = "SET updated_at = :updated_at"
        expr_values = {':updated_at': datetime.now(timezone.utc).isoformat()}
        
        if update.name is not None:
            update_expr += ", #name = :name"
            expr_values[':name'] = update.name
        
        if update.description is not None:
            update_expr += ", description = :description"
            expr_values[':description'] = update.description
        
        if update.is_public is not None:
            update_expr += ", is_public = :is_public"
            expr_values[':is_public'] = update.is_public
        
        if update.metadata is not None:
            update_expr += ", metadata = :metadata"
            expr_values[':metadata'] = update.metadata
        
        # Update the space
        response = self.table.update_item(
            Key={'PK': f'SPACE#{space_id}', 'SK': 'METADATA'},
            UpdateExpression=update_expr,
            ExpressionAttributeNames={'#name': 'name'} if update.name is not None else {},
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        space = response['Attributes']
        return {
            'id': space['id'],
            'name': space['name'],
            'description': space.get('description'),
            'type': space['type'],
            'is_public': space['is_public'],
            'owner_id': space['owner_id'],
            'created_at': space['created_at'],
            'updated_at': space['updated_at']
        }
    
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
    
    def list_user_spaces(self, user_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """List spaces for a user."""
        # Query GSI1 for user's spaces
        response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'USER#{user_id}') & Key('GSI1SK').begins_with('SPACE#')
        )
        
        spaces = []
        for item in response.get('Items', []):
            space_id = item['GSI1SK'].replace('SPACE#', '')
            try:
                space = self.get_space(space_id, user_id)
                spaces.append(space)
            except SpaceNotFoundError:
                pass  # Space might have been deleted
        
        # Pagination (simple implementation)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_spaces = spaces[start:end]
        
        return {
            'spaces': paginated_spaces,
            'total': len(spaces),
            'page': page,
            'page_size': page_size
        }
    
    def add_member(self, space_id: str, user_id: str, username: str, email: str, 
                   role: str, added_by: str) -> None:
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
            'username': username,
            'email': email,
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
        """Get members of a space."""
        # Check if user has access to the space
        self.get_space(space_id, user_id)  # This will raise if space doesn't exist
        
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'SPACE#{space_id}') & Key('SK').begins_with('MEMBER#')
        )
        
        members = []
        for item in response.get('Items', []):
            members.append({
                'user_id': item['user_id'],
                'username': item.get('username', ''),
                'email': item.get('email', ''),
                'role': item['role'],
                'joined_at': item['joined_at']
            })
        
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