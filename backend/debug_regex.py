"""Debug script to test section regex patterns"""
import re

# The current regex pattern from TipTapConverter
section_pattern = r'<!-- section:(\w+).*?@type:(\w+).*?-->(.*?)<!-- /section:\1 -->'

# Test cases for different section name formats
test_cases = [
    # Underscore (expected to work)
    ('deep_dive', '''<!-- section:deep_dive @title:"Deep Dive" @type:q_and_a -->
[{"id": "q1", "question": "Test?", "answer": "Yes", "isCollapsed": false}]
<!-- /section:deep_dive -->'''),

    # Hyphen (might not work with \w+)
    ('deep-dive', '''<!-- section:deep-dive @title:"Deep Dive" @type:q_and_a -->
[{"id": "q1", "question": "Test?", "answer": "Yes", "isCollapsed": false}]
<!-- /section:deep-dive -->'''),

    # Camel case
    ('deepDive', '''<!-- section:deepDive @title:"Deep Dive" @type:q_and_a -->
[{"id": "q1", "question": "Test?", "answer": "Yes", "isCollapsed": false}]
<!-- /section:deepDive -->'''),

    # With extra whitespace
    ('deep_dive_ws', '''<!-- section:deep_dive @title:"Deep Dive" @type:q_and_a -->

[{"id": "q1", "question": "Test?", "answer": "Yes", "isCollapsed": false}]

<!-- /section:deep_dive -->'''),
]

print("Testing section regex patterns:\n")
print(f"Pattern: {section_pattern}\n")

for name, content in test_cases:
    matches = list(re.finditer(section_pattern, content, re.DOTALL))

    if matches:
        print(f"[OK] '{name}' - MATCHED")
        for match in matches:
            section_id = match.group(1)
            section_type = match.group(2)
            section_content = match.group(3).strip()
            print(f"  - ID: {section_id}, Type: {section_type}")
            print(f"  - Content length: {len(section_content)} chars")
    else:
        print(f"[FAIL] '{name}' - NO MATCH")
    print()
