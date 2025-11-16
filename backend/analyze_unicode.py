"""
Analyze Unicode characters in the user's journal deep_dive section
"""

# This is the EXACT content from the user's contentTiptap JSON they pasted
user_content = '''[{"id":"d5f513ab-6c84-425b-8e60-107bf40f0d3d","question":"Why did my first attempt to intervene fail so catastrophically?","answer":"Because I attacked the *fantasy*. He's not in this for logic; he's in it for how she makes him feel. She didn't just promise him love; she actually *improved his life* at first. She helped him quit smoking and get fit. She made him feel *good* about himself. When I called it a "scam," he didn't hear "I'm trying to protect you." He heard "You are a fool, and you're not worthy of a woman like that loving you." I made him feel stupid. He chose the fantasy, which makes him feel good, over me, who made him feel awful.","isCollapsed":false}]'''

print("Analyzing quote characters...")
for i, char in enumerate(user_content):
    if char in ['"', '"', '"', "'", "'", '"']:
        codepoint = ord(char)
        print(f"Position {i}: {repr(char)} = U+{codepoint:04X} ({codepoint})")

print("\n" + "=" * 60)
print("Checking character at position 411-417...")
print(f"Context: {repr(user_content[405:420])}")

for i in range(410, 418):
    if i < len(user_content):
        print(f"  {i}: {repr(user_content[i])} = U+{ord(user_content[i]):04X}")
