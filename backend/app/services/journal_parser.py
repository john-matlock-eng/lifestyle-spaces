"""
Journal content parser for extracting embedded template metadata.

This module provides functionality to parse journal content with embedded
template structures using HTML comments, similar to the frontend JournalContentManager.
"""
import re
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field


@dataclass
class ParsedSection:
    """Represents a parsed journal section."""
    content: str
    title: Optional[str] = None
    type: Optional[str] = None
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParsedJournal:
    """Represents a fully parsed journal with embedded metadata."""
    template: Optional[str] = None
    template_version: Optional[str] = None
    created: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    sections: Dict[str, ParsedSection] = field(default_factory=dict)
    raw_content: str = ""


class JournalParser:
    """Parse and extract metadata from journal content with embedded templates."""

    # Regex patterns for parsing
    METADATA_LINE = re.compile(r'^@(\w+):\s*(.+)')
    SECTION_START = re.compile(r'^<!--\s*section:(\w+)(.*?)-->')
    SECTION_END = re.compile(r'^<!--\s*/section:(\w+)\s*-->')
    ATTRIBUTE_PATTERN = re.compile(r'@(\w+):"([^"]+)"|@(\w+):(\S+)')

    @classmethod
    def parse(cls, content: str) -> ParsedJournal:
        """
        Parse journal content with embedded metadata.

        Args:
            content: The journal content string with embedded HTML comment metadata

        Returns:
            ParsedJournal object containing extracted metadata and sections
        """
        if not content:
            return ParsedJournal(raw_content=content)

        lines = content.split('\n')
        result = ParsedJournal(raw_content=content)

        in_metadata = False
        current_section = None
        section_content = []
        section_attrs = {}

        for i, line in enumerate(lines):
            stripped = line.strip()

            # Start of metadata block
            if stripped == '<!--':
                in_metadata = True
                continue

            # End of metadata block
            if stripped == '-->' and in_metadata:
                in_metadata = False
                continue

            # Parse metadata fields
            if in_metadata:
                match = cls.METADATA_LINE.match(stripped)
                if match:
                    key, value = match.groups()
                    if key == 'metadata':
                        try:
                            result.metadata = json.loads(value)
                        except json.JSONDecodeError as e:
                            # Log error but continue parsing
                            print(f"Failed to parse metadata JSON: {value}, error: {e}")
                    elif key == 'template':
                        result.template = value
                    elif key == 'version':
                        result.template_version = value
                    elif key == 'created':
                        result.created = value
                continue

            # Section start
            section_match = cls.SECTION_START.match(stripped)
            if section_match:
                # Save previous section if exists
                if current_section:
                    result.sections[current_section] = ParsedSection(
                        content='\n'.join(section_content),
                        **section_attrs
                    )

                current_section = section_match.group(1)
                attrs_string = section_match.group(2) if len(section_match.groups()) > 1 else ""
                section_attrs = cls._parse_attributes(attrs_string)
                section_content = []
                continue

            # Section end
            end_match = cls.SECTION_END.match(stripped)
            if end_match and current_section == end_match.group(1):
                result.sections[current_section] = ParsedSection(
                    content='\n'.join(section_content),
                    **section_attrs
                )
                current_section = None
                section_content = []
                section_attrs = {}
                continue

            # Collect section content (preserve original formatting)
            if current_section:
                section_content.append(lines[i])  # Use original line with spacing

        # Handle unclosed section
        if current_section:
            result.sections[current_section] = ParsedSection(
                content='\n'.join(section_content),
                **section_attrs
            )

        return result

    @classmethod
    def _parse_attributes(cls, attr_string: str) -> Dict[str, Any]:
        """
        Parse section attributes from comment string.

        Supports both quoted and unquoted attributes:
        - @title:"My Title" (quoted)
        - @type:list (unquoted)

        Args:
            attr_string: The attribute string to parse

        Returns:
            Dictionary with known fields (title, type) and extras in 'attributes'
        """
        # Parse all attributes
        all_attrs = {}
        for match in cls.ATTRIBUTE_PATTERN.finditer(attr_string):
            if match.group(1) and match.group(2):
                # Quoted attribute
                all_attrs[match.group(1)] = match.group(2)
            elif match.group(3) and match.group(4):
                # Unquoted attribute
                all_attrs[match.group(3)] = match.group(4)

        # Separate known fields from extra attributes
        result = {}
        extra_attrs = {}

        for key, value in all_attrs.items():
            if key == 'title':
                result['title'] = value
            elif key == 'type':
                result['type'] = value
            else:
                extra_attrs[key] = value

        if extra_attrs:
            result['attributes'] = extra_attrs

        return result

    @classmethod
    def extract_searchable_metadata(cls, content: str) -> Dict[str, Any]:
        """
        Extract metadata fields for database indexing and searching.

        This method extracts key information from the journal content that can be
        used for searching, filtering, and displaying journal metadata.

        Args:
            content: The journal content with embedded metadata

        Returns:
            Dictionary of searchable metadata fields
        """
        parsed = cls.parse(content)

        # Combine metadata from different sources
        searchable = {
            'template': parsed.template,
            'template_version': parsed.template_version,
            'created_from_template': parsed.created,
            'has_sections': bool(parsed.sections),
            'section_count': len(parsed.sections),
            'section_ids': list(parsed.sections.keys()),
        }

        # Add any custom metadata fields from embedded metadata
        for key, value in parsed.metadata.items():
            if isinstance(value, (str, int, float, bool)):
                searchable[key] = value
            elif key == 'emotions' and isinstance(value, list):
                searchable['emotions'] = value
            elif isinstance(value, list):
                # Handle other list types
                searchable[key] = value

        return searchable

    @classmethod
    def extract_clean_markdown(cls, content: str) -> str:
        """
        Extract just the markdown content without metadata comments.

        This is useful for displaying the journal content or for full-text search
        without the metadata noise.

        Args:
            content: The journal content with embedded metadata

        Returns:
            Clean markdown content string
        """
        lines = []
        in_metadata = False

        for line in content.split('\n'):
            stripped = line.strip()

            # Skip metadata blocks
            if stripped == '<!--':
                in_metadata = True
                continue
            if stripped == '-->' and in_metadata:
                in_metadata = False
                continue
            if in_metadata:
                continue

            # Skip section markers
            if cls.SECTION_START.match(stripped) or cls.SECTION_END.match(stripped):
                continue

            # Keep regular content
            if not stripped.startswith('<!--'):
                lines.append(line)

        # Clean up extra newlines
        result = '\n'.join(lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        return result.strip()
