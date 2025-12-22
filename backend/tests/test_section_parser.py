"""
Section Parser Tests
"""

import pytest
from app.services.section_parser import SectionParser, ParsedSection, get_section_parser


class TestSectionParser:
    """Tests for SectionParser."""

    @pytest.fixture
    def parser(self):
        return SectionParser()

    def test_parse_plain_text_short(self, parser):
        """Short text should be single section."""
        sections = parser.parse("This is a short journal entry that meets the minimum length requirement for indexing.")
        assert len(sections) == 1
        assert sections[0].title == "Content"
        assert sections[0].section_type == "chunk"

    def test_parse_template_sections(self, parser):
        """Should recognize template section headers."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Express"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "I feel anxious today about many things happening in my life and work."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Examine"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Why do I feel this way? Let me explore the underlying causes."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Evolve"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "I will practice mindfulness and take things one step at a time."}]},
            ]
        }

        sections = parser.parse(content, template_id="express_examine_evolve")

        assert len(sections) == 3
        assert sections[0].title == "Express"
        assert sections[1].title == "Examine"
        assert sections[2].title == "Evolve"
        assert "anxious" in sections[0].content

    def test_parse_header_based(self, parser):
        """Should split by H1/H2 headers."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Morning"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Started the day well with exercise and meditation practices."}]},
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Evening"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Reflected on the day and what I accomplished today successfully."}]},
            ]
        }

        sections = parser.parse(content)

        assert len(sections) == 2
        assert sections[0].title == "Morning"
        assert sections[1].title == "Evening"

    def test_extract_text_from_nested_content(self, parser):
        """Should handle nested TipTap structure."""
        content = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Hello "},
                        {"type": "text", "text": "world", "marks": [{"type": "bold"}]},
                        {"type": "text", "text": "! This is a longer paragraph to meet minimum length."},
                    ]
                }
            ]
        }

        sections = parser.parse(content)
        assert len(sections) == 1
        assert "Hello" in sections[0].content
        assert "world" in sections[0].content

    def test_filter_short_sections(self, parser):
        """Should filter out very short sections."""
        parser.MIN_SECTION_LENGTH = 50

        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Short"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Hi"}]},
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Long Section"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "This is a much longer section with enough content to meet the minimum length requirement for indexing."}]},
            ]
        }

        sections = parser.parse(content)

        # Short section should be filtered
        assert len(sections) == 1
        assert sections[0].title == "Long Section"

    def test_prepend_title_to_first_section(self, parser):
        """Should optionally prepend journal title."""
        sections = parser.parse(
            "This is the content of my journal entry that is long enough.",
            title="My Journal"
        )

        assert "[Journal: My Journal]" in sections[0].content

    def test_parse_list_content(self, parser):
        """Should handle list content."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "My List"}]},
                {
                    "type": "bulletList",
                    "content": [
                        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "First item in the list"}]}]},
                        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Second item in the list"}]}]},
                        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Third item in the list"}]}]},
                    ]
                }
            ]
        }

        sections = parser.parse(content)
        assert len(sections) == 1
        assert "First item" in sections[0].content

    def test_parse_blockquote(self, parser):
        """Should handle blockquote content."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Quote Section"}]},
                {
                    "type": "blockquote",
                    "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "This is a meaningful quote that inspires me daily."}]}
                    ]
                }
            ]
        }

        sections = parser.parse(content)
        assert len(sections) == 1
        assert "meaningful quote" in sections[0].content

    def test_chunk_long_text(self, parser):
        """Should chunk very long unstructured text."""
        parser.MAX_SECTION_LENGTH = 200
        parser.CHUNK_OVERLAP = 20

        long_text = "This is a sentence. " * 50  # Create long text

        sections = parser.parse(long_text)

        # Should have multiple chunks
        assert len(sections) > 1
        assert all(s.section_type == "chunk" for s in sections)
        assert all(s.title.startswith("Part ") for s in sections)

    def test_empty_content_returns_empty_list(self, parser):
        """Empty content should return empty list."""
        sections = parser.parse("")
        assert len(sections) == 0

    def test_none_content_returns_empty_list(self, parser):
        """None content should return empty list."""
        sections = parser.parse(None)
        assert len(sections) == 0

    def test_get_section_parser_singleton(self):
        """Should return singleton instance."""
        parser1 = get_section_parser()
        parser2 = get_section_parser()
        assert parser1 is parser2

    def test_daily_lens_template(self, parser):
        """Should recognize daily lens template sections."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "The Scene"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Describing what happened today in detail and context."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "My Reaction"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "How I felt about what happened and my emotional response."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "The Takeaway"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "What I learned from this experience and will apply."}]},
            ]
        }

        sections = parser.parse(content, template_id="daily_lens")

        assert len(sections) == 3
        assert sections[0].title == "The Scene"
        assert sections[1].title == "My Reaction"
        assert sections[2].title == "The Takeaway"

    def test_gratitude_template(self, parser):
        """Should recognize gratitude template sections."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Gratitude"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "I am grateful for my family, friends, and health today."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Reflection"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Reflecting on why these things matter to me deeply."}]},
            ]
        }

        sections = parser.parse(content, template_id="gratitude")

        assert len(sections) == 2
        assert sections[0].title == "Gratitude"
        assert sections[1].title == "Reflection"

    def test_section_indices_are_sequential(self, parser):
        """Section indices should be sequential after filtering."""
        content = {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "First"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Content for the first section that is long enough."}]},
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Second"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Content for the second section that is also long enough."}]},
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Third"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Content for the third section that meets the length requirement."}]},
            ]
        }

        sections = parser.parse(content)

        for i, section in enumerate(sections):
            assert section.index == i

    def test_introduction_section_for_pre_header_content(self, parser):
        """Content before first template section should create Introduction."""
        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Some introductory text before the main sections begin."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Express"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "I feel happy today about my accomplishments and growth."}]},
            ]
        }

        sections = parser.parse(content, template_id="express_examine_evolve")

        assert len(sections) == 2
        assert sections[0].title == "Introduction"
        assert sections[1].title == "Express"

    def test_is_section_dict_with_tiptap_sections(self, parser):
        """Should detect contentTiptap with section keys."""
        content = {
            "raw_thoughts": {"type": "doc", "content": []},
            "deep_dive": {"type": "doc", "content": []},
            "action_plan": {"type": "doc", "content": []},
            "content": {"type": "doc", "content": []}
        }
        assert parser._is_section_dict(content) is True

    def test_is_section_dict_with_single_tiptap_doc(self, parser):
        """Should not detect single TipTap doc as section dict."""
        content = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}
            ]
        }
        assert parser._is_section_dict(content) is False

    def test_is_section_dict_with_empty_content_only(self, parser):
        """Should not detect dict with only 'content' key."""
        content = {
            "content": {"type": "doc", "content": []}
        }
        assert parser._is_section_dict(content) is False

    def test_parse_section_dict_express_examine_evolve(self, parser):
        """Should parse Express/Examine/Evolve section dict."""
        content = {
            "raw_thoughts": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "I feel anxious about the upcoming presentation at work."}
                    ]}
                ]
            },
            "deep_dive": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "Why do I feel this way? Let me examine my thoughts."}
                    ]}
                ]
            },
            "action_plan": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "I will practice my presentation and prepare thoroughly."}
                    ]}
                ]
            },
            "content": {"type": "doc", "content": []}
        }

        sections = parser._parse_section_dict(content)

        assert len(sections) == 3
        assert sections[0].title == "Express"
        assert sections[1].title == "Examine"
        assert sections[2].title == "Evolve"
        assert "anxious" in sections[0].content
        assert "examine" in sections[1].content.lower()
        assert "practice" in sections[2].content

    def test_parse_section_dict_with_qa_list(self, parser):
        """Should parse Q&A list format in section dict."""
        content = {
            "deep_dive": [
                {"question": "What triggered this feeling?", "answer": "A comment from my colleague made me defensive."},
                {"question": "Why did it affect me?", "answer": "I value being seen as competent."}
            ],
            "content": {"type": "doc", "content": []}
        }

        sections = parser._parse_section_dict(content)

        assert len(sections) == 1
        assert sections[0].title == "Examine"
        assert "What triggered" in sections[0].content
        assert "defensive" in sections[0].content

    def test_parse_section_dict_with_qa_json_string(self, parser):
        """Should parse Q&A JSON string format in section dict."""
        import json
        qa_list = [
            {"question": "What happened?", "answer": "I got feedback that surprised me."},
            {"question": "How did I react?", "answer": "I became defensive immediately."}
        ]
        content = {
            "deep_dive": json.dumps(qa_list),
            "content": {"type": "doc", "content": []}
        }

        sections = parser._parse_section_dict(content)

        assert len(sections) == 1
        assert sections[0].title == "Examine"
        assert "Q: What happened?" in sections[0].content
        assert "A: I got feedback" in sections[0].content

    def test_parse_section_dict_filters_empty_sections(self, parser):
        """Should filter out empty sections in section dict."""
        content = {
            "raw_thoughts": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "This section has enough content to be indexed properly."}
                    ]}
                ]
            },
            "deep_dive": {"type": "doc", "content": []},  # Empty
            "action_plan": {"type": "doc", "content": []},  # Empty
            "content": {"type": "doc", "content": []}
        }

        sections = parser._parse_section_dict(content)

        assert len(sections) == 1
        assert sections[0].title == "Express"

    def test_parse_via_section_dict_detection(self, parser):
        """parse() should detect and use section dict parsing."""
        content = {
            "raw_thoughts": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "Express: I am feeling overwhelmed with work today."}
                    ]}
                ]
            },
            "action_plan": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "Evolve: I will take breaks and prioritize tasks."}
                    ]}
                ]
            },
            "content": {"type": "doc", "content": []}
        }

        sections = parser.parse(content, title="My Journal")

        assert len(sections) == 2
        assert sections[0].title == "Express"
        assert sections[1].title == "Evolve"
        assert "[Journal: My Journal]" in sections[0].content

    def test_parse_markdown_with_section_comments(self, parser):
        """Should parse markdown with HTML comment section markers."""
        content = '''
<!-- section:raw_thoughts @title:"Express" -->
I feel really stressed about the project deadline approaching.
<!-- /section:raw_thoughts -->

<!-- section:deep_dive @title:"Examine" -->
Why am I stressed? The scope keeps changing and I feel out of control.
<!-- /section:deep_dive -->

<!-- section:action_plan @title:"Evolve" -->
I will communicate with the team about realistic timelines.
<!-- /section:action_plan -->
'''

        sections = parser._parse_markdown_sections(content)

        assert len(sections) == 3
        assert sections[0].title == "Express"
        assert sections[1].title == "Examine"
        assert sections[2].title == "Evolve"
        assert "stressed" in sections[0].content

    def test_parse_markdown_deep_dive_with_qa_json(self, parser):
        """Should parse Q&A JSON in markdown deep_dive section."""
        import json
        qa_list = [
            {"question": "What happened?", "answer": "I received critical feedback."},
            {"question": "How did I feel?", "answer": "I felt defensive and hurt."}
        ]
        content = f'''
<!-- section:deep_dive @title:"Examine" -->
{json.dumps(qa_list)}
<!-- /section:deep_dive -->
'''

        sections = parser._parse_markdown_sections(content)

        assert len(sections) == 1
        assert sections[0].title == "Examine"
        assert "Q: What happened?" in sections[0].content
        assert "A: I received critical feedback" in sections[0].content

    def test_parse_calls_markdown_sections_for_html_comments(self, parser):
        """parse() should use markdown section parsing for HTML comments."""
        content = '''
<!-- section:raw_thoughts @title:"Express" -->
I am feeling optimistic about the future and my growth journey.
<!-- /section:raw_thoughts -->
'''

        sections = parser.parse(content, title="My Journal")

        assert len(sections) == 1
        assert sections[0].title == "Express"
        assert "[Journal: My Journal]" in sections[0].content
