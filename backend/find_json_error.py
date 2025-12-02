"""
Find the exact JSON parsing error
"""
import re

journal_content = open(r'C:\github\lifestyle-spaces\backend\test_actual_journal.py', 'r', encoding='utf-8').read()

# Extract just the deep_dive section content
section_pattern = r'<!-- section:deep_dive.*?-->(.*?)<!-- /section:deep_dive -->'
match = re.search(section_pattern, journal_content, re.DOTALL)

if match:
    section_content = match.group(1).strip()

    print("Section content length:", len(section_content))
    print("\nCharacter 410-420:")
    print(repr(section_content[410:420]))
    print("\nCharacter 400-430:")
    print(repr(section_content[400:430]))

    print("\nFull section content:")
    print(section_content)
else:
    print("No match found")
