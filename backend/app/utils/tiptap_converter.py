"""
TipTap Converter - Auto-migrate markdown journals to TipTap format

Converts old markdown-based journals to TipTap JSON structure.
This enables seamless migration from dual storage to TipTap-only.
"""
import re
import json
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class TipTapConverter:
    """Convert markdown content to TipTap JSON format."""

    @staticmethod
    def markdown_to_tiptap(content: str) -> Dict[str, Any]:
        """
        Convert markdown string to TipTap document.

        Handles:
        - Paragraphs
        - Bold (**text**)
        - Italic (*text*)
        - Lists
        - Line breaks

        Args:
            content: Markdown string

        Returns:
            TipTap document structure
        """
        if not content or not content.strip():
            return {
                "type": "doc",
                "content": [
                    {"type": "paragraph"}
                ]
            }

        paragraphs = content.split('\n\n')
        tiptap_content = []

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # Check if it's a list item
            if para.startswith('- ') or para.startswith('* '):
                # Handle bullet list
                items = [line[2:].strip() for line in para.split('\n') if line.strip().startswith(('- ', '* '))]
                if items:
                    list_items = []
                    for item in items:
                        list_items.append({
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": TipTapConverter._parse_inline_text(item)
                                }
                            ]
                        })
                    tiptap_content.append({
                        "type": "bulletList",
                        "content": list_items
                    })
            else:
                # Regular paragraph
                tiptap_content.append({
                    "type": "paragraph",
                    "content": TipTapConverter._parse_inline_text(para)
                })

        if not tiptap_content:
            tiptap_content = [{"type": "paragraph"}]

        return {
            "type": "doc",
            "content": tiptap_content
        }

    @staticmethod
    def _parse_inline_text(text: str) -> List[Dict[str, Any]]:
        """
        Parse inline formatting (bold, italic) into TipTap text nodes.

        Args:
            text: Plain text with markdown formatting

        Returns:
            List of TipTap text nodes with marks
        """
        if not text:
            return []

        nodes = []
        pos = 0

        # Pattern to match **bold** and *italic*
        pattern = r'(\*\*.*?\*\*|\*.*?\*)'
        parts = re.split(pattern, text)

        for part in parts:
            if not part:
                continue

            if part.startswith('**') and part.endswith('**'):
                # Bold text
                nodes.append({
                    "type": "text",
                    "text": part[2:-2],
                    "marks": [{"type": "bold"}]
                })
            elif part.startswith('*') and part.endswith('*'):
                # Italic text
                nodes.append({
                    "type": "text",
                    "text": part[1:-1],
                    "marks": [{"type": "italic"}]
                })
            else:
                # Plain text
                nodes.append({
                    "type": "text",
                    "text": part
                })

        return nodes if nodes else [{"type": "text", "text": text}]

    @staticmethod
    def parse_template_content(content: str) -> Optional[Dict[str, Any]]:
        """
        Parse template-based markdown content and convert to multi-section TipTap.

        Extracts HTML comment sections and converts each to TipTap format.

        Args:
            content: Markdown with embedded template sections

        Returns:
            Multi-section TipTap structure or None if not a template
        """
        # Check if this is template-based content
        if '<!-- section:' not in content:
            return None

        sections = {}

        # Pattern: <!-- section:id @title:"Title" @type:type -->content<!-- /section:id -->
        section_pattern = r'<!-- section:(\w+).*?@type:(\w+).*?-->(.*?)<!-- /section:\1 -->'
        matches = re.finditer(section_pattern, content, re.DOTALL)

        for match in matches:
            section_id = match.group(1)
            section_type = match.group(2)
            section_content = match.group(3).strip()

            if section_type == 'paragraph':
                # Convert to TipTap
                sections[section_id] = TipTapConverter.markdown_to_tiptap(section_content)
            elif section_type == 'q_and_a':
                # Parse Q&A JSON and convert to TipTap with custom qaPair nodes
                try:
                    qa_pairs = json.loads(section_content)
                    sections[section_id] = TipTapConverter._qa_to_tiptap(qa_pairs)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse Q&A section {section_id}")
                    sections[section_id] = TipTapConverter.markdown_to_tiptap(section_content)
            else:
                # Other types - convert as paragraph for now
                sections[section_id] = TipTapConverter.markdown_to_tiptap(section_content)

        return sections if sections else None

    @staticmethod
    def _qa_to_tiptap(qa_pairs: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Convert Q&A pairs to TipTap document with custom qaPair nodes.

        Args:
            qa_pairs: List of {id, question, answer, isCollapsed} dicts

        Returns:
            TipTap document with qaPair nodes
        """
        content = []

        for pair in qa_pairs:
            content.append({
                "type": "qaPair",
                "attrs": {
                    "id": pair.get("id", ""),
                    "question": pair.get("question", ""),
                    "answer": pair.get("answer", ""),
                    "isCollapsed": pair.get("isCollapsed", False)
                }
            })

        return {
            "type": "doc",
            "content": content if content else [{"type": "paragraph"}]
        }

    @staticmethod
    def auto_migrate_journal(journal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Auto-migrate old journal format to TipTap-only.

        If journal has content but no contentTiptap, converts it.
        If journal has contentTiptap, returns as-is.

        Args:
            journal_data: Journal dict from database

        Returns:
            Journal dict with contentTiptap populated
        """
        # Already has TipTap content - no migration needed
        if journal_data.get('content_tiptap'):
            return journal_data

        content = journal_data.get('content', '')

        # Try template parsing first
        tiptap_content = TipTapConverter.parse_template_content(content)

        # If not a template, convert as simple markdown
        if tiptap_content is None:
            tiptap_content = TipTapConverter.markdown_to_tiptap(content)

        journal_data['content_tiptap'] = tiptap_content
        logger.info(f"Auto-migrated journal {journal_data.get('journal_id')} to TipTap format")

        return journal_data
