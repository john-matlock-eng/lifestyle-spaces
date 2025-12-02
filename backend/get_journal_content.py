"""
Script to fetch and display journal content for debugging
"""
import boto3
import os
import json
from decimal import Decimal

# Custom JSON encoder to handle Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Get table name from environment or use default
table_name = os.getenv('DYNAMODB_TABLE_NAME', 'lifestyle-spaces-dev')

# Create DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table(table_name)

print("=" * 80)
print("JOURNAL CONTENT FETCHER")
print("=" * 80)

# You'll need to provide these values
space_id = input("Enter Space ID: ").strip()
journal_id = input("Enter Journal ID: ").strip()

print(f"\nFetching journal from DynamoDB...")
print(f"  Table: {table_name}")
print(f"  Space: {space_id}")
print(f"  Journal: {journal_id}")

try:
    response = table.get_item(
        Key={
            'PK': f'SPACE#{space_id}',
            'SK': f'JOURNAL#{journal_id}'
        }
    )

    if 'Item' not in response:
        print("\n❌ Journal not found!")
        exit(1)

    journal = response['Item']

    print("\n" + "=" * 80)
    print("MARKDOWN CONTENT FIELD:")
    print("=" * 80)
    print(journal.get('content', '(empty)'))

    print("\n" + "=" * 80)
    print("CONTENT_TIPTAP FIELD:")
    print("=" * 80)

    if 'content_tiptap' in journal:
        tiptap = journal['content_tiptap']
        if isinstance(tiptap, dict):
            print(f"\nKeys in content_tiptap: {list(tiptap.keys())}")
            print(f"\nFull content_tiptap structure:")
            print(json.dumps(tiptap, indent=2, cls=DecimalEncoder))
        else:
            print(f"\ncontent_tiptap type: {type(tiptap)}")
            print(tiptap)
    else:
        print("(not present - needs migration)")

    print("\n" + "=" * 80)
    print("TEMPLATE INFO:")
    print("=" * 80)
    print(f"Template ID: {journal.get('template_id', 'None')}")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
