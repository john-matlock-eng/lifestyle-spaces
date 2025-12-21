#!/usr/bin/env python3
"""
Backfill Vector Index Script

Indexes all existing journal entries to Pinecone for semantic search.
Run this script once to populate the index with existing data.

Usage:
    python scripts/backfill_vector_index.py [--space-id SPACE_ID] [--batch-size N] [--dry-run]

Arguments:
    --space-id    Optional: Only index journals from a specific space
    --batch-size  Number of journals to process per batch (default: 50)
    --dry-run     Show what would be indexed without actually indexing

Environment:
    PINECONE_API_KEY: Pinecone API key (required)
    AWS_REGION: AWS region for DynamoDB (default: us-east-1)
    DYNAMODB_TABLE: DynamoDB table name (default: lifestyle-spaces)
"""

import os
import sys
import asyncio
import argparse
import logging
from datetime import datetime
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3
from boto3.dynamodb.conditions import Key

from app.models.journal import JournalEntry
from app.services.journal_indexer import JournalIndexer
from app.services.vector_store import PineconeStore, IndexStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_all_journals(
    table,
    space_id: Optional[str] = None,
) -> List[dict]:
    """
    Fetch all journals from DynamoDB.

    Args:
        table: DynamoDB table resource.
        space_id: Optional space ID to filter by.

    Returns:
        List of journal items.
    """
    journals = []

    if space_id:
        # Query specific space
        logger.info(f"Querying journals for space: {space_id}")
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"SPACE#{space_id}")
            & Key("SK").begins_with("JOURNAL#")
        )
        journals.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = table.query(
                KeyConditionExpression=Key("PK").eq(f"SPACE#{space_id}")
                & Key("SK").begins_with("JOURNAL#"),
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            journals.extend(response.get("Items", []))
    else:
        # Scan all journals (less efficient but necessary for full backfill)
        logger.info("Scanning all journals in the table...")
        response = table.scan(
            FilterExpression=Key("SK").begins_with("JOURNAL#")
        )
        journals.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = table.scan(
                FilterExpression=Key("SK").begins_with("JOURNAL#"),
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            journals.extend(response.get("Items", []))

    return journals


def convert_to_journal_entry(item: dict) -> JournalEntry:
    """
    Convert a DynamoDB item to a JournalEntry.

    Args:
        item: DynamoDB item dictionary.

    Returns:
        JournalEntry instance.
    """
    # Parse datetime strings
    created_at = item.get("created_at", "")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    updated_at = item.get("updated_at", "")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))

    return JournalEntry(
        journal_id=item["journal_id"],
        space_id=item["space_id"],
        user_id=item["user_id"],
        title=item.get("title", ""),
        content=item.get("content", ""),
        content_tiptap=item.get("content_tiptap"),
        template_id=item.get("template_id"),
        framework_id=item.get("framework_id"),
        tags=item.get("tags", []),
        emotions=item.get("emotions", []),
        created_at=created_at,
        updated_at=updated_at,
        word_count=item.get("word_count", 0),
        is_pinned=item.get("is_pinned", False),
    )


async def backfill_index(
    space_id: Optional[str] = None,
    batch_size: int = 50,
    dry_run: bool = False,
) -> None:
    """
    Backfill the vector index with existing journals.

    Args:
        space_id: Optional space ID to filter by.
        batch_size: Number of journals per batch.
        dry_run: If True, don't actually index.
    """
    # Verify API key is available
    api_key = os.environ.get("PINECONE_API_KEY")
    if not api_key and not dry_run:
        logger.error("PINECONE_API_KEY environment variable is required")
        sys.exit(1)

    # Connect to DynamoDB
    region = os.environ.get("AWS_REGION", "us-east-1")
    table_name = os.environ.get("DYNAMODB_TABLE", "lifestyle-spaces")

    logger.info(f"Connecting to DynamoDB table: {table_name} in {region}")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    # Fetch journals
    logger.info("Fetching journals from DynamoDB...")
    items = get_all_journals(table, space_id)
    logger.info(f"Found {len(items)} journals to index")

    if not items:
        logger.info("No journals to index")
        return

    if dry_run:
        logger.info("DRY RUN - Would index the following journals:")
        for item in items[:10]:  # Show first 10
            logger.info(f"  - {item['journal_id']}: {item.get('title', 'Untitled')}")
        if len(items) > 10:
            logger.info(f"  ... and {len(items) - 10} more")
        return

    # Initialize indexer
    store = PineconeStore(api_key=api_key)
    indexer = JournalIndexer(vector_store=store)

    # Process in batches
    total_indexed = 0
    total_failed = 0

    for i in range(0, len(items), batch_size):
        batch = items[i : i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(items) + batch_size - 1) // batch_size

        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} journals)")

        # Convert to JournalEntry objects
        journals = []
        for item in batch:
            try:
                journal = convert_to_journal_entry(item)
                journals.append(journal)
            except Exception as e:
                logger.warning(f"Failed to convert journal {item.get('journal_id')}: {e}")
                total_failed += 1

        # Index the batch
        if journals:
            results = await indexer.index_journals(journals)

            # Count results
            for result in results:
                if result.status == IndexStatus.SUCCESS:
                    total_indexed += 1
                else:
                    total_failed += 1
                    logger.warning(f"Failed to index {result.document_id}: {result.error}")

        logger.info(f"Batch {batch_num} complete. Total indexed: {total_indexed}")

    # Summary
    logger.info("=" * 50)
    logger.info("BACKFILL COMPLETE")
    logger.info(f"Total journals found: {len(items)}")
    logger.info(f"Successfully indexed: {total_indexed}")
    logger.info(f"Failed: {total_failed}")
    logger.info("=" * 50)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Backfill vector index with existing journal entries"
    )
    parser.add_argument(
        "--space-id",
        type=str,
        help="Only index journals from this space",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of journals per batch (default: 50)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be indexed without actually indexing",
    )

    args = parser.parse_args()

    asyncio.run(
        backfill_index(
            space_id=args.space_id,
            batch_size=args.batch_size,
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    main()
