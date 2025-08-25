"""
Invitation management service.
"""
import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from app.models.invitation import InvitationCreate
from app.services.exceptions import (
    InvitationAlreadyExistsError,
    InvalidInvitationError,
    InvitationExpiredError,
    UnauthorizedError
)


class InvitationService:
    """Service for invitation management operations."""
    
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
                    {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
                    {'AttributeName': 'GSI2PK', 'AttributeType': 'S'},
                    {'AttributeName': 'GSI2SK', 'AttributeType': 'S'}
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
                    },
                    {
                        'IndexName': 'GSI2',
                        'KeySchema': [
                            {'AttributeName': 'GSI2PK', 'KeyType': 'HASH'},
                            {'AttributeName': 'GSI2SK', 'KeyType': 'RANGE'}
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
    
    def create_invitation(self, invitation: InvitationCreate, space_id: str, 
                         space_name: str, inviter_id: str, inviter_name: str) -> Dict[str, Any]:
        """Create a new invitation."""
        # Check if invitation already exists
        existing = self._get_pending_invitation(space_id, invitation.email)
        if existing:
            raise InvitationAlreadyExistsError(
                f"Pending invitation already exists for {invitation.email} to space {space_id}"
            )
        
        invitation_id = str(uuid.uuid4())
        invitation_code = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=7)
        
        invitation_item = {
            'PK': f'INVITATION#{invitation_id}',
            'SK': 'METADATA',
            'GSI1PK': f'SPACE#{space_id}',
            'GSI1SK': f'INVITATION#{invitation_id}',
            'GSI2PK': f'EMAIL#{invitation.email}',
            'GSI2SK': f'INVITATION#{invitation_id}',
            'id': invitation_id,
            'invitation_code': invitation_code,
            'space_id': space_id,
            'space_name': space_name,
            'inviter_id': inviter_id,
            'inviter_name': inviter_name,
            'invitee_email': invitation.email,
            'role': invitation.role,
            'message': invitation.message,
            'status': 'pending',
            'expires_at': expires_at.isoformat(),
            'created_at': now.isoformat()
        }
        
        self.table.put_item(Item=invitation_item)
        
        return {
            'id': invitation_id,
            'invitation_code': invitation_code,
            'space_id': space_id,
            'space_name': space_name,
            'inviter_id': inviter_id,
            'inviter_name': inviter_name,
            'invitee_email': invitation.email,
            'role': invitation.role,
            'status': 'pending',
            'expires_at': expires_at.isoformat(),
            'created_at': now.isoformat()
        }
    
    def _get_pending_invitation(self, space_id: str, email: str) -> Dict[str, Any]:
        """Check if pending invitation exists."""
        response = self.table.query(
            IndexName='GSI2',
            KeyConditionExpression=Key('GSI2PK').eq(f'EMAIL#{email}') & Key('GSI2SK').begins_with('INVITATION#')
        )
        
        for item in response.get('Items', []):
            if item['space_id'] == space_id and item['status'] == 'pending':
                return item
        
        return None
    
    def accept_invitation(self, invitation_code: str, user_id: str, 
                         username: str, email: str) -> Dict[str, Any]:
        """Accept an invitation."""
        # Find invitation by code
        invitation = self._get_invitation_by_code(invitation_code)
        
        if not invitation:
            raise InvalidInvitationError("Invalid invitation code")
        
        if invitation['status'] != 'pending':
            raise InvalidInvitationError("Invitation is no longer pending")
        
        # Check if expired
        expires_at = datetime.fromisoformat(invitation['expires_at'])
        if datetime.now(timezone.utc) > expires_at:
            raise InvitationExpiredError("Invitation has expired")
        
        # Update invitation status
        self.table.update_item(
            Key={'PK': invitation['PK'], 'SK': invitation['SK']},
            UpdateExpression="SET #status = :status, accepted_at = :accepted_at, accepted_by = :accepted_by",
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'accepted',
                ':accepted_at': datetime.now(timezone.utc).isoformat(),
                ':accepted_by': user_id
            }
        )
        
        # Add user to space (using SpaceService would create circular dependency, so we do it here)
        member_item = {
            'PK': f"SPACE#{invitation['space_id']}",
            'SK': f'MEMBER#{user_id}',
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f"SPACE#{invitation['space_id']}",
            'user_id': user_id,
            'username': username,
            'email': email,
            'role': invitation['role'],
            'joined_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.table.put_item(Item=member_item)
        
        return {
            'status': 'accepted',
            'space_id': invitation['space_id'],
            'space_name': invitation['space_name'],
            'role': invitation['role']
        }
    
    def _get_invitation_by_code(self, invitation_code: str) -> Dict[str, Any]:
        """Get invitation by invitation code."""
        # Scan for invitation with matching code (in production, consider using a GSI)
        response = self.table.scan(
            FilterExpression='invitation_code = :code',
            ExpressionAttributeValues={':code': invitation_code}
        )
        
        if response['Items']:
            return response['Items'][0]
        return None
    
    def list_user_invitations(self, email: str) -> Dict[str, Any]:
        """List invitations for a user email."""
        response = self.table.query(
            IndexName='GSI2',
            KeyConditionExpression=Key('GSI2PK').eq(f'EMAIL#{email}') & Key('GSI2SK').begins_with('INVITATION#')
        )
        
        invitations = []
        for item in response.get('Items', []):
            invitations.append({
                'id': item['id'],
                'space_id': item['space_id'],
                'space_name': item['space_name'],
                'inviter_id': item['inviter_id'],
                'inviter_name': item['inviter_name'],
                'invitee_email': item['invitee_email'],
                'role': item['role'],
                'status': item['status'],
                'expires_at': item['expires_at'],
                'created_at': item['created_at']
            })
        
        return {
            'invitations': invitations,
            'total': len(invitations)
        }
    
    def list_space_invitations(self, space_id: str, requester_id: str) -> Dict[str, Any]:
        """List invitations for a space."""
        # TODO: Check if requester has permission to view space invitations
        
        response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'SPACE#{space_id}') & Key('GSI1SK').begins_with('INVITATION#')
        )
        
        invitations = []
        for item in response.get('Items', []):
            invitations.append({
                'id': item['id'],
                'space_id': item['space_id'],
                'space_name': item['space_name'],
                'inviter_id': item['inviter_id'],
                'inviter_name': item['inviter_name'],
                'invitee_email': item['invitee_email'],
                'role': item['role'],
                'status': item['status'],
                'expires_at': item['expires_at'],
                'created_at': item['created_at']
            })
        
        return {
            'invitations': invitations,
            'total': len(invitations)
        }
    
    def cancel_invitation(self, invitation_id: str, cancelled_by: str) -> None:
        """Cancel an invitation."""
        # Get invitation
        response = self.table.get_item(
            Key={'PK': f'INVITATION#{invitation_id}', 'SK': 'METADATA'}
        )
        
        if 'Item' not in response:
            raise InvalidInvitationError("Invitation not found")
        
        invitation = response['Item']
        
        # TODO: Check if user has permission to cancel (inviter or space admin)
        
        # Update status
        self.table.update_item(
            Key={'PK': invitation['PK'], 'SK': invitation['SK']},
            UpdateExpression="SET #status = :status, cancelled_at = :cancelled_at, cancelled_by = :cancelled_by",
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'cancelled',
                ':cancelled_at': datetime.now(timezone.utc).isoformat(),
                ':cancelled_by': cancelled_by
            }
        )