"""
DynamoDB database client and utilities.
"""
from typing import Optional
import boto3
from boto3.dynamodb.conditions import Key
from functools import lru_cache
from app.core.config import settings


@lru_cache(maxsize=1)
def get_dynamodb_resource():
    """
    Get DynamoDB resource (cached singleton).
    
    Returns:
        DynamoDB resource
    """
    return boto3.resource(
        'dynamodb',
        region_name=settings.aws_region
    )


def get_dynamodb_table():
    """
    Get DynamoDB table instance.
    
    Returns:
        DynamoDB Table resource
    """
    dynamodb = get_dynamodb_resource()
    return dynamodb.Table(settings.dynamodb_table)


class DynamoDBClient:
    """
    DynamoDB client for single table design operations.
    """
    
    def __init__(self):
        """Initialize DynamoDB client."""
        self.table = get_dynamodb_table()
    
    def put_item(self, item: dict) -> dict:
        """
        Put an item into the DynamoDB table.
        
        Args:
            item: Item to put into the table
        
        Returns:
            dict: Response from DynamoDB
        """
        return self.table.put_item(Item=item)
    
    def get_item(self, pk: str, sk: str) -> Optional[dict]:
        """
        Get an item from the DynamoDB table.
        
        Args:
            pk: Partition key
            sk: Sort key
        
        Returns:
            Optional[dict]: Item if found, None otherwise
        """
        response = self.table.get_item(
            Key={'PK': pk, 'SK': sk}
        )
        return response.get('Item')
    
    def query(self, pk: str, sk_prefix: Optional[str] = None, index_name: Optional[str] = None) -> list:
        """
        Query items from the DynamoDB table.
        
        Args:
            pk: Partition key
            sk_prefix: Optional sort key prefix for filtering
            index_name: Optional GSI name to query
        
        Returns:
            list: List of items matching the query
        """
        kwargs = {
            'KeyConditionExpression': Key('PK').eq(pk)
        }
        
        if sk_prefix:
            kwargs['KeyConditionExpression'] = kwargs['KeyConditionExpression'] & Key('SK').begins_with(sk_prefix)
        
        if index_name:
            kwargs['IndexName'] = index_name
        
        response = self.table.query(**kwargs)
        return response.get('Items', [])
    
    def update_item(self, pk: str, sk: str, updates: dict) -> Optional[dict]:
        """
        Update an item in the DynamoDB table.
        
        Args:
            pk: Partition key
            sk: Sort key
            updates: Dictionary of fields to update
        
        Returns:
            Optional[dict]: Updated item if successful, None otherwise
        """
        if not updates:
            return None
            
        # Build update expression
        update_expression = "SET "
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        for i, (key, value) in enumerate(updates.items()):
            # Use attribute names to handle reserved keywords
            attr_name = f"#attr{i}"
            attr_value = f":val{i}"
            
            if i > 0:
                update_expression += ", "
            update_expression += f"{attr_name} = {attr_value}"
            
            expression_attribute_names[attr_name] = key
            expression_attribute_values[attr_value] = value
        
        response = self.table.update_item(
            Key={'PK': pk, 'SK': sk},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )
        
        return response.get('Attributes')
    
    def delete_item(self, pk: str, sk: str) -> dict:
        """
        Delete an item from the DynamoDB table.
        
        Args:
            pk: Partition key
            sk: Sort key
        
        Returns:
            dict: Response from DynamoDB
        """
        return self.table.delete_item(
            Key={'PK': pk, 'SK': sk}
        )
    
    def batch_write_items(self, items: list) -> dict:
        """
        Batch write items to the DynamoDB table.
        
        Args:
            items: List of items to write
        
        Returns:
            dict: Response from DynamoDB
        """
        with self.table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)
        
        return {'ResponseMetadata': {'HTTPStatusCode': 200}}
    
    def batch_get_items(self, keys: list) -> list:
        """
        Batch get items from the DynamoDB table.
        
        Args:
            keys: List of key dictionaries with PK and SK
        
        Returns:
            list: List of items found
        """
        if not keys:
            return []
        
        # DynamoDB batch_get_item requires the table name in the request
        response = boto3.client('dynamodb', region_name=settings.aws_region).batch_get_item(
            RequestItems={
                settings.dynamodb_table: {
                    'Keys': [
                        {
                            'PK': {'S': key['PK']},
                            'SK': {'S': key['SK']}
                        }
                        for key in keys
                    ]
                }
            }
        )
        
        # Convert DynamoDB format to regular format
        items = []
        for item in response.get('Responses', {}).get(settings.dynamodb_table, []):
            # Use boto3's TypeDeserializer to convert DynamoDB format to Python
            from boto3.dynamodb.types import TypeDeserializer
            deserializer = TypeDeserializer()
            python_item = {k: deserializer.deserialize(v) for k, v in item.items()}
            items.append(python_item)
        
        return items


# Singleton instance
_db_client: Optional[DynamoDBClient] = None


def get_db() -> DynamoDBClient:
    """
    Get DynamoDB client instance (singleton).
    
    Returns:
        DynamoDBClient: Database client instance
    """
    global _db_client
    if _db_client is None:
        _db_client = DynamoDBClient()
    return _db_client