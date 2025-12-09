"""
Migration script: Convert offset-based highlights to TipTap-native highlights

This script migrates existing journals with offset-based highlights to use
TipTap JSON format with embedded highlight marks.

Usage:
    python -m app.migrations.migrate_highlights_to_tiptap [--dry-run] [--space-id SPACE_ID]

Options:
    --dry-run       Show what would be migrated without making changes
    --space-id      Only migrate journals in specified space
"""

import argparse
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

# This would import from your actual services
# from app.services.journal import JournalService
# from app.services.highlight_service import HighlightService
# from app.models.highlight import HighlightModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def markdown_to_tiptap_json(markdown: str) -> Dict[str, Any]:
    """
    Convert markdown content to TipTap JSON format.

    This is a simplified version - in production you'd use a proper markdown parser
    or the tiptap-markdown library to do the conversion.
    """
    # Split into paragraphs
    paragraphs = markdown.strip().split("\n\n")

    nodes = []
    for para in paragraphs:
        if para.strip():
            # Simple paragraph node
            nodes.append({"type": "paragraph", "content": [{"type": "text", "text": para.strip()}]})

    return {"type": "doc", "content": nodes}


def apply_highlight_to_tiptap(
    tiptap_content: Dict[str, Any], highlight: Dict[str, Any], text_to_find: str
) -> Dict[str, Any]:
    """
    Apply a highlight mark to text in TipTap document.

    Args:
        tiptap_content: TipTap document JSON
        highlight: Highlight data (id, color, etc.)
        text_to_find: The text that should be highlighted

    Returns:
        Updated TipTap document with highlight mark applied
    """

    def find_and_mark_text(node: Dict[str, Any], target_text: str) -> bool:
        """Recursively find text and add highlight mark."""
        if node.get("type") == "text" and target_text in node.get("text", ""):
            # Found the text - add highlight mark
            if "marks" not in node:
                node["marks"] = []

            # Add highlight mark
            node["marks"].append(
                {
                    "type": "highlight",
                    "attrs": {
                        "id": highlight["id"],
                        "color": highlight.get("color", "yellow"),
                        "authorId": highlight["author_id"],
                        "authorName": highlight["author_name"],
                        "createdAt": highlight["created_at"],
                        "commentCount": highlight.get("comment_count", 0),
                    },
                }
            )
            return True

        # Recurse into child nodes
        if "content" in node:
            for child in node["content"]:
                if find_and_mark_text(child, target_text):
                    return True

        return False

    # Make a copy to avoid mutating input
    import copy

    result = copy.deepcopy(tiptap_content)
    find_and_mark_text(result, text_to_find)
    return result


async def migrate_journal(journal_id: str, space_id: str, dry_run: bool = False) -> bool:
    """
    Migrate a single journal to TipTap format.

    Args:
        journal_id: Journal entry ID
        space_id: Space ID
        dry_run: If True, only log what would be done

    Returns:
        True if migration successful (or would be in dry run)
    """
    try:
        # 1. Fetch journal
        # journal = await journal_service.get_journal_entry(space_id, journal_id)

        # Simulated journal data
        journal = {
            "journal_id": journal_id,
            "content": "This is a sample journal entry.\n\nIt has multiple paragraphs.",
            "content_tiptap": None,  # Not yet migrated
        }

        logger.info(f"Processing journal {journal_id}")

        # Skip if already migrated
        if journal.get("content_tiptap"):
            logger.info(f"  -> Already migrated (has content_tiptap)")
            return True

        # 2. Fetch highlights for this journal
        # highlights = await highlight_service.get_highlights_for_journal(space_id, journal_id)

        # Simulated highlights
        highlights = [
            {
                "id": "highlight-1",
                "highlighted_text": "sample journal",
                "color": "yellow",
                "author_id": "user-123",
                "author_name": "Test User",
                "created_at": datetime.utcnow().isoformat(),
                "comment_count": 2,
            }
        ]

        logger.info(f"  -> Found {len(highlights)} highlights")

        # 3. Convert markdown to TipTap JSON
        tiptap_content = markdown_to_tiptap_json(journal["content"])

        # 4. Apply each highlight as a mark
        for highlight in highlights:
            logger.info(
                f"  -> Applying highlight {highlight['id']} "
                f"to text: '{highlight['highlighted_text'][:50]}...'"
            )
            tiptap_content = apply_highlight_to_tiptap(
                tiptap_content, highlight, highlight["highlighted_text"]
            )

        # 5. Save updated journal
        if dry_run:
            logger.info(f"  -> [DRY RUN] Would save TipTap content:")
            logger.info(f"     {json.dumps(tiptap_content, indent=2)[:200]}...")
        else:
            # await journal_service.update_journal_entry(
            #     space_id=space_id,
            #     journal_id=journal_id,
            #     user_id=journal["user_id"],
            #     data={"content_tiptap": tiptap_content}
            # )
            logger.info(f"  -> ✓ Migrated successfully")

        return True

    except Exception as e:
        logger.error(f"Failed to migrate journal {journal_id}: {e}", exc_info=True)
        return False


async def migrate_all_journals(space_id: Optional[str] = None, dry_run: bool = False):
    """
    Migrate all journals to TipTap format.

    Args:
        space_id: If specified, only migrate journals in this space
        dry_run: If True, only log what would be done
    """
    logger.info("=" * 60)
    logger.info("Starting TipTap Highlight Migration")
    logger.info("=" * 60)

    if dry_run:
        logger.info("DRY RUN MODE - No changes will be made")

    # 1. Get all journals (or journals in specific space)
    # if space_id:
    #     journals = await journal_service.get_journals_for_space(space_id)
    # else:
    #     journals = await journal_service.get_all_journals()

    # Simulated journals list
    journals = [
        {"journal_id": "journal-1", "space_id": "space-123"},
        {"journal_id": "journal-2", "space_id": "space-123"},
        {"journal_id": "journal-3", "space_id": "space-456"},
    ]

    if space_id:
        journals = [j for j in journals if j["space_id"] == space_id]

    logger.info(f"Found {len(journals)} journals to migrate")

    # 2. Migrate each journal
    success_count = 0
    failure_count = 0

    for journal in journals:
        result = await migrate_journal(
            journal_id=journal["journal_id"], space_id=journal["space_id"], dry_run=dry_run
        )

        if result:
            success_count += 1
        else:
            failure_count += 1

    # 3. Summary
    logger.info("=" * 60)
    logger.info("Migration Complete")
    logger.info(f"  Success: {success_count}")
    logger.info(f"  Failures: {failure_count}")
    logger.info("=" * 60)


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate offset-based highlights to TipTap-native format"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Show what would be migrated without making changes"
    )
    parser.add_argument("--space-id", type=str, help="Only migrate journals in specified space")

    args = parser.parse_args()

    # Run migration
    import asyncio

    asyncio.run(migrate_all_journals(space_id=args.space_id, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
