"""
Section Parser

Extracts sections from TipTap JSON content for granular indexing.
Supports:
- Template-based sections (Express/Examine/Evolve, etc.)
- Header-based sections (H1/H2 splitting)
- Fallback chunking for unstructured content
"""

import logging
from typing import List, Optional, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ParsedSection(BaseModel):
    """A parsed section from journal content."""
    index: int = Field(..., description="Section index (0-based)")
    title: str = Field(..., description="Section title/header")
    content: str = Field(..., description="Section text content")
    section_type: str = Field(
        default="content",
        description="Type: 'header', 'template_section', 'chunk'"
    )

    class Config:
        extra = "forbid"


class SectionParser:
    """
    Parser for extracting sections from TipTap content.

    Strategies (in order of preference):
    1. Template-aware: Use known template section patterns
    2. Header-based: Split by H1/H2 headings
    3. Chunk-based: Split by token count with overlap
    """

    # Known template section patterns
    TEMPLATE_SECTIONS = {
        "express_examine_evolve": ["Express", "Examine", "Evolve"],
        "daily_lens": ["The Scene", "My Reaction", "The Takeaway"],
        "gratitude": ["Gratitude", "Reflection"],
        "weekly_scoreboard": ["Review", "Lead Measures", "Commitments"],
        "quarterly_snapshot": ["Review", "Focus Areas", "Outcomes"],
        "personal_charter": ["Identity", "Values", "Mission", "Commitments"],
        "reset_protocol": ["Acknowledge", "Understand", "Recommit"],
    }

    # Minimum section length (chars) to index
    MIN_SECTION_LENGTH = 50

    # Maximum section length before chunking
    MAX_SECTION_LENGTH = 2000

    # Overlap for chunking (chars)
    CHUNK_OVERLAP = 100

    def parse(
        self,
        content: Any,
        template_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> List[ParsedSection]:
        """
        Parse content into sections.

        Args:
            content: TipTap JSON or plain text
            template_id: Optional template ID for structure hints
            title: Journal title (may be prepended to first section)

        Returns:
            List of parsed sections
        """
        # Extract text with structure preserved
        if isinstance(content, dict):
            structured_content = self._extract_structured_content(content)
        else:
            structured_content = [
                {"type": "text", "content": str(content) if content else ""}
            ]

        # Try template-aware parsing first
        if template_id and template_id in self.TEMPLATE_SECTIONS:
            sections = self._parse_by_template(structured_content, template_id)
            if sections:
                return self._finalize_sections(sections, title)

        # Try header-based parsing
        sections = self._parse_by_headers(structured_content)
        if sections:
            return self._finalize_sections(sections, title)

        # Fallback to chunking
        full_text = self._flatten_to_text(structured_content)
        sections = self._parse_by_chunks(full_text)
        return self._finalize_sections(sections, title)

    def _extract_structured_content(
        self,
        node: dict,
        depth: int = 0
    ) -> List[dict]:
        """
        Extract content while preserving structure (headers, paragraphs).

        Returns list of {type, content, level} dicts.
        """
        results = []
        node_type = node.get("type", "")

        # Handle headings
        if node_type == "heading":
            level = node.get("attrs", {}).get("level", 1)
            text = self._extract_text_from_node(node)
            if text.strip():
                results.append({
                    "type": "heading",
                    "level": level,
                    "content": text.strip()
                })

        # Handle paragraphs
        elif node_type == "paragraph":
            text = self._extract_text_from_node(node)
            if text.strip():
                results.append({
                    "type": "paragraph",
                    "content": text.strip()
                })

        # Handle list items
        elif node_type in ("bulletList", "orderedList"):
            items = []
            for child in node.get("content", []):
                item_text = self._extract_text_from_node(child)
                if item_text.strip():
                    items.append(item_text.strip())
            if items:
                results.append({
                    "type": "list",
                    "content": "\n".join(f"• {item}" for item in items)
                })

        # Handle blockquotes
        elif node_type == "blockquote":
            text = self._extract_text_from_node(node)
            if text.strip():
                results.append({
                    "type": "blockquote",
                    "content": f'"{text.strip()}"'
                })

        # Recurse into children for container nodes
        elif node_type in ("doc", "document"):
            for child in node.get("content", []):
                results.extend(self._extract_structured_content(child, depth + 1))

        # Generic recursion for other nodes
        else:
            for child in node.get("content", []):
                if isinstance(child, dict):
                    results.extend(
                        self._extract_structured_content(child, depth + 1)
                    )

        return results

    def _extract_text_from_node(self, node: dict) -> str:
        """Recursively extract all text from a node."""
        if node.get("type") == "text":
            return node.get("text", "")

        texts = []
        for child in node.get("content", []):
            if isinstance(child, dict):
                texts.append(self._extract_text_from_node(child))

        return " ".join(texts)

    def _flatten_to_text(self, structured: List[dict]) -> str:
        """Flatten structured content to plain text."""
        parts = []
        for item in structured:
            content = item.get("content", "")
            if item["type"] == "heading":
                parts.append(f"\n\n## {content}\n")
            else:
                parts.append(content)
        return "\n\n".join(parts).strip()

    def _parse_by_template(
        self,
        structured: List[dict],
        template_id: str
    ) -> List[ParsedSection]:
        """
        Parse using known template section names.

        Looks for headings matching template sections.
        """
        section_names = self.TEMPLATE_SECTIONS.get(template_id, [])
        if not section_names:
            return []

        # Find section boundaries
        sections = []
        current_section = None
        current_content = []

        for item in structured:
            # Check if this is a section header
            if item["type"] == "heading":
                header_text = item["content"].strip()

                # Check if it matches a template section
                matched_section = None
                for section_name in section_names:
                    if section_name.lower() in header_text.lower():
                        matched_section = section_name
                        break

                if matched_section:
                    # Save previous section
                    if current_section and current_content:
                        sections.append(ParsedSection(
                            index=len(sections),
                            title=current_section,
                            content="\n\n".join(current_content),
                            section_type="template_section"
                        ))

                    # Start new section
                    current_section = matched_section
                    current_content = []
                    continue

            # Add content to current section
            if current_section:
                current_content.append(item["content"])
            elif item["content"].strip():
                # Content before first section - create intro section
                if not sections and not current_section:
                    current_section = "Introduction"
                    current_content = [item["content"]]

        # Don't forget last section
        if current_section and current_content:
            sections.append(ParsedSection(
                index=len(sections),
                title=current_section,
                content="\n\n".join(current_content),
                section_type="template_section"
            ))

        return sections

    def _parse_by_headers(self, structured: List[dict]) -> List[ParsedSection]:
        """
        Parse by H1/H2 headers.
        """
        sections = []
        current_title = None
        current_content = []

        for item in structured:
            if item["type"] == "heading" and item.get("level", 1) <= 2:
                # Save previous section
                if current_content:
                    sections.append(ParsedSection(
                        index=len(sections),
                        title=current_title or f"Section {len(sections) + 1}",
                        content="\n\n".join(current_content),
                        section_type="header"
                    ))

                # Start new section
                current_title = item["content"]
                current_content = []
            else:
                current_content.append(item["content"])

        # Last section
        if current_content:
            sections.append(ParsedSection(
                index=len(sections),
                title=current_title or f"Section {len(sections) + 1}",
                content="\n\n".join(current_content),
                section_type="header"
            ))

        # If only one section with no real header, return empty for chunking fallback
        if len(sections) == 1 and sections[0].title.startswith("Section "):
            return []

        return sections

    def _parse_by_chunks(self, text: str) -> List[ParsedSection]:
        """
        Fallback: split by token/character count with overlap.
        """
        if len(text) <= self.MAX_SECTION_LENGTH:
            return [ParsedSection(
                index=0,
                title="Content",
                content=text,
                section_type="chunk"
            )]

        sections = []
        start = 0
        chunk_size = self.MAX_SECTION_LENGTH

        while start < len(text):
            end = start + chunk_size

            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence end near the boundary
                search_start = max(start + chunk_size - 200, start)
                search_end = min(start + chunk_size + 100, len(text))
                search_region = text[search_start:search_end]

                # Find last sentence boundary
                for pattern in ['. ', '.\n', '? ', '?\n', '! ', '!\n']:
                    last_break = search_region.rfind(pattern)
                    if last_break != -1:
                        end = search_start + last_break + len(pattern)
                        break

            chunk_text = text[start:end].strip()
            if chunk_text and len(chunk_text) >= self.MIN_SECTION_LENGTH:
                sections.append(ParsedSection(
                    index=len(sections),
                    title=f"Part {len(sections) + 1}",
                    content=chunk_text,
                    section_type="chunk"
                ))

            # Move start with overlap
            start = end - self.CHUNK_OVERLAP if end < len(text) else end

        return sections

    def _finalize_sections(
        self,
        sections: List[ParsedSection],
        title: Optional[str]
    ) -> List[ParsedSection]:
        """
        Finalize sections: filter short ones, optionally prepend title.
        """
        # Filter out very short sections
        sections = [
            s for s in sections
            if len(s.content) >= self.MIN_SECTION_LENGTH
        ]

        # Re-index after filtering
        for i, section in enumerate(sections):
            section.index = i

        # Optionally prepend journal title to first section for context
        if title and sections:
            sections[0].content = f"[Journal: {title}]\n\n{sections[0].content}"

        return sections


# Singleton
_section_parser: Optional[SectionParser] = None


def get_section_parser() -> SectionParser:
    """Get singleton section parser instance."""
    global _section_parser
    if _section_parser is None:
        _section_parser = SectionParser()
    return _section_parser
