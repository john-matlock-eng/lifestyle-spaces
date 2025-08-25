"""
Unit tests for DynamoDB client.
"""
import pytest
from moto import mock_aws
import boto3


class TestDynamoDBClient:
    """Test cases for DynamoDB client operations."""
    
    @mock_aws
    def test_db_client_operations(self):
        """Test DynamoDB client CRUD operations."""
        # Create mock table
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
        
        from app.core.database import DynamoDBClient
        client = DynamoDBClient()
        
        # Test put_item
        item = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'name': 'Test User',
            'email': 'test@example.com'
        }
        response = client.put_item(item)
        assert response['ResponseMetadata']['HTTPStatusCode'] == 200
        
        # Test get_item
        retrieved = client.get_item('USER#123', 'PROFILE')
        assert retrieved is not None
        assert retrieved['name'] == 'Test User'
        assert retrieved['email'] == 'test@example.com'
        
        # Test get non-existent item
        not_found = client.get_item('USER#999', 'PROFILE')
        assert not_found is None
        
        # Test query
        items = client.query('USER#123')
        assert len(items) == 1
        assert items[0]['PK'] == 'USER#123'
        
        # Test query with SK prefix
        client.put_item({
            'PK': 'USER#123',
            'SK': 'ORDER#001',
            'total': 100
        })
        client.put_item({
            'PK': 'USER#123',
            'SK': 'ORDER#002',
            'total': 200
        })
        
        orders = client.query('USER#123', 'ORDER#')
        assert len(orders) == 2
        
        # Test delete_item
        response = client.delete_item('USER#123', 'PROFILE')
        assert response['ResponseMetadata']['HTTPStatusCode'] == 200
        
        # Verify item is deleted
        deleted = client.get_item('USER#123', 'PROFILE')
        assert deleted is None
    
    @mock_aws
    def test_batch_write_items(self):
        """Test batch write operation."""
        # Create mock table
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
        
        from app.core.database import DynamoDBClient
        client = DynamoDBClient()
        
        # Batch write multiple items
        items = [
            {'PK': 'USER#1', 'SK': 'PROFILE', 'name': 'User 1'},
            {'PK': 'USER#2', 'SK': 'PROFILE', 'name': 'User 2'},
            {'PK': 'USER#3', 'SK': 'PROFILE', 'name': 'User 3'},
        ]
        
        response = client.batch_write_items(items)
        assert response['ResponseMetadata']['HTTPStatusCode'] == 200
        
        # Verify items were written
        for i in range(1, 4):
            item = client.get_item(f'USER#{i}', 'PROFILE')
            assert item is not None
            assert item['name'] == f'User {i}'
    
    @mock_aws
    def test_get_db_singleton(self):
        """Test that get_db returns singleton instance."""
        from app.core.database import get_db
        
        db1 = get_db()
        db2 = get_db()
        
        assert db1 is db2