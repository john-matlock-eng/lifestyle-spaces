"""
Data models for Journal Highlights and Comments feature.

Single Table Design:
- Highlights: PK=SPACE#{space_id}, SK=HIGHLIGHT#{highlight_id}
- Comments: PK=SPACE#{space_id}, SK=COMMENT#{comment_id}

GSI1:
- Highlights by journal: GSI1PK=JOURNAL#{entry_id}, GSI1SK=HIGHLIGHT#{timestamp}
- Comments by highlight: GSI1PK=HIGHLIGHT#{highlight_id}, GSI1SK=COMMENT#{timestamp}

TipTap-Native Highlights:
- Highlights are embedded in TipTap document JSON as marks
- This model is used for indexing and comment management
- The source of truth is the TipTap document, not these DB records
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TextRange(BaseModel):
    """Text selection range for highlights."""

    start_offset: int = Field(alias="startOffset")
    end_offset: int = Field(alias="endOffset")
    start_container_id: Optional[str] = Field(None, alias="startContainerId")
    end_container_id: Optional[str] = Field(None, alias="endContainerId")

    class Config:
        populate_by_name = True
        by_alias = True


class HighlightModel(BaseModel):
    """
    Journal entry highlight model.

    Multi-Section Support:
    - section_id: Optional section identifier for multi-section journals
    - For single-section journals, section_id can be None or 'content'
    - TipTap positions are relative to the section's document
    """

    id: str
    journal_entry_id: str = Field(alias="journalEntryId")
    space_id: str = Field(alias="spaceId")
    section_id: Optional[str] = Field(None, alias="sectionId")  # NEW: section context
    highlighted_text: str = Field(alias="highlightedText")
    text_range: TextRange = Field(alias="textRange")
    color: Optional[str] = "yellow"
    created_by: str = Field(alias="createdBy")
    created_by_name: str = Field(alias="createdByName")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    comment_count: int = Field(default=0, alias="commentCount")

    class Config:
        populate_by_name = True
        by_alias = True


class CommentModel(BaseModel):
    """Comment on a highlight model."""

    id: str
    highlight_id: str = Field(alias="highlightId")
    space_id: str = Field(alias="spaceId")
    text: str
    author: str
    author_name: str = Field(alias="authorName")
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: List[str] = Field(default_factory=list)
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    is_edited: bool = Field(default=False, alias="isEdited")

    class Config:
        populate_by_name = True
        by_alias = True


class CreateHighlightRequest(BaseModel):
    """
    Request to create a new highlight.

    Multi-Section Support:
    - section_id: Optional section identifier for multi-section journals
    """

    section_id: Optional[str] = Field(None, alias="sectionId")  # NEW: section context
    highlighted_text: str = Field(alias="highlightedText")
    text_range: TextRange = Field(alias="textRange")
    color: Optional[str] = "yellow"

    class Config:
        populate_by_name = True
        by_alias = True


class UpdateHighlightRequest(BaseModel):
    """Request to update a highlight's text selection."""

    highlighted_text: str = Field(alias="highlightedText")
    text_range: TextRange = Field(alias="textRange")

    class Config:
        populate_by_name = True
        by_alias = True


class CreateCommentRequest(BaseModel):
    """Request to create a new comment."""

    text: str
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: Optional[List[str]] = Field(default_factory=list)

    class Config:
        populate_by_name = True
        by_alias = True


# DynamoDB Item helpers
def highlight_to_db_item(highlight: HighlightModel) -> dict:
    """Convert highlight model to DynamoDB item."""
    item = {
        "PK": f"SPACE#{highlight.space_id}",
        "SK": f"HIGHLIGHT#{highlight.id}",
        "GSI1PK": f"JOURNAL#{highlight.journal_entry_id}",
        "GSI1SK": f"HIGHLIGHT#{highlight.created_at}",
        "EntityType": "Highlight",
        "id": highlight.id,
        "journalEntryId": highlight.journal_entry_id,
        "spaceId": highlight.space_id,
        "highlightedText": highlight.highlighted_text,
        "textRange": highlight.text_range.dict(by_alias=True),
        "color": highlight.color,
        "createdBy": highlight.created_by,
        "createdByName": highlight.created_by_name,
        "createdAt": highlight.created_at,
        "updatedAt": highlight.updated_at,
        "commentCount": highlight.comment_count,
    }
    # Include sectionId if present
    if highlight.section_id:
        item["sectionId"] = highlight.section_id
    return item


def db_item_to_highlight(item: dict) -> HighlightModel:
    """Convert DynamoDB item to highlight model."""
    return HighlightModel(
        id=item["id"],
        journalEntryId=item["journalEntryId"],
        spaceId=item["spaceId"],
        sectionId=item.get("sectionId"),  # NEW: section context
        highlightedText=item["highlightedText"],
        textRange=TextRange(**item["textRange"]),
        color=item.get("color", "yellow"),
        createdBy=item["createdBy"],
        createdByName=item["createdByName"],
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
        commentCount=item.get("commentCount", 0),
    )


def comment_to_db_item(comment: CommentModel) -> dict:
    """Convert comment model to DynamoDB item."""
    return {
        "PK": f"SPACE#{comment.space_id}",
        "SK": f"COMMENT#{comment.id}",
        "GSI1PK": f"HIGHLIGHT#{comment.highlight_id}",
        "GSI1SK": f"COMMENT#{comment.created_at}",
        "EntityType": "Comment",
        "id": comment.id,
        "highlightId": comment.highlight_id,
        "spaceId": comment.space_id,
        "text": comment.text,
        "author": comment.author,
        "authorName": comment.author_name,
        "parentCommentId": comment.parent_comment_id,
        "mentions": comment.mentions,
        "createdAt": comment.created_at,
        "updatedAt": comment.updated_at,
        "isEdited": comment.is_edited,
    }


def db_item_to_comment(item: dict) -> CommentModel:
    """Convert DynamoDB item to comment model."""
    return CommentModel(
        id=item["id"],
        highlightId=item["highlightId"],
        spaceId=item["spaceId"],
        text=item["text"],
        author=item["author"],
        authorName=item["authorName"],
        parentCommentId=item.get("parentCommentId"),
        mentions=item.get("mentions", []),
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
        isEdited=item.get("isEdited", False),
    )


# TipTap-specific models
class TipTapHighlight(BaseModel):
    """
    Highlight embedded in TipTap document (extracted from mark).

    Multi-Section Support:
    - section_id: Identifies which section this highlight belongs to
    """

    id: str
    color: str = "yellow"
    author_id: str = Field(alias="authorId")
    author_name: str = Field(alias="authorName")
    created_at: str = Field(alias="createdAt")
    comment_count: int = Field(default=0, alias="commentCount")
    section_id: Optional[str] = Field(None, alias="sectionId")  # NEW: section context

    class Config:
        populate_by_name = True
        by_alias = True


def extract_highlights_from_tiptap(
    content: Dict[str, Any], section_id: Optional[str] = None
) -> List[TipTapHighlight]:
    """
    Extract all highlights from TipTap document JSON.

    Args:
        content: TipTap document JSON (ProseMirror format)
        section_id: Optional section identifier to tag extracted highlights

    Returns:
        List of TipTapHighlight objects
    """
    highlights: List[TipTapHighlight] = []
    seen_ids = set()

    def traverse(node: Dict[str, Any]):
        """Recursively traverse TipTap document nodes."""
        # Check if node has marks (text nodes have marks)
        if "marks" in node:
            for mark in node["marks"]:
                if mark.get("type") == "highlight":
                    attrs = mark.get("attrs", {})
                    highlight_id = attrs.get("id")

                    # Only add each unique highlight once
                    if highlight_id and highlight_id not in seen_ids:
                        seen_ids.add(highlight_id)
                        highlights.append(
                            TipTapHighlight(
                                id=highlight_id,
                                color=attrs.get("color", "yellow"),
                                authorId=attrs.get("authorId", ""),
                                authorName=attrs.get("authorName", ""),
                                createdAt=attrs.get("createdAt", ""),
                                commentCount=attrs.get("commentCount", 0),
                                sectionId=attrs.get("sectionId")
                                or section_id,  # Use mark's sectionId or provided
                            )
                        )

        # Recurse into child nodes
        if "content" in node:
            for child in node["content"]:
                traverse(child)

    # Start traversal from root
    if content:
        traverse(content)

    return highlights


def extract_highlights_from_multi_section_tiptap(
    content_tiptap: Dict[str, Any]
) -> List[TipTapHighlight]:
    """
    Extract highlights from multi-section TipTap content.

    Args:
        content_tiptap: Either single TipTap doc or multi-section mapping

    Returns:
        List of all TipTapHighlight objects from all sections
    """
    highlights: List[TipTapHighlight] = []

    # Check if single document format
    if content_tiptap.get("type") == "doc":
        # Single section
        return extract_highlights_from_tiptap(content_tiptap, section_id="content")

    # Multi-section format
    for section_id, section_doc in content_tiptap.items():
        if isinstance(section_doc, dict) and section_doc.get("type") == "doc":
            section_highlights = extract_highlights_from_tiptap(section_doc, section_id=section_id)
            highlights.extend(section_highlights)

    return highlights


def update_highlight_comment_count_in_tiptap(
    content: Dict[str, Any], highlight_id: str, comment_count: int
) -> Dict[str, Any]:
    """
    Update comment count for a specific highlight in TipTap document.

    Args:
        content: TipTap document JSON
        highlight_id: ID of highlight to update
        comment_count: New comment count

    Returns:
        Updated TipTap document JSON
    """

    def traverse(node: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively traverse and update highlight marks."""
        # Process marks if present
        if "marks" in node:
            updated_marks = []
            for mark in node["marks"]:
                if mark.get("type") == "highlight":
                    attrs = mark.get("attrs", {})
                    if attrs.get("id") == highlight_id:
                        # Update comment count
                        attrs["commentCount"] = comment_count
                        mark["attrs"] = attrs
                updated_marks.append(mark)
            node["marks"] = updated_marks

        # Recurse into child nodes
        if "content" in node:
            node["content"] = [traverse(child) for child in node["content"]]

        return node

    # Create a deep copy to avoid mutating input
    import copy

    updated_content = copy.deepcopy(content)
    return traverse(updated_content)


def remove_highlight_from_tiptap(content: Dict[str, Any], highlight_id: str) -> Dict[str, Any]:
    """
    Remove a specific highlight from TipTap document.

    Args:
        content: TipTap document JSON
        highlight_id: ID of highlight to remove

    Returns:
        Updated TipTap document JSON with highlight removed
    """

    def traverse(node: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively traverse and remove highlight marks."""
        # Process marks if present
        if "marks" in node:
            # Filter out the highlight mark with matching ID
            node["marks"] = [
                mark
                for mark in node["marks"]
                if not (
                    mark.get("type") == "highlight"
                    and mark.get("attrs", {}).get("id") == highlight_id
                )
            ]

        # Recurse into child nodes
        if "content" in node:
            node["content"] = [traverse(child) for child in node["content"]]

        return node

    # Create a deep copy to avoid mutating input
    import copy

    updated_content = copy.deepcopy(content)
    return traverse(updated_content)
