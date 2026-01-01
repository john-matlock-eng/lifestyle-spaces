"""
Journal management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from botocore.exceptions import ClientError
from app.models.journal import (
    JournalCreate,
    JournalCreateRequest,
    JournalResponse,
    JournalCardResponse,
    JournalUpdate,
    JournalListResponse,
)
from app.models.common import SuccessResponse
from pydantic import BaseModel
from app.services.journal import JournalService, JournalNotFoundError
from app.services.exceptions import SpaceNotFoundError, UnauthorizedError, ValidationError
from app.services.section_parser import get_section_parser
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["Journals"])


@router.post(
    "/spaces/{space_id}/journals",
    response_model=JournalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_journal(
    space_id: str, journal: JournalCreateRequest, current_user: dict = Depends(get_current_user)
):
    """Create a new journal entry in a space."""
    try:
        logger.info(
            f"[API_CREATE_JOURNAL] Request from user={current_user.get('sub')}, space={space_id}"
        )

        # Create JournalCreate with space_id from path
        journal_data = JournalCreate(
            space_id=space_id,
            title=journal.title,
            content=journal.content,
            content_tiptap=journal.content_tiptap,  # Include TipTap JSON for native highlighting
            tags=journal.tags,
            emotions=journal.emotions,
            is_pinned=journal.is_pinned,
            template_id=journal.template_id,
            framework_id=journal.framework_id
            # REMOVED: template_data - data is embedded in content
        )

        service = JournalService()
        result = service.create_journal_entry(
            space_id=space_id, user_id=current_user.get("sub", ""), data=journal_data
        )

        # Return JournalResponse with proper field mapping
        response = JournalResponse(
            journal_id=result["journal_id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            title=result["title"],
            content=result["content"],
            content_tiptap=result.get("content_tiptap"),  # Include TipTap JSON in response
            template_id=result.get("template_id"),
            framework_id=result.get("framework_id"),
            # REMOVED: template_data - data is embedded in content
            tags=result.get("tags", []),
            emotions=result.get("emotions", []),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            word_count=result.get("word_count", 0),
            is_pinned=result.get("is_pinned", False),
            author=None,  # New journal, author info not needed
        )

        logger.info(f"[API_CREATE_JOURNAL] Journal created: {result['journal_id']}")
        return response
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create journal"
        )


@router.get("/spaces/{space_id}/journals", response_model=JournalListResponse)
async def list_space_journals(
    space_id: str,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    tags: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None, alias="authorId"),
):
    """List all journals in a space with optional filtering."""
    try:
        logger.info(f"[API_LIST_SPACE_JOURNALS] space={space_id}, user={current_user.get('sub')}")

        # Parse tags if provided (comma-separated)
        tags_list = tags.split(",") if tags else None

        service = JournalService()
        result = service.list_space_journals(
            space_id=space_id,
            user_id=current_user.get("sub", ""),
            page=page,
            page_size=page_size,
            tags=tags_list,
            author_id=author_id,
        )

        # Convert to lightweight card response format (no content fields)
        journal_responses = []
        for journal in result["journals"]:
            journal_responses.append(
                JournalCardResponse(
                    journal_id=journal["journal_id"],
                    space_id=journal["space_id"],
                    user_id=journal["user_id"],
                    title=journal["title"],
                    template_id=journal.get("template_id"),
                    framework_id=journal.get("framework_id"),
                    tags=journal.get("tags", []),
                    emotions=journal.get("emotions", []),
                    created_at=journal["created_at"],
                    updated_at=journal["updated_at"],
                    word_count=journal.get("word_count", 0),
                    is_pinned=journal.get("is_pinned", False),
                    author=journal.get("author"),
                    ai_metadata=journal.get("ai_metadata"),
                )
            )

        return JournalListResponse(
            journals=journal_responses,
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            has_more=result.get("has_more", False),
        )
    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to list journals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list journals"
        )


# =============================================================================
# Theme Filter Endpoints (must be defined BEFORE {journal_id} routes)
# =============================================================================


class ThemeCount(BaseModel):
    """A theme with its occurrence count."""

    theme: str
    count: int


class ThemesResponse(BaseModel):
    """Response containing theme counts."""

    themes: List[ThemeCount]
    total: int


class JournalsByThemeResponse(BaseModel):
    """Response containing journals filtered by theme."""

    theme: str
    journals: List[JournalResponse]
    total: int


@router.get(
    "/spaces/{space_id}/journals/themes",
    response_model=ThemesResponse,
    summary="Get all unique AI themes in a space",
)
async def get_space_themes(
    space_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get all unique AI-generated themes across journals in a space.

    Returns themes sorted by count (most frequent first).
    """
    try:
        logger.info(f"[API_GET_THEMES] space={space_id}, user={current_user.get('sub')}")

        service = JournalService()
        # Get all journals in the space (up to a reasonable limit)
        result = service.list_space_journals(
            space_id=space_id,
            user_id=current_user.get("sub", ""),
            page=1,
            page_size=1000,
        )

        theme_counts: dict = {}

        for journal in result["journals"]:
            ai_metadata = journal.get("ai_metadata")
            if ai_metadata and isinstance(ai_metadata, dict):
                themes = ai_metadata.get("themes", [])
                if themes:
                    for theme in themes:
                        theme_lower = theme.lower()
                        theme_counts[theme_lower] = theme_counts.get(theme_lower, 0) + 1

        # Sort by count descending
        sorted_themes = sorted(
            theme_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )

        return ThemesResponse(
            themes=[
                ThemeCount(theme=theme, count=count)
                for theme, count in sorted_themes[:50]
            ],
            total=len(sorted_themes),
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get themes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get themes"
        )


@router.get(
    "/spaces/{space_id}/journals/by-theme/{theme}",
    response_model=JournalsByThemeResponse,
    summary="Get journals by AI theme",
)
async def get_journals_by_theme(
    space_id: str,
    theme: str,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """
    Get journals that have a specific AI-generated theme.

    Case-insensitive matching.
    """
    try:
        logger.info(
            f"[API_GET_BY_THEME] space={space_id}, theme={theme}, user={current_user.get('sub')}"
        )

        service = JournalService()
        # Get all journals in the space
        result = service.list_space_journals(
            space_id=space_id,
            user_id=current_user.get("sub", ""),
            page=1,
            page_size=1000,
        )

        theme_lower = theme.lower()
        matching_journals = []

        for journal in result["journals"]:
            ai_metadata = journal.get("ai_metadata")
            if ai_metadata and isinstance(ai_metadata, dict):
                themes = ai_metadata.get("themes", [])
                if themes and any(t.lower() == theme_lower for t in themes):
                    matching_journals.append(journal)

        # Sort by updated_at descending
        matching_journals.sort(
            key=lambda j: j.get("updated_at") or j.get("created_at", ""),
            reverse=True
        )

        # Convert to response format
        journal_responses = []
        for journal in matching_journals[:limit]:
            journal_responses.append(
                JournalResponse(
                    journal_id=journal["journal_id"],
                    space_id=journal["space_id"],
                    user_id=journal["user_id"],
                    title=journal["title"],
                    content=journal["content"],
                    content_tiptap=journal.get("content_tiptap"),
                    template_id=journal.get("template_id"),
                    framework_id=journal.get("framework_id"),
                    tags=journal.get("tags", []),
                    emotions=journal.get("emotions", []),
                    created_at=journal["created_at"],
                    updated_at=journal["updated_at"],
                    word_count=journal.get("word_count", 0),
                    is_pinned=journal.get("is_pinned", False),
                    author=journal.get("author"),
                    ai_metadata=journal.get("ai_metadata"),
                )
            )

        return JournalsByThemeResponse(
            theme=theme,
            journals=journal_responses,
            total=len(matching_journals),
        )

    except SpaceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get journals by theme: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get journals by theme"
        )


# =============================================================================
# Section Content Endpoint (for citation expand-in-place)
# =============================================================================


class SectionContentResponse(BaseModel):
    """Response containing a single section's full content."""

    sectionIndex: int
    sectionTitle: str
    content: str
    wordCount: int
    journalTitle: str
    createdAt: str


def extract_sections_from_content(content: dict) -> list:
    """
    Extract sections from TipTap JSON content.

    Handles two formats:
    1. Single TipTap doc with headings (type: "doc" with content array)
    2. Template section dict (keys like 'gratitude', 'reflection' with TipTap docs)

    Falls back to treating entire content as single section.
    """
    if not content or not isinstance(content, dict):
        return [{"title": "", "content": ""}]

    def extract_text(node: dict) -> str:
        """Recursively extract text from TipTap node."""
        if not isinstance(node, dict):
            return ""
        if node.get("type") == "text":
            return node.get("text", "")

        texts = []
        for child in node.get("content", []):
            if isinstance(child, dict):
                texts.append(extract_text(child))
        return " ".join(filter(None, texts))

    def is_section_dict(c: dict) -> bool:
        """Check if content is a dict of section TipTap docs (template format)."""
        section_keys = [k for k in c.keys() if k != 'content' and k != 'type']
        for key in section_keys:
            value = c.get(key)
            if isinstance(value, dict) and value.get('type') == 'doc':
                return True
        return False

    # Section key display name mapping
    SECTION_KEY_MAP = {
        'raw_thoughts': 'Express',
        'deep_dive': 'Examine',
        'action_plan': 'Evolve',
        'gratitude': 'Gratitude',
        'reflection': 'Reflection',
        'scene': 'The Scene',
        'reaction': 'My Reaction',
        'takeaway': 'The Takeaway',
        'review': 'Review',
        'lead_measures': 'Lead Measures',
        'commitments': 'Commitments',
        'identity': 'Identity',
        'values': 'Values',
        'mission': 'Mission',
        'acknowledge': 'Acknowledge',
        'understand': 'Understand',
        'recommit': 'Recommit',
        'focus_areas': 'Focus Areas',
        'outcomes': 'Outcomes',
    }

    # Preferred section order
    SECTION_ORDER = [
        'raw_thoughts', 'deep_dive', 'action_plan',
        'scene', 'reaction', 'takeaway',
        'gratitude', 'reflection',
        'identity', 'values', 'mission', 'commitments',
        'review', 'lead_measures',
        'acknowledge', 'understand', 'recommit',
        'focus_areas', 'outcomes',
    ]

    # Check if it's a template section dict format
    if is_section_dict(content):
        sections = []
        processed_keys = set()
        keys_to_process = []

        # Process keys in preferred order
        for key in SECTION_ORDER:
            if key in content:
                keys_to_process.append(key)
                processed_keys.add(key)

        # Add any remaining keys not in the order list
        for key in content.keys():
            if key not in processed_keys and key not in ('content', 'type'):
                keys_to_process.append(key)

        for key in keys_to_process:
            value = content.get(key)
            if value is None:
                continue

            display_title = SECTION_KEY_MAP.get(key, key.replace('_', ' ').title())
            text = ""

            if isinstance(value, dict) and value.get('type') == 'doc':
                text = extract_text(value)
            elif isinstance(value, str):
                text = value

            if text:
                sections.append({"title": display_title, "content": text.strip()})

        if sections:
            return sections

    # Fall back to heading-based parsing for single TipTap doc
    sections = []
    current_section = {"title": "", "content": ""}

    def process_node(node: dict):
        nonlocal current_section

        node_type = node.get("type", "")

        # Heading starts a new section
        if node_type == "heading":
            # Save previous section if it has content
            if current_section["content"].strip():
                sections.append(current_section)

            current_section = {"title": extract_text(node), "content": ""}
        else:
            # Add content to current section
            text = extract_text(node)
            if text:
                if current_section["content"]:
                    current_section["content"] += "\n\n"
                current_section["content"] += text

    # Process top-level content nodes
    for node in content.get("content", []):
        if isinstance(node, dict):
            process_node(node)

    # Don't forget the last section
    if current_section["content"].strip() or current_section["title"]:
        sections.append(current_section)

    # If no sections found, treat entire content as one section
    if not sections:
        full_text = extract_text(content)
        sections = [{"title": "", "content": full_text}]

    return sections


@router.get(
    "/spaces/{space_id}/journals/{journal_id}/sections/{section_index}",
    response_model=SectionContentResponse,
    summary="Get a specific section from a journal",
)
async def get_journal_section(
    space_id: str,
    journal_id: str,
    section_index: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Get the full content of a specific section from a journal.

    Used by chat citations to expand and show full section content
    without navigating away from the conversation.

    IMPORTANT: Uses section_parser to ensure section indices match what was
    indexed in Pinecone. The parser applies MIN_SECTION_LENGTH filtering and
    re-indexes, which must match the citation's sectionIndex.

    Returns:
        - sectionIndex: The section index
        - sectionTitle: Title of the section (if any)
        - content: Full text content of the section
        - wordCount: Approximate word count
        - journalTitle: Parent journal title
        - createdAt: Journal creation date
    """
    try:
        logger.info(
            f"[API_GET_SECTION] space={space_id}, journal={journal_id}, "
            f"section={section_index}, user={current_user.get('sub')}"
        )

        # Get the journal first (this handles authorization)
        service = JournalService()
        journal = service.get_journal_entry(
            space_id=space_id, journal_id=journal_id, user_id=current_user.get("sub", "")
        )

        # Use section_parser to extract sections - this MUST match the indexing
        # logic used when the journal was indexed in Pinecone. The parser applies
        # MIN_SECTION_LENGTH filtering and re-indexes, ensuring the sectionIndex
        # from citations maps to the correct section.
        section_parser = get_section_parser()
        content_tiptap = journal.get("content_tiptap") or journal.get("content", {})
        parsed_sections = section_parser.parse(
            content=content_tiptap,
            template_id=journal.get("template_id"),
            title=journal.get("title")
        )

        if section_index < 0 or section_index >= len(parsed_sections):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section {section_index} not found. Journal has {len(parsed_sections)} sections.",
            )

        parsed_section = parsed_sections[section_index]
        content = parsed_section.content

        return SectionContentResponse(
            sectionIndex=section_index,
            sectionTitle=parsed_section.title,
            content=content,
            wordCount=len(content.split()) if content else 0,
            journalTitle=journal.get("title", "Untitled"),
            createdAt=journal.get("created_at", ""),
        )

    except JournalNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Failed to get journal section: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get journal section",
        )


# =============================================================================
# Individual Journal Endpoints (must be AFTER specific path routes)
# =============================================================================


@router.get("/spaces/{space_id}/journals/{journal_id}", response_model=JournalResponse)
async def get_journal(
    space_id: str, journal_id: str, current_user: dict = Depends(get_current_user)
):
    """Get a single journal entry by ID."""
    try:
        logger.info(
            f"[API_GET_JOURNAL] space={space_id}, journal={journal_id}, user={current_user.get('sub')}"
        )

        service = JournalService()
        result = service.get_journal_entry(
            space_id=space_id, journal_id=journal_id, user_id=current_user.get("sub", "")
        )

        return JournalResponse(
            journal_id=result["journal_id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            title=result["title"],
            content=result["content"],
            content_tiptap=result.get("content_tiptap"),
            template_id=result.get("template_id"),
            framework_id=result.get("framework_id"),
            # REMOVED: template_data - data is embedded in content
            tags=result.get("tags", []),
            emotions=result.get("emotions", []),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            word_count=result.get("word_count", 0),
            is_pinned=result.get("is_pinned", False),
            author=result.get("author"),
            ai_metadata=result.get("ai_metadata"),
        )
    except JournalNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get journal"
        )


@router.put("/spaces/{space_id}/journals/{journal_id}", response_model=JournalResponse)
async def update_journal(
    space_id: str,
    journal_id: str,
    update: JournalUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a journal entry (author only)."""
    try:
        logger.info(
            f"[API_UPDATE_JOURNAL] space={space_id}, journal={journal_id}, user={current_user.get('sub')}"
        )

        service = JournalService()
        result = service.update_journal_entry(
            space_id=space_id,
            journal_id=journal_id,
            user_id=current_user.get("sub", ""),
            data=update,
        )

        return JournalResponse(
            journal_id=result["journal_id"],
            space_id=result["space_id"],
            user_id=result["user_id"],
            title=result["title"],
            content=result["content"],
            content_tiptap=result.get("content_tiptap"),
            template_id=result.get("template_id"),
            framework_id=result.get("framework_id"),
            # REMOVED: template_data - data is embedded in content
            tags=result.get("tags", []),
            emotions=result.get("emotions", []),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            word_count=result.get("word_count", 0),
            is_pinned=result.get("is_pinned", False),
            author=result.get("author"),
            ai_metadata=result.get("ai_metadata"),
        )
    except JournalNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update journal"
        )


@router.delete("/spaces/{space_id}/journals/{journal_id}", response_model=SuccessResponse)
async def delete_journal(
    space_id: str, journal_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a journal entry (author or space owner only)."""
    try:
        logger.info(
            f"[API_DELETE_JOURNAL] space={space_id}, journal={journal_id}, user={current_user.get('sub')}"
        )

        service = JournalService()
        service.delete_journal_entry(
            space_id=space_id, journal_id=journal_id, user_id=current_user.get("sub", "")
        )

        return SuccessResponse(message=f"Journal {journal_id} deleted successfully")
    except JournalNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete journal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete journal"
        )


@router.get("/users/me/journals", response_model=JournalListResponse)
async def list_user_journals(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
):
    """List all journals created by the current user across all spaces."""
    try:
        logger.info(f"[API_LIST_USER_JOURNALS] user={current_user.get('sub')}")

        service = JournalService()
        result = service.list_user_journals(
            user_id=current_user.get("sub", ""), page=page, page_size=page_size
        )

        # Convert to lightweight card response format (no content fields)
        journal_responses = []
        for journal in result["journals"]:
            journal_responses.append(
                JournalCardResponse(
                    journal_id=journal["journal_id"],
                    space_id=journal["space_id"],
                    user_id=journal["user_id"],
                    title=journal["title"],
                    template_id=journal.get("template_id"),
                    framework_id=journal.get("framework_id"),
                    tags=journal.get("tags", []),
                    emotions=journal.get("emotions", []),
                    created_at=journal["created_at"],
                    updated_at=journal["updated_at"],
                    word_count=journal.get("word_count", 0),
                    is_pinned=journal.get("is_pinned", False),
                    author=journal.get("author"),
                    ai_metadata=journal.get("ai_metadata"),
                )
            )

        return JournalListResponse(
            journals=journal_responses,
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            has_more=result.get("has_more", False),
        )
    except Exception as e:
        logger.error(f"Failed to list user journals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list journals"
        )
