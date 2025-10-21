"""
Quick script to check invite codes in DynamoDB.
"""
import boto3
import os
from boto3.dynamodb.conditions import Key

# Get table name from environment or use default
table_name = os.getenv('DYNAMODB_TABLE', 'lifestyle-spaces-dev')

# Create DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table(table_name)

print(f"Checking invite codes in table: {table_name}\n")

# Scan for all spaces
response = table.scan(
    FilterExpression='begins_with(SK, :sk)',
    ExpressionAttributeValues={
        ':sk': 'METADATA'
    }
)

spaces = response.get('Items', [])
print(f"Found {len(spaces)} spaces:\n")

for space in spaces:
    space_id = space.get('id', 'N/A')
    space_name = space.get('name', 'N/A')
    invite_code = space.get('invite_code', None)
    inviteCode = space.get('inviteCode', None)  # Check camelCase too

    print(f"Space: {space_name} (ID: {space_id})")
    print(f"  invite_code: {invite_code}")
    print(f"  inviteCode: {inviteCode}")

    # Print all keys to see what fields exist
    print(f"  All fields: {list(space.keys())}")
    print()
