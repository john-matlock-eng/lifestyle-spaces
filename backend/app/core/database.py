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