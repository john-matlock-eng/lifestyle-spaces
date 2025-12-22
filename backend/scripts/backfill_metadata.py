#!/usr/bin/env python3
"""
Backfill AI Metadata

Generates AI metadata (synopsis, themes, insights, sentiment) for existing journals.

Usage:
    python -m scripts.backfill_metadata --journal-id <journal_id> --space-id <space_id>
    python -m scripts.backfill_metadata --space-id <space_id>
    python -m scripts.backfill_metadata --all
    python -m scripts.backfill_metadata --stats
    python -m scripts.backfill_metadata --dry-run --all
    python -m scripts.backfill_metadata --force --space-id <space_id>

Arguments:
    --journal-id  Generate metadata for a specific journal (requires --space-id)
    --space-id    Generate metadata for journals in a specific space
    --all         Generate metadata for all journals
    --stats       Show metadata generation statistics
    --dry-run     Show what would be generated without calling Claude API
    --force       Regenerate metadata even if it already exists
    --batch-size  Number of journals per batch (default: 10)
    --delay       Delay between API calls in seconds (default: 0.5)

Environment:
    ANTHROPIC_API_KEY: Anthropic API key (required)
    AWS_REGION: AWS region for DynamoDB (default: us-east-1)
    DYNAMODB_TABLE: DynamoDB table name (default: lifestyle-spaces)
"""

import os
import sys
import asyncio
import argparse
import logging
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3
from boto3.dynamodb.conditions import Key, Attr

from app.models.ai_metadata import JournalAIMetadata
from app.services.metadata_generator import get_metadata_generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class DecimalEncoder:
    """Helper to handle DynamoDB Decimal types."""

    @staticmethod
    def convert(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return obj


def get_dynamodb_table():
    """Get DynamoDB table resource."""
    region = os.getenv("AWS_REGION", "us-east-1")
    table_name = os.getenv("DYNAMODB_TABLE", "lifestyle-spaces")

    dynamodb = boto3.resource("dynamodb", region_name=region)
    return dynamodb.Table(table_name)


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


def get_single_journal(table, space_id: str, journal_id: str) -> Optional[dict]:
    """Fetch a single journal from DynamoDB."""
    response = table.get_item(
        Key={
            "PK": f"SPACE#{space_id}",
            "SK": f"JOURNAL#{journal_id}",
        }
    )
    return response.get("Item")


def update_journal_metadata(
    table, space_id: str, journal_id: str, metadata: JournalAIMetadata
) -> bool:
    """Update a journal's AI metadata in DynamoDB."""
    try:
        metadata_dict = metadata.model_dump(by_alias=True)

        # Convert datetime to ISO string
        if "generatedAt" in metadata_dict and metadata_dict["generatedAt"]:
            metadata_dict["generatedAt"] = metadata_dict["generatedAt"].isoformat()

        table.update_item(
            Key={
                "PK": f"SPACE#{space_id}",
                "SK": f"JOURNAL#{journal_id}",
            },
            UpdateExpression="SET ai_metadata = :metadata, updated_at = :updated",
            ExpressionAttributeValues={
                ":metadata": metadata_dict,
                ":updated": datetime.now(timezone.utc).isoformat(),
            },
        )
        return True
    except Exception as e:
        logger.error(f"Failed to update metadata for journal {journal_id}: {e}")
        return False


async def generate_metadata_for_journal(
    generator,
    journal: dict,
    dry_run: bool = False
) -> Optional[JournalAIMetadata]:
    """Generate metadata for a single journal."""
    journal_id = journal.get("journal_id", "")
    title = journal.get("title", "Untitled")

    # Get both content formats
    content = journal.get("content", "")
    content_tiptap = journal.get("content_tiptap") or journal.get("contentTiptap")

    # Check if we have enough content
    has_content = False
    if content_tiptap:
        has_content = True
    elif content and len(str(content)) >= 50:
        has_content = True

    if not has_content:
        logger.warning(f"Skipping {journal_id}: insufficient content")
        return None

    if dry_run:
        logger.info(f"[DRY RUN] Would generate metadata for: {title[:50]}")
        return None

    try:
        metadata = await generator.generate_metadata(
            journal_id=journal_id,
            title=title,
            content=content,
            template_id=journal.get("template_id"),
            content_tiptap=content_tiptap,
        )
        return metadata
    except Exception as e:
        logger.error(f"Failed to generate metadata for {journal_id}: {e}")
        return None


async def backfill_single_journal(
    table,
    space_id: str,
    journal_id: str,
    force: bool = False,
    dry_run: bool = False,
) -> Dict[str, int]:
    """Backfill metadata for a single journal."""
    generator = get_metadata_generator()
    journal = get_single_journal(table, space_id, journal_id)

    if not journal:
        logger.error(f"Journal {journal_id} not found in space {space_id}")
        return {"total": 0, "processed": 0, "skipped": 0, "failed": 1}

    # Check if metadata already exists
    if journal.get("ai_metadata") and not force:
        logger.info(f"Journal already has metadata (use --force to regenerate)")
        return {"total": 1, "processed": 0, "skipped": 1, "failed": 0, "already_has_metadata": 1}

    logger.info(f"Processing journal: {journal.get('title', 'Untitled')}")

    # Generate metadata
    metadata = await generate_metadata_for_journal(generator, journal, dry_run)

    if dry_run:
        return {"total": 1, "processed": 1, "skipped": 0, "failed": 0}

    if metadata:
        if update_journal_metadata(table, space_id, journal_id, metadata):
            logger.info(f"✓ Generated metadata:")
            logger.info(f"  Synopsis: {metadata.synopsis[:100]}...")
            logger.info(f"  Themes: {', '.join(metadata.themes)}")
            logger.info(f"  Sentiment: {metadata.sentiment}")
            return {"total": 1, "processed": 1, "skipped": 0, "failed": 0}

    return {"total": 1, "processed": 0, "skipped": 0, "failed": 1}


async def backfill_space(
    table,
    space_id: str,
    force: bool = False,
    dry_run: bool = False,
    batch_size: int = 10,
    delay: float = 0.5,
) -> Dict[str, int]:
    """Backfill metadata for all journals in a space."""
    generator = get_metadata_generator()
    journals = get_space_journals(table, space_id)

    stats = {
        "total": len(journals),
        "processed": 0,
        "skipped": 0,
        "failed": 0,
        "already_has_metadata": 0,
    }

    logger.info(f"Processing space {space_id}: {len(journals)} journals")

    for i, journal in enumerate(journals):
        journal_id = journal.get("journal_id", "")

        # Check if metadata already exists
        if journal.get("ai_metadata") and not force:
            stats["already_has_metadata"] += 1
            stats["skipped"] += 1
            continue

        # Generate metadata
        metadata = await generate_metadata_for_journal(generator, journal, dry_run)

        if dry_run:
            stats["processed"] += 1
            continue

        if metadata:
            # Save to DynamoDB
            if update_journal_metadata(table, space_id, journal_id, metadata):
                stats["processed"] += 1
                logger.info(
                    f"[{i+1}/{len(journals)}] Generated metadata for: "
                    f"{journal.get('title', 'Untitled')[:40]}"
                )
            else:
                stats["failed"] += 1
        else:
            stats["failed"] += 1

        # Rate limiting delay
        if delay > 0 and i < len(journals) - 1:
            time.sleep(delay)

    return stats


async def backfill_all(
    table,
    force: bool = False,
    dry_run: bool = False,
    batch_size: int = 10,
    delay: float = 0.5,
) -> Dict[str, int]:
    """Backfill metadata for all journals in all spaces."""
    spaces = get_all_spaces(table)
    logger.info(f"Found {len(spaces)} spaces to process")

    total_stats = {
        "total": 0,
        "processed": 0,
        "skipped": 0,
        "failed": 0,
        "already_has_metadata": 0,
        "spaces_processed": 0,
    }

    for space in spaces:
        space_id = space.get("space_id", "")
        if not space_id:
            continue

        stats = await backfill_space(
            table, space_id, force, dry_run, batch_size, delay
        )

        total_stats["total"] += stats["total"]
        total_stats["processed"] += stats["processed"]
        total_stats["skipped"] += stats["skipped"]
        total_stats["failed"] += stats["failed"]
        total_stats["already_has_metadata"] += stats["already_has_metadata"]
        total_stats["spaces_processed"] += 1

    return total_stats


def show_stats(table) -> None:
    """Show metadata statistics across all journals."""
    spaces = get_all_spaces(table)

    total_journals = 0
    with_metadata = 0
    without_metadata = 0

    for space in spaces:
        space_id = space.get("space_id", "")
        if not space_id:
            continue

        journals = get_space_journals(table, space_id)
        total_journals += len(journals)

        for journal in journals:
            if journal.get("ai_metadata"):
                with_metadata += 1
            else:
                without_metadata += 1

    logger.info("=" * 50)
    logger.info("AI METADATA STATISTICS")
    logger.info("=" * 50)
    logger.info(f"Total spaces:    {len(spaces)}")
    logger.info(f"Total journals:  {total_journals}")
    logger.info(f"With metadata:   {with_metadata}")
    logger.info(f"Without metadata: {without_metadata}")
    if total_journals > 0:
        coverage = (with_metadata / total_journals) * 100
        logger.info(f"Coverage:        {coverage:.1f}%")
    logger.info("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="Backfill AI metadata for existing journals"
    )
    parser.add_argument(
        "--journal-id",
        help="Journal ID to backfill (requires --space-id)",
    )
    parser.add_argument(
        "--space-id",
        help="Space ID to backfill",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Backfill all spaces",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show metadata statistics",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate metadata even if it exists",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Journals per batch (default: 10)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between API calls in seconds (default: 0.5)",
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.stats and not args.space_id and not args.all:
        parser.error("Must specify --space-id, --all, or --stats")

    if args.journal_id and not args.space_id:
        parser.error("--journal-id requires --space-id")

    # Check for API key
    if not args.stats and not args.dry_run:
        if not os.getenv("ANTHROPIC_API_KEY"):
            logger.error("ANTHROPIC_API_KEY environment variable is required")
            sys.exit(1)

    table = get_dynamodb_table()

    if args.stats:
        show_stats(table)
        return

    if args.dry_run:
        logger.info("=" * 50)
        logger.info("DRY RUN MODE - No changes will be made")
        logger.info("=" * 50)

    if args.journal_id:
        # Single journal
        stats = asyncio.run(
            backfill_single_journal(
                table,
                args.space_id,
                args.journal_id,
                args.force,
                args.dry_run,
            )
        )
    elif args.space_id:
        # All journals in a space
        stats = asyncio.run(
            backfill_space(
                table,
                args.space_id,
                args.force,
                args.dry_run,
                args.batch_size,
                args.delay,
            )
        )
    else:
        # All journals in all spaces
        stats = asyncio.run(
            backfill_all(
                table,
                args.force,
                args.dry_run,
                args.batch_size,
                args.delay,
            )
        )

    # Print summary
    logger.info("=" * 50)
    logger.info("BACKFILL COMPLETE")
    logger.info("=" * 50)
    logger.info(f"Total journals:     {stats['total']}")
    logger.info(f"Processed:          {stats['processed']}")
    logger.info(f"Already had metadata: {stats['already_has_metadata']}")
    logger.info(f"Skipped:            {stats['skipped']}")
    logger.info(f"Failed:             {stats['failed']}")
    if "spaces_processed" in stats:
        logger.info(f"Spaces processed:   {stats['spaces_processed']}")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()
