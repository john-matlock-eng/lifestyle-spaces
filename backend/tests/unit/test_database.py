"""
Unit tests for database module.
"""
import pytest
from moto import mock_aws
import boto3


class TestDatabase:
    """Test cases for DynamoDB database utilities."""
    
    @mock_aws
    def test_get_dynamodb_table(self):
        """Test getting DynamoDB table."""
        # Create mock table first
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        dynamodb.create_table(
            TableName='lifestyle-spaces-test',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        from app.core.database import get_dynamodb_table
        
        table = get_dynamodb_table()
        assert table is not None
        assert table.table_name == 'lifestyle-spaces-test'
    
    @mock_aws
    def test_database_client_singleton(self):
        """Test that database resource is cached."""
        from app.core.database import get_dynamodb_resource
        
        # The resource should be cached
        resource1 = get_dynamodb_resource()
        resource2 = get_dynamodb_resource()
        
        # Should return the same resource instance (cached)
        assert resource1 is resource2