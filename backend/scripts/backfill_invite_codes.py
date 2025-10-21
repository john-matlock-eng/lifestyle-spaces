"""
Backfill script to add invite codes to spaces that don't have them.

This script scans all spaces in the DynamoDB table and generates invite codes
for any spaces that are missing them. This is useful for spaces created before
the invite code feature was implemented.

Usage:
    python scripts/backfill_invite_codes.py [--dry-run]

Options:
    --dry-run: Show what would be updated without making changes
"""
import sys
import os
import argparse
import logging
from typing import List, Dict, Any

# Add the parent directory to the path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.space import SpaceService
from app.core.database import get_dynamodb_table

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_all_spaces() -> List[Dict[str, Any]]:
    """
    Scan DynamoDB for all space items.

    Returns:
        List of space items from DynamoDB
    """
    table = get_dynamodb_table()
    spaces = []

    logger.info("Scanning DynamoDB for all spaces...")

    # Scan for all items with PK starting with SPACE# and SK = METADATA
    response = table.scan(
        FilterExpression='begins_with(PK, :pk_prefix) AND SK = :sk',
        ExpressionAttributeValues={
            ':pk_prefix': 'SPACE#',
            ':sk': 'METADATA'
        }
    )

    spaces.extend(response.get('Items', []))

    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression='begins_with(PK, :pk_prefix) AND SK = :sk',
            ExpressionAttributeValues={
                ':pk_prefix': 'SPACE#',
                ':sk': 'METADATA'
            },
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        spaces.extend(response.get('Items', []))

    logger.info(f"Found {len(spaces)} total spaces")
    return spaces


def find_spaces_without_invite_codes(spaces: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filter spaces that don't have invite codes.

    Args:
        spaces: List of all space items

    Returns:
        List of spaces missing invite codes
    """
    spaces_without_codes = []

    for space in spaces:
        if not space.get('invite_code'):
            spaces_without_codes.append(space)
            logger.info(
                f"Space '{space.get('name', 'Unknown')}' "
                f"(ID: {space.get('id', 'Unknown')}) is missing invite code"
            )

    logger.info(f"Found {len(spaces_without_codes)} spaces without invite codes")
    return spaces_without_codes


def backfill_invite_codes(spaces: List[Dict[str, Any]], dry_run: bool = False) -> Dict[str, Any]:
    """
    Generate and add invite codes to spaces that don't have them.

    Args:
        spaces: List of spaces missing invite codes
        dry_run: If True, don't make actual changes

    Returns:
        Summary dictionary with counts and details
    """
    service = SpaceService()
    summary = {
        'total': len(spaces),
        'success': 0,
        'failed': 0,
        'errors': []
    }

    if dry_run:
        logger.info("DRY RUN MODE - No changes will be made")

    for space in spaces:
        space_id = space.get('id')
        space_name = space.get('name', 'Unknown')

        try:
            if not dry_run:
                # Use the existing regenerate method which handles missing codes
                new_code = service.regenerate_invite_code(space_id)
                logger.info(
                    f"✓ Added invite code '{new_code}' to space "
                    f"'{space_name}' (ID: {space_id})"
                )
                summary['success'] += 1
            else:
                logger.info(
                    f"[DRY RUN] Would add invite code to space "
                    f"'{space_name}' (ID: {space_id})"
                )
                summary['success'] += 1

        except Exception as e:
            logger.error(
                f"✗ Failed to add invite code to space "
                f"'{space_name}' (ID: {space_id}): {str(e)}"
            )
            summary['failed'] += 1
            summary['errors'].append({
                'space_id': space_id,
                'space_name': space_name,
                'error': str(e)
            })

    return summary


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description='Backfill invite codes for spaces that are missing them'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without making changes'
    )

    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Starting invite code backfill process")
    logger.info("=" * 60)

    # Step 1: Get all spaces
    all_spaces = get_all_spaces()

    if not all_spaces:
        logger.info("No spaces found in the database")
        return

    # Step 2: Find spaces without invite codes
    spaces_without_codes = find_spaces_without_invite_codes(all_spaces)

    if not spaces_without_codes:
        logger.info("All spaces already have invite codes!")
        return

    # Step 3: Backfill invite codes
    logger.info("=" * 60)
    summary = backfill_invite_codes(spaces_without_codes, dry_run=args.dry_run)

    # Step 4: Print summary
    logger.info("=" * 60)
    logger.info("BACKFILL SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total spaces processed: {summary['total']}")
    logger.info(f"Successfully updated: {summary['success']}")
    logger.info(f"Failed: {summary['failed']}")

    if summary['errors']:
        logger.info("\nErrors:")
        for error in summary['errors']:
            logger.error(
                f"  - {error['space_name']} (ID: {error['space_id']}): "
                f"{error['error']}"
            )

    if args.dry_run:
        logger.info("\n*** DRY RUN COMPLETE - No changes were made ***")
        logger.info("Run without --dry-run to apply changes")
    else:
        logger.info("\n*** BACKFILL COMPLETE ***")


if __name__ == '__main__':
    main()
