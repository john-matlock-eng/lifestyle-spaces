"""
AWS Cognito authentication service.
"""
import os
import boto3
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from app.models.user import UserCreate, LoginRequest, UserUpdate
from app.services.exceptions import (
    UserAlreadyExistsError,
    InvalidCredentialsError
)


class CognitoService:
    """Service for AWS Cognito operations."""
    
    def __init__(self):
        """Initialize Cognito client."""
        self.client = boto3.client('cognito-idp', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        self.user_pool_id = os.getenv('COGNITO_USER_POOL_ID', self._create_test_pool())
        self.client_id = os.getenv('COGNITO_CLIENT_ID', self._create_test_client())
    
    def _create_test_pool(self) -> str:
        """Create a test user pool for development/testing."""
        try:
            response = self.client.create_user_pool(
                PoolName='lifestyle-spaces-test',
                Policies={
                    'PasswordPolicy': {
                        'MinimumLength': 8,
                        'RequireUppercase': True,
                        'RequireLowercase': True,
                        'RequireNumbers': True,
                        'RequireSymbols': True
                    }
                },
                AutoVerifiedAttributes=['email'],
                UsernameAttributes=['email'],
                Schema=[
                    {
                        'Name': 'email',
                        'AttributeDataType': 'String',
                        'Required': True,
                        'Mutable': True
                    },
                    {
                        'Name': 'name',
                        'AttributeDataType': 'String',
                        'Required': False,
                        'Mutable': True
                    }
                ]
            )
            return response['UserPool']['Id']
        except ClientError:
            # Pool might already exist in testing
            pools = self.client.list_user_pools(MaxResults=10)
            for pool in pools['UserPools']:
                if pool['Name'] == 'lifestyle-spaces-test':
                    return pool['Id']
            raise
    
    def _create_test_client(self) -> str:
        """Create a test client for the user pool."""
        try:
            response = self.client.create_user_pool_client(
                UserPoolId=self.user_pool_id,
                ClientName='lifestyle-spaces-test-client',
                ExplicitAuthFlows=[
                    'ALLOW_USER_PASSWORD_AUTH',
                    'ALLOW_REFRESH_TOKEN_AUTH'
                ],
                GenerateSecret=False
            )
            return response['UserPoolClient']['ClientId']
        except ClientError:
            # Client might already exist
            clients = self.client.list_user_pool_clients(
                UserPoolId=self.user_pool_id,
                MaxResults=10
            )
            for client in clients['UserPoolClients']:
                if client['ClientName'] == 'lifestyle-spaces-test-client':
                    return client['ClientId']
            raise
    
    def sign_up(self, user: UserCreate) -> Dict[str, Any]:
        """Sign up a new user."""
        try:
            response = self.client.sign_up(
                ClientId=self.client_id,
                Username=user.email,  # Using email as username
                Password=user.password,
                UserAttributes=[
                    {'Name': 'email', 'Value': user.email},
                    {'Name': 'name', 'Value': user.full_name or ''},
                    {'Name': 'preferred_username', 'Value': user.username}
                ]
            )
            return {
                'user_sub': response['UserSub'],
                'username': user.username,
                'email': user.email
            }
        except ClientError as e:
            if e.response['Error']['Code'] == 'UsernameExistsException':
                raise UserAlreadyExistsError(f"User {user.email} already exists")
            raise
    
    def confirm_user(self, email: str) -> None:
        """Auto-confirm user for testing."""
        try:
            self.client.admin_confirm_sign_up(
                UserPoolId=self.user_pool_id,
                Username=email  # Using email as username
            )
        except ClientError:
            pass  # User might already be confirmed
    
    def sign_in(self, login: LoginRequest) -> Dict[str, Any]:
        """Sign in a user."""
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': login.email,  # Using email as username
                    'PASSWORD': login.password
                }
            )
            
            return {
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'refresh_token': response['AuthenticationResult']['RefreshToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
        except ClientError as e:
            if e.response['Error']['Code'] in ['NotAuthorizedException', 'UserNotFoundException']:
                raise InvalidCredentialsError("Invalid email or password")
            raise
    
    def _get_username_by_email(self, email: str) -> Optional[str]:
        """Get username by email address."""
        try:
            response = self.client.list_users(
                UserPoolId=self.user_pool_id,
                Filter=f'email = "{email}"',
                Limit=1
            )
            if response['Users']:
                return response['Users'][0]['Username']
            return None
        except ClientError:
            return None
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token."""
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': refresh_token
                }
            )
            
            return {
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
        except ClientError as e:
            if e.response['Error']['Code'] == 'NotAuthorizedException':
                raise InvalidCredentialsError("Invalid refresh token")
            raise
    
    def sign_out(self, access_token: str) -> None:
        """Sign out a user."""
        try:
            self.client.global_sign_out(AccessToken=access_token)
        except ClientError:
            pass  # Ignore sign out errors
    
    def get_user(self, access_token: str) -> Dict[str, Any]:
        """Get user information."""
        try:
            response = self.client.get_user(AccessToken=access_token)
            
            user_info = {
                'username': response['Username']  # This will be the email
            }
            
            for attr in response['UserAttributes']:
                if attr['Name'] == 'email':
                    user_info['email'] = attr['Value']
                elif attr['Name'] == 'name':
                    user_info['full_name'] = attr['Value']
                elif attr['Name'] == 'sub':
                    user_info['id'] = attr['Value']
                elif attr['Name'] == 'preferred_username':
                    user_info['preferred_username'] = attr['Value']
            
            return user_info
        except ClientError as e:
            if e.response['Error']['Code'] == 'NotAuthorizedException':
                raise InvalidCredentialsError("Invalid access token")
            raise
    
    def update_user(self, access_token: str, update: UserUpdate) -> None:
        """Update user attributes."""
        attributes = []
        
        if update.email:
            attributes.append({'Name': 'email', 'Value': update.email})
        if update.full_name is not None:
            attributes.append({'Name': 'name', 'Value': update.full_name})
        
        if attributes:
            try:
                self.client.update_user_attributes(
                    AccessToken=access_token,
                    UserAttributes=attributes
                )
            except ClientError as e:
                if e.response['Error']['Code'] == 'NotAuthorizedException':
                    raise InvalidCredentialsError("Invalid access token")
                raise