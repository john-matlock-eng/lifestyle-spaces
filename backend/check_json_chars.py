"""
Check for problematic characters in the JSON
"""
import json

# The ACTUAL deep_dive JSON from the user's journal
json_str = r'''[{"id":"d5f513ab-6c84-425b-8e60-107bf40f0d3d","question":"Why did my first attempt to intervene fail so catastrophically?","answer":"Because I attacked the *fantasy*. He's not in this for logic; he's in it for how she makes him feel. She didn't just promise him love; she actually *improved his life* at first. She helped him quit smoking and get fit. She made him feel *good* about himself. When I called it a "scam," he didn't hear "I'm trying to protect you." He heard "You are a fool, and you're not worthy of a woman like that loving you." I made him feel stupid. He chose the fantasy, which makes him feel good, over me, who made him feel awful.","isCollapsed":false},{"id":"00ddee02-6a61-4757-bc09-4f2f48653263","question":"What is the story I'm telling myself?","answer":"I'm telling myself I'm the one who can save him, that I'm the "fixer," and that if I don't stop this, I'm a bad son. This story puts all the responsibility on *me* to have the perfect, silver-bullet conversation that snaps him out of it, which is why I'm so paralyzed with stress.","isCollapsed":false}]'''

print("Checking characters around position 412...")
print(f"Character 412: {repr(json_str[412])} (ord: {ord(json_str[412])})")
print(f"Characters 400-430: {repr(json_str[400:430])}")

print("\nLooking for problematic quote characters...")
for i, char in enumerate(json_str):
    if char in ['"', '"', '"']:  # Curly quotes
        print(f"Found curly quote at position {i}: {repr(char)} (ord: {ord(char)})")

print("\nAttempting to parse JSON...")
try:
    result = json.loads(json_str)
    print(f"SUCCESS! Parsed {len(result)} Q&A pairs")
except json.JSONDecodeError as e:
    print(f"FAILED: {e}")
    print(f"Position: {e.pos}")
    if e.pos and e.pos < len(json_str):
        print(f"Character at error pos: {repr(json_str[e.pos-5:e.pos+5])}")
