"""
Tests for error handling in database.py.

These tests cover error handling paths in:
- app/core/database.py (lines 60-68, 218-245)
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError


class TestDatabaseErrorHandling:
    """Test error handling in DynamoDB client."""

    def setup_method(self):
        """Set up test environment."""
        # We'll create a fresh DynamoDB client for each test
        pass

    # Test ResourceNotFoundException handling in put_item (lines 60-68)
    def test_put_item_resource_not_found_exception(self):
        """Test that put_item raises RuntimeError for ResourceNotFoundException."""
        from app.core.database import DynamoDBClient
        from app.core.config import settings

        # Create client
        db_client = DynamoDBClient()

        # Mock the table's put_item to raise ResourceNotFoundException
        mock_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'ResourceNotFoundException',
                    'Message': 'Table not found'
                }
            },
            operation_name='PutItem'
        )

        with patch.object(db_client.table, 'put_item', side_effect=mock_error):
            # Should raise RuntimeError with helpful message
            with pytest.raises(RuntimeError) as exc_info:
                db_client.put_item({"PK": "TEST", "SK": "TEST"})

            # Check error message includes table name
            assert settings.dynamodb_table in str(exc_info.value)
            assert "not found" in str(exc_info.value).lower()
            assert "Please ensure the table exists" in str(exc_info.value)

    def test_put_item_other_client_error(self):
        """Test that put_item re-raises non-ResourceNotFoundException errors."""
        from app.core.database import DynamoDBClient

        # Create client
        db_client = DynamoDBClient()

        # Mock the table's put_item to raise a different error
        mock_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'ValidationException',
                    'Message': 'Invalid item'
                }
            },
            operation_name='PutItem'
        )

        with patch.object(db_client.table, 'put_item', side_effect=mock_error):
            # Should re-raise the original error
            with pytest.raises(ClientError) as exc_info:
                db_client.put_item({"PK": "TEST", "SK": "TEST"})

            # Check it's the validation error
            assert exc_info.value.response['Error']['Code'] == 'ValidationException'

    def test_put_item_exception_without_response(self):
        """Test put_item handles exception without response attribute."""
        from app.core.database import DynamoDBClient

        # Create client
        db_client = DynamoDBClient()

        # Mock the table's put_item to raise exception without response
        with patch.object(db_client.table, 'put_item', side_effect=Exception("Generic error")):
            # Should re-raise the original error
            with pytest.raises(Exception) as exc_info:
                db_client.put_item({"PK": "TEST", "SK": "TEST"})

            assert "Generic error" in str(exc_info.value)

    def test_put_item_success(self):
        """Test successful put_item operation."""
        from app.core.database import DynamoDBClient

        # Create client
        db_client = DynamoDBClient()

        # Mock successful put_item
        expected_response = {
            'ResponseMetadata': {
                'HTTPStatusCode': 200
            }
        }

        with patch.object(db_client.table, 'put_item', return_value=expected_response):
            result = db_client.put_item({"PK": "TEST", "SK": "TEST", "data": "value"})

            assert result == expected_response

    # Test error handling in batch_get_items (lines 218-245)
    def test_batch_get_items_empty_keys(self):
        """Test batch_get_items with empty keys list."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Should return empty list for empty keys
        result = db_client.batch_get_items([])
        assert result == []

    def test_batch_get_items_success(self):
        """Test successful batch_get_items operation."""
        from app.core.database import DynamoDBClient
        from app.core.config import settings

        db_client = DynamoDBClient()

        # Mock boto3 client
        mock_client = Mock()
        mock_response = {
            'Responses': {
                settings.dynamodb_table: [
                    {
                        'PK': {'S': 'USER#123'},
                        'SK': {'S': 'PROFILE'},
                        'email': {'S': 'test@example.com'},
                        'name': {'S': 'Test User'}
                    },
                    {
                        'PK': {'S': 'USER#456'},
                        'SK': {'S': 'PROFILE'},
                        'email': {'S': 'test2@example.com'},
                        'name': {'S': 'Test User 2'}
                    }
                ]
            }
        }
        mock_client.batch_get_item.return_value = mock_response

        with patch('boto3.client', return_value=mock_client):
            keys = [
                {'PK': 'USER#123', 'SK': 'PROFILE'},
                {'PK': 'USER#456', 'SK': 'PROFILE'}
            ]
            result = db_client.batch_get_items(keys)

            # Should deserialize and return items
            assert len(result) == 2
            assert result[0]['PK'] == 'USER#123'
            assert result[0]['email'] == 'test@example.com'
            assert result[1]['PK'] == 'USER#456'
            assert result[1]['email'] == 'test2@example.com'

    def test_batch_get_items_no_responses(self):
        """Test batch_get_items when no items are found."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Mock boto3 client with empty response
        mock_client = Mock()
        mock_response = {'Responses': {}}
        mock_client.batch_get_item.return_value = mock_response

        with patch('boto3.client', return_value=mock_client):
            keys = [{'PK': 'NONEXISTENT#123', 'SK': 'PROFILE'}]
            result = db_client.batch_get_items(keys)

            # Should return empty list
            assert result == []

    def test_batch_get_items_partial_responses(self):
        """Test batch_get_items with partial responses."""
        from app.core.database import DynamoDBClient
        from app.core.config import settings

        db_client = DynamoDBClient()

        # Mock boto3 client with partial response
        mock_client = Mock()
        mock_response = {
            'Responses': {
                settings.dynamodb_table: [
                    {
                        'PK': {'S': 'USER#123'},
                        'SK': {'S': 'PROFILE'},
                        'email': {'S': 'test@example.com'}
                    }
                ]
            }
        }
        mock_client.batch_get_item.return_value = mock_response

        with patch('boto3.client', return_value=mock_client):
            # Request 2 items, but only 1 is found
            keys = [
                {'PK': 'USER#123', 'SK': 'PROFILE'},
                {'PK': 'USER#999', 'SK': 'PROFILE'}  # Doesn't exist
            ]
            result = db_client.batch_get_items(keys)

            # Should return only the found item
            assert len(result) == 1
            assert result[0]['PK'] == 'USER#123'

    def test_batch_get_items_with_complex_types(self):
        """Test batch_get_items with complex DynamoDB types."""
        from app.core.database import DynamoDBClient
        from app.core.config import settings

        db_client = DynamoDBClient()

        # Mock boto3 client with complex data types
        mock_client = Mock()
        mock_response = {
            'Responses': {
                settings.dynamodb_table: [
                    {
                        'PK': {'S': 'SPACE#123'},
                        'SK': {'S': 'DETAILS'},
                        'name': {'S': 'My Space'},
                        'member_count': {'N': '5'},
                        'is_active': {'BOOL': True},
                        'tags': {'L': [{'S': 'home'}, {'S': 'office'}]},
                        'metadata': {'M': {
                            'created_by': {'S': 'user123'},
                            'version': {'N': '1'}
                        }}
                    }
                ]
            }
        }
        mock_client.batch_get_item.return_value = mock_response

        with patch('boto3.client', return_value=mock_client):
            keys = [{'PK': 'SPACE#123', 'SK': 'DETAILS'}]
            result = db_client.batch_get_items(keys)

            # Should properly deserialize all types
            assert len(result) == 1
            assert result[0]['name'] == 'My Space'
            assert result[0]['member_count'] == 5
            assert result[0]['is_active'] is True
            assert result[0]['tags'] == ['home', 'office']
            assert result[0]['metadata']['created_by'] == 'user123'
            assert result[0]['metadata']['version'] == 1

    def test_batch_get_items_client_error(self):
        """Test batch_get_items handles client errors."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Mock boto3 client to raise error
        mock_client = Mock()
        mock_error = ClientError(
            error_response={
                'Error': {
                    'Code': 'ProvisionedThroughputExceededException',
                    'Message': 'Rate exceeded'
                }
            },
            operation_name='BatchGetItem'
        )
        mock_client.batch_get_item.side_effect = mock_error

        with patch('boto3.client', return_value=mock_client):
            keys = [{'PK': 'USER#123', 'SK': 'PROFILE'}]

            # Should raise the client error
            with pytest.raises(ClientError) as exc_info:
                db_client.batch_get_items(keys)

            assert exc_info.value.response['Error']['Code'] == 'ProvisionedThroughputExceededException'

    def test_batch_get_items_deserializer_error(self):
        """Test batch_get_items handles deserialization errors gracefully."""
        from app.core.database import DynamoDBClient
        from app.core.config import settings

        db_client = DynamoDBClient()

        # Mock boto3 client with invalid DynamoDB format
        mock_client = Mock()
        mock_response = {
            'Responses': {
                settings.dynamodb_table: [
                    {
                        'PK': {'S': 'USER#123'},
                        'invalid_type': {'INVALID': 'value'}  # Invalid DynamoDB type
                    }
                ]
            }
        }
        mock_client.batch_get_item.return_value = mock_response

        with patch('boto3.client', return_value=mock_client):
            keys = [{'PK': 'USER#123', 'SK': 'PROFILE'}]

            # Should raise an error during deserialization
            with pytest.raises(Exception):
                db_client.batch_get_items(keys)

    # Additional coverage for other database methods
    def test_scan_with_all_parameters(self):
        """Test scan with all optional parameters."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Mock table scan
        mock_response = {'Items': [{'PK': 'TEST', 'SK': 'TEST'}]}

        with patch.object(db_client.table, 'scan', return_value=mock_response) as mock_scan:
            result = db_client.scan(
                filter_expression="status = :status",
                expression_attribute_values={":status": "active"},
                expression_attribute_names={"#n": "name"}
            )

            # Verify scan was called with correct parameters
            mock_scan.assert_called_once()
            call_kwargs = mock_scan.call_args[1]
            assert 'FilterExpression' in call_kwargs
            assert 'ExpressionAttributeValues' in call_kwargs
            assert 'ExpressionAttributeNames' in call_kwargs
            assert result == [{'PK': 'TEST', 'SK': 'TEST'}]

    def test_update_item_empty_updates(self):
        """Test update_item with empty updates dict."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Should return None for empty updates
        result = db_client.update_item("PK#123", "SK#123", {})
        assert result is None

    def test_update_item_with_reserved_keywords(self):
        """Test update_item handles reserved keywords properly."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Mock table update_item
        mock_response = {
            'Attributes': {
                'PK': 'USER#123',
                'SK': 'PROFILE',
                'name': 'Updated Name',
                'status': 'active'
            }
        }

        with patch.object(db_client.table, 'update_item', return_value=mock_response) as mock_update:
            # Use 'name' and 'status' which might be reserved keywords
            result = db_client.update_item(
                "USER#123",
                "PROFILE",
                {"name": "Updated Name", "status": "active"}
            )

            # Verify update was called with attribute names
            mock_update.assert_called_once()
            call_kwargs = mock_update.call_args[1]
            assert 'ExpressionAttributeNames' in call_kwargs
            assert 'ExpressionAttributeValues' in call_kwargs
            assert result == mock_response['Attributes']

    def test_query_with_index(self):
        """Test query with GSI index."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Mock table query
        mock_response = {'Items': [{'PK': 'USER#test@example.com', 'SK': 'INVITATION#pending'}]}

        with patch.object(db_client.table, 'query', return_value=mock_response) as mock_query:
            result = db_client.query(
                pk="USER#test@example.com",
                sk_prefix="INVITATION#",
                index_name="GSI1"
            )

            # Verify query was called with index
            mock_query.assert_called_once()
            call_kwargs = mock_query.call_args[1]
            assert call_kwargs['IndexName'] == "GSI1"
            assert result == [{'PK': 'USER#test@example.com', 'SK': 'INVITATION#pending'}]

    def test_batch_write_items(self):
        """Test batch_write_items operation."""
        from app.core.database import DynamoDBClient

        db_client = DynamoDBClient()

        # Mock batch writer context manager
        mock_batch_writer = MagicMock()
        mock_batch_writer.__enter__.return_value = mock_batch_writer
        mock_batch_writer.__exit__.return_value = None

        with patch.object(db_client.table, 'batch_writer', return_value=mock_batch_writer):
            items = [
                {'PK': 'USER#1', 'SK': 'PROFILE', 'name': 'User 1'},
                {'PK': 'USER#2', 'SK': 'PROFILE', 'name': 'User 2'}
            ]
            result = db_client.batch_write_items(items)

            # Verify batch writer was used
            assert mock_batch_writer.put_item.call_count == 2
            assert result['ResponseMetadata']['HTTPStatusCode'] == 200
