"""
Debug script to test why deep_dive section is not being parsed
"""
import json
from app.utils.tiptap_converter import TipTapConverter

# Simulate actual journal content from Express, Examine, Evolve template
journal_content = '''<!-- section:raw_thoughts @title:"Express" @type:paragraph -->
This is my raw thought content. I'm feeling stressed about work.
<!-- /section:raw_thoughts -->

<!-- section:deep_dive @title:"Examine" @type:q_and_a -->
[
  {
    "id": "qa1",
    "question": "What triggered this feeling?",
    "answer": "The deadline approaching",
    "isCollapsed": false
  },
  {
    "id": "qa2",
    "question": "What's beneath the surface?",
    "answer": "Fear of failure",
    "isCollapsed": false
  },
  {
    "id": "qa3",
    "question": "What pattern am I repeating?",
    "answer": "Perfectionism",
    "isCollapsed": false
  }
]
<!-- /section:deep_dive -->

<!-- section:action_plan @title:"Evolve" @type:paragraph -->
I will break tasks into smaller chunks and set realistic goals.
<!-- /section:action_plan -->
'''

print("Testing deep_dive section parsing...\n")
print("=" * 60)

# Test parse_template_content
result = TipTapConverter.parse_template_content(journal_content)

print(f"\nParsed sections: {list(result.keys()) if result else 'None'}")
print("=" * 60)

if result:
    for section_id, section_content in result.items():
        print(f"\nSection: {section_id}")
        print(f"  Type: {section_content.get('type')}")

        if 'content' in section_content:
            content_items = section_content['content']
            print(f"  Content items: {len(content_items)}")

            for i, item in enumerate(content_items):
                print(f"    [{i}] Type: {item.get('type')}")
                if item.get('type') == 'qaPair':
                    attrs = item.get('attrs', {})
                    print(f"        Question: {attrs.get('question')}")
                    print(f"        Answer: {attrs.get('answer')}")

print("\n" + "=" * 60)
print("\nTesting auto_migrate_journal...")
print("=" * 60)

# Test full auto-migration
journal_data = {
    "journal_id": "test123",
    "content": journal_content,
    "template_id": "express_examine_evolve"
}

migrated = TipTapConverter.auto_migrate_journal(journal_data)

if 'content_tiptap' in migrated:
    tiptap = migrated['content_tiptap']
    print(f"\nMigrated content_tiptap keys: {list(tiptap.keys())}")

    for key in ['raw_thoughts', 'deep_dive', 'action_plan']:
        if key in tiptap:
            print(f"  ✓ {key}: present")
        else:
            print(f"  ✗ {key}: MISSING")
else:
    print("\n✗ content_tiptap not created!")

print("\n" + "=" * 60)
print("\nFull content_tiptap structure:")
print(json.dumps(migrated.get('content_tiptap'), indent=2))
