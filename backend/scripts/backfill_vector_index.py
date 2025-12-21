#!/usr/bin/env python3
"""
Backfill Vector Index

Re-indexes existing journals with section-level vectors.

Usage:
    python -m scripts.backfill_vector_index --space-id <space_id>
    python -m scripts.backfill_vector_index --all
    python -m scripts.backfill_vector_index --stats
    python -m scripts.backfill_vector_index --dry-run --all

Arguments:
    --space-id    Index journals from a specific space
    --all         Index all journals from all spaces
    --stats       Show index statistics
    --dry-run     Show what would be indexed without indexing
    --batch-size  Number of journals per batch (default: 50)

Environment:
    PINECONE_API_KEY: Pinecone API key (required for indexing)
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
from boto3.dynamodb.conditions import Key, Attr

from app.models.journal import JournalEntry
from app.services.journal_indexer import get_journal_indexer, reset_journal_indexer
from app.services.vector_store import get_vector_store, reset_vector_store

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_all_spaces(table) -> List[dict]:
    """Fetch all spaces from DynamoDB."""
    spaces = []

    response = table.scan(
        FilterExpression=Attr("entityType").eq("Space")
    )
    spaces.extend(response.get("Items", []))

    while "LastEvaluatedKey" in response:
        response = table.scan(
            FilterExpression=Attr("entityType").eq("Space"),
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        spaces.extend(response.get("Items", []))

    return spaces


def get_space_journals(table, space_id: str) -> List[dict]:
    """Fetch all journals for a space from DynamoDB."""
    journals = []

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

    return journals


def convert_to_journal_entry(item: dict) -> JournalEntry:
    """Convert a DynamoDB item to a JournalEntry."""
    # Handle camelCase field names from DynamoDB
    journal_id = item.get("journal_id") or item.get("journalId")
    space_id = item.get("space_id") or item.get("spaceId")
    user_id = item.get("user_id") or item.get("userId")
    template_id = item.get("template_id") or item.get("templateId")
    framework_id = item.get("framework_id") or item.get("frameworkId")
    created_at = item.get("created_at") or item.get("createdAt")
    updated_at = item.get("updated_at") or item.get("updatedAt")
    word_count = item.get("word_count") or item.get("wordCount", 0)
    is_pinned = item.get("is_pinned") or item.get("isPinned", False)
    content_tiptap = item.get("content_tiptap") or item.get("contentTiptap")

    # Parse datetime strings
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))

    return JournalEntry(
        journal_id=journal_id,
        space_id=space_id,
        user_id=user_id,
        title=item.get("title", ""),
        content=item.get("content", ""),
        content_tiptap=content_tiptap,
        template_id=template_id,
        framework_id=framework_id,
        tags=item.get("tags", []),
        emotions=item.get("emotions", []),
        created_at=created_at,
        updated_at=updated_at,
        word_count=int(word_count) if word_count else 0,
        is_pinned=bool(is_pinned),
    )


async def backfill_space(
    space_id: str,
    table,
    dry_run: bool = False
) -> dict:
    """Backfill all journals in a single space with section-level indexing."""
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Backfilling space: {space_id}")

    items = get_space_journals(table, space_id)

    if not items:
        logger.info(f"No journals found in space {space_id}")
        return {"journals": 0, "sections": 0}

    logger.info(f"Found {len(items)} journals to index")

    if dry_run:
        logger.info(f"[DRY RUN] Would index {len(items)} journals:")
        for item in items[:5]:
            title = item.get("title", "Untitled")
            jid = item.get("journal_id") or item.get("journalId")
            logger.info(f"  - {jid}: {title}")
        if len(items) > 5:
            logger.info(f"  ... and {len(items) - 5} more")
        return {"journals": len(items), "sections": 0}

    indexer = get_journal_indexer()
    total_sections = 0
    journals_indexed = 0

    for item in items:
        try:
            journal = convert_to_journal_entry(item)
            count = await indexer.index_journal(journal)
            total_sections += count
            journals_indexed += 1
            logger.info(
                f"  Indexed {count} sections: {journal.title or journal.journal_id}"
            )
        except Exception as e:
            jid = item.get("journal_id") or item.get("journalId")
            logger.warning(f"  Failed to index journal {jid}: {e}")

    logger.info(
        f"Space {space_id}: indexed {total_sections} sections "
        f"from {journals_indexed} journals"
    )
    return {"journals": journals_indexed, "sections": total_sections}


async def backfill_all(table, dry_run: bool = False) -> dict:
    """Backfill all spaces."""
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Backfilling ALL spaces...")

    spaces = get_all_spaces(table)
    logger.info(f"Found {len(spaces)} spaces")

    total_journals = 0
    total_sections = 0

    for space in spaces:
        space_id = space.get("space_id") or space.get("spaceId")
        if space_id:
            result = await backfill_space(space_id, table, dry_run=dry_run)
            total_journals += result["journals"]
            total_sections += result["sections"]

    logger.info("=" * 50)
    logger.info("BACKFILL COMPLETE")
    logger.info(f"Total spaces: {len(spaces)}")
    logger.info(f"Total journals: {total_journals}")
    logger.info(f"Total sections indexed: {total_sections}")
    logger.info("=" * 50)

    return {
        "spaces": len(spaces),
        "journals": total_journals,
        "sections": total_sections
    }


async def get_stats():
    """Print index statistics."""
    store = get_vector_store()
    stats = await store.get_stats()

    print("\n=== Vector Index Statistics ===")
    print(f"Total records (sections): {stats.get('total_record_count', 0)}")
    print(f"Dimension: {stats.get('dimension', 'N/A')}")
    print("\nNamespaces:")

    for ns_name, ns_data in stats.get("namespaces", {}).items():
        print(f"  {ns_name}: {ns_data.get('record_count', 0)} sections")

    print("================================\n")


async def main_async(args):
    """Async main function."""
    # Initialize DynamoDB
    region = os.environ.get("AWS_REGION", "us-east-1")
    table_name = os.environ.get("DYNAMODB_TABLE", "lifestyle-spaces")

    if args.stats:
        await get_stats()
        return

    # Verify API key for indexing operations
    if not args.dry_run:
        api_key = os.environ.get("PINECONE_API_KEY")
        if not api_key:
            logger.error("PINECONE_API_KEY environment variable is required")
            sys.exit(1)

    logger.info(f"Connecting to DynamoDB table: {table_name} in {region}")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    if args.space_id:
        await backfill_space(args.space_id, table, dry_run=args.dry_run)
    elif args.all:
        await backfill_all(table, dry_run=args.dry_run)
    else:
        logger.error("Please specify --space-id or --all")
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Backfill journal sections into vector index"
    )
    parser.add_argument(
        "--space-id",
        help="Space ID to backfill"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Backfill all spaces"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be indexed"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show index statistics"
    )

    args = parser.parse_args()

    if not args.stats and not args.space_id and not args.all:
        parser.print_help()
        sys.exit(1)

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
