"""
Tests for database module to achieve 100% coverage.
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from moto import mock_dynamodb
import boto3
from app.core.database import (
    get_dynamodb_resource,
    get_dynamodb_table,
    DynamoDBClient,
    get_db
)


class TestDatabaseFunctions:
    """Test database helper functions."""
    
    @patch('app.core.database.boto3.resource')
    def test_get_dynamodb_resource(self, mock_boto_resource):
        """Test getting DynamoDB resource."""
        # Clear cache first
        get_dynamodb_resource.cache_clear()
        
        mock_resource = MagicMock()
        mock_boto_resource.return_value = mock_resource
        
        # First call
        result1 = get_dynamodb_resource()
        assert result1 == mock_resource
        
        # Second call should use cache
        result2 = get_dynamodb_resource()
        assert result2 == mock_resource
        
        # Should only be called once due to caching
        mock_boto_resource.assert_called_once_with(
            'dynamodb',
            region_name='us-east-1'
        )
    
    @patch('app.core.database.get_dynamodb_resource')
    def test_get_dynamodb_table(self, mock_get_resource):
        """Test getting DynamoDB table."""
        mock_resource = MagicMock()
        mock_table = MagicMock()
        mock_resource.Table.return_value = mock_table
        mock_get_resource.return_value = mock_resource
        
        result = get_dynamodb_table()
        
        assert result == mock_table
        mock_resource.Table.assert_called_once_with('lifestyle-spaces')
    
    def test_get_db_singleton(self):
        """Test get_db returns singleton instance."""
        # Reset singleton
        import app.core.database
        app.core.database._db_client = None
        
        with patch('app.core.database.DynamoDBClient') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            
            # First call creates instance
            db1 = get_db()
            assert db1 == mock_instance
            mock_client_class.assert_called_once()
            
            # Second call returns same instance
            db2 = get_db()
            assert db2 == mock_instance
            # Still only called once
            assert mock_client_class.call_count == 1


class TestDynamoDBClient:
    """Test DynamoDB client methods."""
    
    @patch('app.core.database.get_dynamodb_table')
    def test_init(self, mock_get_table):
        """Test DynamoDBClient initialization."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        
        client = DynamoDBClient()
        
        assert client.table == mock_table
        mock_get_table.assert_called_once()
    
    @patch('app.core.database.get_dynamodb_table')
    def test_put_item(self, mock_get_table):
        """Test putting an item."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        mock_table.put_item.return_value = {'ResponseMetadata': {'HTTPStatusCode': 200}}
        
        client = DynamoDBClient()
        item = {'PK': 'USER#123', 'SK': 'PROFILE', 'name': 'Test'}
        result = client.put_item(item)
        
        assert result['ResponseMetadata']['HTTPStatusCode'] == 200
        mock_table.put_item.assert_called_once_with(Item=item)
    
    @patch('app.core.database.get_dynamodb_table')
    def test_get_item_found(self, mock_get_table):
        """Test getting an existing item."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        expected_item = {'PK': 'USER#123', 'SK': 'PROFILE', 'name': 'Test'}
        mock_table.get_item.return_value = {'Item': expected_item}
        
        client = DynamoDBClient()
        result = client.get_item('USER#123', 'PROFILE')
        
        assert result == expected_item
        mock_table.get_item.assert_called_once_with(
            Key={'PK': 'USER#123', 'SK': 'PROFILE'}
        )
    
    @patch('app.core.database.get_dynamodb_table')
    def test_get_item_not_found(self, mock_get_table):
        """Test getting a non-existent item."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        mock_table.get_item.return_value = {}
        
        client = DynamoDBClient()
        result = client.get_item('USER#999', 'PROFILE')
        
        assert result is None
    
    @patch('app.core.database.get_dynamodb_table')
    def test_query_with_pk_only(self, mock_get_table):
        """Test querying with partition key only."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        expected_items = [
            {'PK': 'SPACE#123', 'SK': 'MEMBER#001'},
            {'PK': 'SPACE#123', 'SK': 'MEMBER#002'}
        ]
        mock_table.query.return_value = {'Items': expected_items}
        
        client = DynamoDBClient()
        result = client.query('SPACE#123')
        
        assert result == expected_items
        # Verify query was called with correct expression
        call_args = mock_table.query.call_args
        assert 'KeyConditionExpression' in call_args[1]
    
    @patch('app.core.database.get_dynamodb_table')
    def test_query_with_sk_prefix(self, mock_get_table):
        """Test querying with sort key prefix."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        expected_items = [{'PK': 'SPACE#123', 'SK': 'MEMBER#001'}]
        mock_table.query.return_value = {'Items': expected_items}
        
        client = DynamoDBClient()
        result = client.query('SPACE#123', sk_prefix='MEMBER#')
        
        assert result == expected_items
        call_args = mock_table.query.call_args
        assert 'KeyConditionExpression' in call_args[1]
    
    @patch('app.core.database.get_dynamodb_table')
    def test_query_with_gsi(self, mock_get_table):
        """Test querying with GSI."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        expected_items = [{'PK': 'USER#123', 'SK': 'SPACE#001'}]
        mock_table.query.return_value = {'Items': expected_items}
        
        client = DynamoDBClient()
        result = client.query('USER#123', index_name='GSI1')
        
        assert result == expected_items
        call_args = mock_table.query.call_args
        assert call_args[1]['IndexName'] == 'GSI1'
    
    @patch('app.core.database.get_dynamodb_table')
    def test_query_empty_result(self, mock_get_table):
        """Test querying with no results."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        mock_table.query.return_value = {}
        
        client = DynamoDBClient()
        result = client.query('NONEXISTENT#123')
        
        assert result == []
    
    @patch('app.core.database.get_dynamodb_table')
    def test_update_item_success(self, mock_get_table):
        """Test updating an item."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        updated_item = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'name': 'Updated Name',
            'email': 'new@example.com'
        }
        mock_table.update_item.return_value = {'Attributes': updated_item}
        
        client = DynamoDBClient()
        updates = {'name': 'Updated Name', 'email': 'new@example.com'}
        result = client.update_item('USER#123', 'PROFILE', updates)
        
        assert result == updated_item
        call_args = mock_table.update_item.call_args
        assert call_args[1]['Key'] == {'PK': 'USER#123', 'SK': 'PROFILE'}
        assert 'UpdateExpression' in call_args[1]
        assert 'ExpressionAttributeNames' in call_args[1]
        assert 'ExpressionAttributeValues' in call_args[1]
    
    @patch('app.core.database.get_dynamodb_table')
    def test_update_item_empty_updates(self, mock_get_table):
        """Test updating with empty updates dictionary."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        
        client = DynamoDBClient()
        result = client.update_item('USER#123', 'PROFILE', {})
        
        assert result is None
        mock_table.update_item.assert_not_called()
    
    @patch('app.core.database.get_dynamodb_table')
    def test_update_item_multiple_fields(self, mock_get_table):
        """Test updating multiple fields."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        updated_item = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'field1': 'value1',
            'field2': 'value2',
            'field3': 'value3'
        }
        mock_table.update_item.return_value = {'Attributes': updated_item}
        
        client = DynamoDBClient()
        updates = {
            'field1': 'value1',
            'field2': 'value2',
            'field3': 'value3'
        }
        result = client.update_item('USER#123', 'PROFILE', updates)
        
        assert result == updated_item
        call_args = mock_table.update_item.call_args
        # Check that update expression contains all fields
        update_expr = call_args[1]['UpdateExpression']
        assert '#attr0' in update_expr
        assert '#attr1' in update_expr
        assert '#attr2' in update_expr
    
    @patch('app.core.database.get_dynamodb_table')
    def test_delete_item(self, mock_get_table):
        """Test deleting an item."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        mock_table.delete_item.return_value = {'ResponseMetadata': {'HTTPStatusCode': 200}}
        
        client = DynamoDBClient()
        result = client.delete_item('USER#123', 'PROFILE')
        
        assert result['ResponseMetadata']['HTTPStatusCode'] == 200
        mock_table.delete_item.assert_called_once_with(
            Key={'PK': 'USER#123', 'SK': 'PROFILE'}
        )
    
    @patch('app.core.database.get_dynamodb_table')
    def test_batch_write_items(self, mock_get_table):
        """Test batch writing items."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        mock_batch_writer = MagicMock()
        mock_table.batch_writer.return_value.__enter__ = Mock(return_value=mock_batch_writer)
        mock_table.batch_writer.return_value.__exit__ = Mock(return_value=None)
        
        client = DynamoDBClient()
        items = [
            {'PK': 'USER#001', 'SK': 'PROFILE', 'name': 'User 1'},
            {'PK': 'USER#002', 'SK': 'PROFILE', 'name': 'User 2'},
            {'PK': 'USER#003', 'SK': 'PROFILE', 'name': 'User 3'}
        ]
        result = client.batch_write_items(items)
        
        assert result['ResponseMetadata']['HTTPStatusCode'] == 200
        # Verify each item was written
        assert mock_batch_writer.put_item.call_count == 3
        for i, item in enumerate(items):
            assert mock_batch_writer.put_item.call_args_list[i][1]['Item'] == item
    
    @patch('app.core.database.get_dynamodb_table')
    def test_batch_write_empty_items(self, mock_get_table):
        """Test batch writing with empty list."""
        mock_table = MagicMock()
        mock_get_table.return_value = mock_table
        mock_batch_writer = MagicMock()
        mock_table.batch_writer.return_value.__enter__ = Mock(return_value=mock_batch_writer)
        mock_table.batch_writer.return_value.__exit__ = Mock(return_value=None)
        
        client = DynamoDBClient()
        result = client.batch_write_items([])
        
        assert result['ResponseMetadata']['HTTPStatusCode'] == 200
        mock_batch_writer.put_item.assert_not_called()