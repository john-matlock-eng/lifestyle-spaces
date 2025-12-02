"""
Test the JSON sanitizer with various quote types
"""
from app.utils.tiptap_converter import TipTapConverter
import json

# Test case 1: Unicode curly quotes (likely in actual database)
test_curly = '[{"id":"1","question":"Test?","answer":"He said \u201cHello\u201d to me.","isCollapsed":false}]'

print("Test 1: Unicode curly quotes")
print(f"Before: {repr(test_curly)}")
try:
    result = json.loads(test_curly)
    print("  FAILED: Should not parse without sanitization")
except json.JSONDecodeError:
    print("  Expected: JSON parse failed (curly quotes)")

sanitized = TipTapConverter._sanitize_json(test_curly)
print(f"After:  {repr(sanitized)}")
try:
    result = json.loads(sanitized)
    print(f"  SUCCESS: Parsed {len(result)} items")
    print(f"  Answer: {result[0]['answer']}")
except json.JSONDecodeError as e:
    print(f"  FAILED: {e}")

print("\n" + "=" * 60)

# Test case 2: Other Unicode quotes
test_various = '[{"id":"2","question":"Q","answer":"Mix of \u2018quotes\u2019 and \u201edouble\u201f and \u00abguillemets\u00bb.","isCollapsed":false}]'

print("Test 2: Various Unicode quote types")
sanitized = TipTapConverter._sanitize_json(test_various)
try:
    result = json.loads(sanitized)
    print(f"  SUCCESS: Parsed {len(result)} items")
    print(f"  Answer: {result[0]['answer']}")
except json.JSONDecodeError as e:
    print(f"  FAILED: {e}")

print("\n" + "=" * 60)

# Test case 3: Ellipsis and dashes
test_ellipsis = '[{"id":"3","question":"Q","answer":"Wait\u2026 that\u2019s\u2014amazing!","isCollapsed":false}]'

print("Test 3: Ellipsis and em-dash")
print(f"Before: {repr(test_ellipsis)}")
sanitized = TipTapConverter._sanitize_json(test_ellipsis)
print(f"After:  {repr(sanitized)}")
try:
    result = json.loads(sanitized)
    print(f"  SUCCESS: Parsed {len(result)} items")
    print(f"  Answer: {result[0]['answer']}")
except json.JSONDecodeError as e:
    print(f"  FAILED: {e}")
