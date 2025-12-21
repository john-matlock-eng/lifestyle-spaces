"""
AI Metadata API Routes

Endpoints for generating and retrieving AI-generated journal metadata.
"""

import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status

from app.core.dependencies import get_current_user
from app.models.ai_metadata import (
    GenerateMetadataRequest,
    GenerateMetadataResponse,
    JournalAIMetadata,
)
from app.services.journal import JournalService
from app.services.space import SpaceService
from app.services.metadata_generator import get_metadata_generator

logger = logging.getLogger(__name__)


def _get_user_id(current_user: Dict[str, Any]) -> str:
    """Extract user ID from current user dict."""
    return current_user.get("sub") or current_user.get("userId")


router = APIRouter(prefix="/metadata", tags=["metadata"])


def get_journal_service() -> JournalService:
    """Get journal service instance."""
    return JournalService()


@router.post(
    "/journals/{journal_id}/generate",
    response_model=GenerateMetadataResponse,
    summary="Generate AI metadata for a journal",
    description="Generate or regenerate AI metadata for a journal entry.",
)
async def generate_journal_metadata(
    journal_id: str,
    request: GenerateMetadataRequest = None,
    current_user: dict = Depends(get_current_user),
    journal_service: JournalService = Depends(get_journal_service),
) -> GenerateMetadataResponse:
    """
    Generate AI metadata for a specific journal.

    - **journal_id**: The ID of the journal to analyze
    - **forceRegenerate**: If true, regenerate even if metadata exists
    """
    if request is None:
        request = GenerateMetadataRequest()

    user_id = _get_user_id(current_user)

    # Get the journal - this validates user access
    journal = journal_service.get_journal_by_id(journal_id, user_id)

    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal not found"
        )

    # Check if metadata already exists and force_regenerate is False
    if journal.get("ai_metadata") and not request.force_regenerate:
        # Return existing metadata
        existing_metadata = journal["ai_metadata"]
        return GenerateMetadataResponse(
            journal_id=journal_id,
            metadata=JournalAIMetadata(**existing_metadata),
            was_cached=True
        )

    # Generate new metadata
    try:
        metadata_generator = get_metadata_generator()

        # Prefer TipTap content if available
        content = journal.get("content_tiptap") or journal.get("content", "")

        metadata = await metadata_generator.generate_metadata(
            journal_id=journal_id,
            title=journal.get("title", ""),
            content=content,
            template_id=journal.get("template_id")
        )

        # Update the journal with new metadata
        space_id = journal.get("space_id")
        if space_id:
            journal_service._update_ai_metadata(
                space_id=space_id,
                journal_id=journal_id,
                ai_metadata=metadata
            )

        return GenerateMetadataResponse(
            journal_id=journal_id,
            metadata=metadata,
            was_cached=False
        )

    except ValueError as e:
        logger.error(f"Metadata generation failed for {journal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate metadata: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Unexpected error generating metadata for {journal_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate metadata"
        )


@router.get(
    "/journals/{journal_id}",
    response_model=Optional[JournalAIMetadata],
    summary="Get AI metadata for a journal",
    description="Retrieve existing AI-generated metadata for a journal entry.",
)
async def get_journal_metadata(
    journal_id: str,
    current_user: dict = Depends(get_current_user),
    journal_service: JournalService = Depends(get_journal_service),
) -> Optional[JournalAIMetadata]:
    """
    Get existing AI metadata for a specific journal.

    Returns null if no metadata has been generated yet.
    """
    user_id = _get_user_id(current_user)

    # Get the journal - this validates user access
    journal = journal_service.get_journal_by_id(journal_id, user_id)

    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal not found"
        )

    ai_metadata = journal.get("ai_metadata")
    if not ai_metadata:
        return None

    return JournalAIMetadata(**ai_metadata)


async def _generate_metadata_for_journals(
    space_id: str,
    user_id: str,
    force_regenerate: bool = False
) -> dict:
    """
    Background task to generate metadata for all journals in a space.

    Returns summary of results.
    """
    journal_service = JournalService()
    metadata_generator = get_metadata_generator()

    # Get all journals in the space
    journals = journal_service.get_journals_for_space(
        space_id=space_id,
        user_id=user_id,
        page=1,
        page_size=1000  # Get all
    )

    processed = 0
    skipped = 0
    failed = 0

    for journal in journals.get("journals", []):
        journal_id = journal.get("journal_id")

        # Skip if metadata exists and not forcing regeneration
        if journal.get("ai_metadata") and not force_regenerate:
            skipped += 1
            continue

        try:
            content = journal.get("content_tiptap") or journal.get("content", "")

            metadata = await metadata_generator.generate_metadata(
                journal_id=journal_id,
                title=journal.get("title", ""),
                content=content,
                template_id=journal.get("template_id")
            )

            journal_service._update_ai_metadata(
                space_id=space_id,
                journal_id=journal_id,
                ai_metadata=metadata
            )
            processed += 1

        except Exception as e:
            logger.error(f"Failed to generate metadata for {journal_id}: {e}")
            failed += 1

    return {
        "processed": processed,
        "skipped": skipped,
        "failed": failed,
        "total": len(journals.get("journals", []))
    }


@router.post(
    "/spaces/{space_id}/generate-all",
    summary="Generate AI metadata for all journals in a space",
    description="Trigger background generation of AI metadata for all journals in a space.",
)
async def generate_space_metadata(
    space_id: str,
    request: GenerateMetadataRequest = None,
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Generate metadata for all journals in a space.

    This runs in the foreground for Lambda compatibility.
    For large spaces, use the backfill script instead.

    - **space_id**: The space to process
    - **forceRegenerate**: If true, regenerate for all journals even if metadata exists
    """
    if request is None:
        request = GenerateMetadataRequest()

    user_id = _get_user_id(current_user)

    # Verify user has access to the space
    space_service = SpaceService()
    space = space_service.get_space(space_id, user_id)

    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space not found"
        )

    # Run metadata generation
    # Note: For Lambda, this runs synchronously. For large spaces, use backfill script.
    try:
        result = await _generate_metadata_for_journals(
            space_id=space_id,
            user_id=user_id,
            force_regenerate=request.force_regenerate
        )

        return {
            "status": "completed",
            "spaceId": space_id,
            **result
        }

    except Exception as e:
        logger.error(f"Failed to generate metadata for space {space_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate metadata for space"
        )
