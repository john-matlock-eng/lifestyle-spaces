"""
Test with the actual journal content from the user
"""
import json
from app.utils.tiptap_converter import TipTapConverter

# EXACT content from user's journal
journal_content = '''<!--
@template: express_examine_evolve
@version: 1
@created: 2025-11-14T05:11:13.677Z
@metadata: {"title":"The 4k Problem","emotions":["sad","despair","guilty","ashamed","hurt","hurt_disappointed","bad","stressed","fearful","anxious","worried"]}
-->

<!-- section:raw_thoughts @title:"Express" @type:paragraph -->
I am so sick to my stomach. I saw my dad's WhatsApp on his TV, and he's planning to send that "woman" **four thousand dollars** this month. He wrote, "my gift... will be a little light... it would *only* be 4k." ONLY?! This is a man in his 70s, driving *Lyft* because he lost his retirement to other schemes. He has no savings. He lives with my uncle. And he's sending $4,000 to a person who is so obviously, painfully, a scammer.

It's been *three years* of this. This "mid-30s, model-pretty, successful real estate manager" who is "stuck" in New York trying to sell a "multi-million-dollar home." It's a textbook romance scam. I *tried* to tell him this two years ago. I pointed out how it started, how it was a common scam.

And his reaction? He shut me down completely. He accused me of thinking he "wasn't worth loving." It was like I'd stabbed him in the heart. He got so angry that my uncle had to pull me aside and tell me to back off, that I was pushing him away.

The most painful part is that he *promised* me. In the beginning, he swore she'd never brought up money. He was so happy. She helped him quit smoking and get healthy; I saw the life come back into his eyes. He promised me he would tell me if she *ever* brought up crypto or asked for money. He broke that promise. I only found out about the crypto scheme because he got my uncle to *also* invest $500. And now this $4,000. It's not just the scam; it's the lying. And it has to have been going on this entire time; even when he's asked me for help a few times (3 x \~$250).

I feel furious at this woman for her cruelty. I feel terrified for my dad's future… he has *nothing*. And I'm so frustrated with *him* for his stubbornness and his lies. I have to do something. This is insane.

**Reframe:** My initial feeling is panic and a desperate need to "fix this." But this isn't a simple problem I can solve with facts. If I go in "hot" with "I told you so," I will get the exact same result. This is not a logical problem; it's an emotional one, tied directly to his pride, his deep loneliness, and his need to feel worthy.
<!-- /section:raw_thoughts -->

<!-- section:deep_dive @title:"Examine" @type:q_and_a -->
[{"id":"d5f513ab-6c84-425b-8e60-107bf40f0d3d","question":"Why did my first attempt to intervene fail so catastrophically?","answer":"Because I attacked the *fantasy*. He's not in this for logic; he's in it for how she makes him feel. She didn't just promise him love; she actually *improved his life* at first. She helped him quit smoking and get fit. She made him feel *good* about himself. When I called it a \"scam,\" he didn't hear \"I'm trying to protect you.\" He heard \"You are a fool, and you're not worthy of a woman like that loving you.\" I made him feel stupid. He chose the fantasy, which makes him feel good, over me, who made him feel awful.","isCollapsed":false},{"id":"00ddee02-6a61-4757-bc09-4f2f48653263","question":"What is the story I'm telling myself?","answer":"I'm telling myself I'm the one who can save him, that I'm the \"fixer,\" and that if I don't stop this, I'm a bad son. This story puts all the responsibility on *me* to have the perfect, silver-bullet conversation that snaps him out of it, which is why I'm so paralyzed with stress.","isCollapsed":false},{"id":"ecffbaaf-a12a-4436-b154-93c21f2e38e0","question":"What is the real story from his perspective?","answer":"He's a lonely man who lost his wife. He's ashamed that he lost his retirement and has to live with family and drive Lyft in his 70s. I think his pride is shattered. This \"relationship\" is the one thing in his life that makes him feel like a \"man\" again… healthy, desirable, and smart. The $4,000 isn't a \"gift\"; it's the price of admission to a fantasy that's holding his self-worth together. He's not just being scammed out of money; he's *paying* for a feeling. And he's in too deep. He'd have to admit *he* was the fool all along, and his pride won't let him.","isCollapsed":false},{"id":"cce1c075-4a1f-483b-8b97-ed56599a4ecc","question":"What pattern am I in danger of repeating?","answer":"The parent-child role-reversal. Me, the logical \"parent,\" scolding him, the \"bad child.\" This will *never* work with him. It just makes him dig in his heels.","isCollapsed":false},{"id":"be3c9351-d19c-4c62-a51d-f1e39e639cde","question":"What's really under my panic? It's not just love for him.","answer":"It's fear. I'm watching him, a man who lost his retirement to schemes, *still* falling for schemes. It's a loss of control. It terrifies me on a personal level. Is this what happens? Do we just lose the ability to see reason? I'm afraid for *him*, and honestly for myself if this is what happens.","isCollapsed":false},{"id":"8c14a714-9d81-44f4-9363-9fa6b2c1e53e","question":"He broke his promise. Why does that hurt so much?","answer":"Because it wasn't just a promise; it was a pact. He was supposed to be my partner in protecting himself, and he broke that pact. It means he *chose* her over me. He chose the fantasy over our trust. It makes me feel powerless and betrayed. It also confirms he's been lying to me this whole time.","isCollapsed":false},{"id":"9cca0edc-68ca-43e7-bf5a-80d777b2ae75","question":"How does the fact that I also gave him money (~$750) complicate this?","answer":"It makes me feel complicit. I've been enabling him, too, just on a smaller scale. I'm angry at him for sending money to a scammer, but I also sent money, *knowing* he was in a financially precarious spot. Did my money just go to her? Am I angry at him, or angry at myself for being part of this? It blurs the lines. It makes it harder for me to be the \"logical\" one when I've also been acting on emotion (guilt, love, a desire to help). It makes me feel like a hypocrite.","isCollapsed":false},{"id":"f6608d44-c097-428d-bfa1-2d253d9267be","question":"How does this connect to my passivity with her?","answer":"This might be the core of it. The last time I was *active* and intervened in a high-stakes emotional situation with my dad, it blew up in my face. I've been told I was the problem and to back off. Now, I'm in another high-stakes emotional situation, and my instinct is to be \"passive,\" and hope that she knows how I feel because I'm terrified that if I'm direct with my wants, i**t will make a situation harder for her. And, honestly, for me.**","isCollapsed":false},{"id":"45a1e86a-8575-4e7f-bdc3-b79fdb8d9824","question":"And how does AJ's situation fit in?","answer":"It's the trifecta. It's a *third* situation where I see something wrong (Darrell yelling at her) and I feel like I should \"fix it\" or \"intervene.\" But again, I've been explicitly told to \"not say anything.\" I'm being forced into passivity. So I have all this \"fixer\" energy and all this anxiety, but I'm being told by *everyone* (Dad, AJ) that my intervention is unwanted and wrong. It's no wonder I'm just shutting down completely.","isCollapsed":false}]
<!-- /section:deep_dive -->

<!-- section:action_plan @title:"Evolve" @type:paragraph -->
I cannot control him. I can only control my own approach. Panicking will lead to another fight. This needs to be a new strategy.

**1. Build a Team. Do NOT Go In Alone. (This is now complicated.)**\\
My first call is *still* to my uncle and aunt. But this is delicate. My uncle *also* invested $500. He may be embarrassed or defensive, which could make him an unreliable ally. I can't go in accusingly.

- **Strategy:** "Uncle Darrell, I need to talk to you about Dad, and I feel awful. I saw something that has me terrified for him. I saw he's planning to send $4,000 to that woman. He should be saving that money for a rainy day or when he can't work. He's setting himself up for catastrophic emotional and financial ruin. Can we please talk about this, just us, before I say anything to him?" I need to gauge his reaction. Is he an ally, will he tell me to leave it along again, or is he in denial too?

**2. Lead with Love and Concern, Not Facts.**\\
The *only* way to start this conversation with my dad is with "Dad, I love you, and I am terrified for *you*." No "she," "her," or "scam" at a beginning. The focus *must* be on him and his well-being.

**3. Attack the *Money* and the *Broken Promise*, Not the *Woman*.**\\
This is the new strategy.

- **The Money:** "Dad, I saw you're sending $4,000. We have to talk about that. I'm worried about *your* future. You are driving Lyft every single day. What happens if the car breaks down? What happens if you have a medical bill?" Frame it as a financial crisis, not a romance crisis.

- **The Promise:** "A couple of years ago, you promised me you'd tell me if she ever asked for money or brought up crypto. I found out you got Uncle Darrell to invest, and now I see this $4,000. I'm not just scared; I'm *hurt* because you broke your promise to me. That's what tells me this is something to be terrified of."

**4. Report the Crime (For My Own Sanity).** I am going to research and file reports with the FBI Internet Crime Complaint Center and the Federal Trade Commission. This won't get the money back, but it's an *action* I can take. It will make me feel less helpless.

**5. Prepare for the "Not Worth Loving" Defense.**\\
He will almost certainly use this again. The counter-argument *must* be ready.

- "Dad, this has nothing to with you being worthy of love. You are the most lovable man I know. This is about your *safety*. This is about your family not wanting to see you work yourself to the bone in your 70s just to send all your money away. It hurts me that you felt you had to lie to me about it."

**6. Set a Boundary (For Myself).**\\
I cannot give him any more money. Period. This is no longer "helping him out." It's "funding his scam." My love and support can't be financial anymore. This is a hard line I have to hold for my own sanity.

**7. Define the "Long Game" (Active, Non-Combative Engagement).**\\
This is the plan for *after* the intervention fails or is rebuffed. It's how I stay an "active" son without falling into the "fixer" trap.

- **Compartmentalize:** I will *actively* maintain regular, loving contact about *everything else*. I can ask about his day, his health, send him photos, talk about sports, etc. I must not let this topic poison our entire relationship.

- **Continue to Document:** I'll keep reporting anything I see to the authorities. This is my own private, active step. It's a way of "doing something" regardless of if he listens to me.

This is a new, harder path, but the first one failed. I have to try something different. I will talk to my uncle tonight or tomorrow.
<!-- /section:action_plan -->
'''

print("Testing with ACTUAL journal content from user...")
print("=" * 80)

# Test parse_template_content
result = TipTapConverter.parse_template_content(journal_content)

if result:
    print(f"\n[OK] parse_template_content returned sections: {list(result.keys())}")

    for key in ['raw_thoughts', 'deep_dive', 'action_plan']:
        if key in result:
            print(f"  [OK] {key}: PRESENT")
            if key == 'deep_dive':
                qa_content = result[key].get('content', [])
                print(f"       - Contains {len(qa_content)} Q&A pairs")
                if qa_content:
                    print(f"       - First Q: {qa_content[0].get('attrs', {}).get('question', 'N/A')[:50]}...")
        else:
            print(f"  [MISSING] {key}: NOT FOUND")
else:
    print("\n[FAIL] parse_template_content returned None!")

print("\n" + "=" * 80)
print("Testing auto_migrate_journal...")
print("=" * 80)

journal_data = {
    "journal_id": "test",
    "content": journal_content,
    "template_id": "express_examine_evolve"
}

migrated = TipTapConverter.auto_migrate_journal(journal_data)

if 'content_tiptap' in migrated:
    tiptap = migrated['content_tiptap']
    print(f"\n[OK] content_tiptap created with keys: {list(tiptap.keys())}")

    for key in ['raw_thoughts', 'deep_dive', 'action_plan']:
        if key in tiptap:
            print(f"  [OK] {key}: PRESENT in content_tiptap")
        else:
            print(f"  [MISSING] {key}: NOT FOUND in content_tiptap")
else:
    print("\n[FAIL] content_tiptap not created!")

print("\n" + "=" * 80)
print("Deep dive section details:")
print("=" * 80)

if result and 'deep_dive' in result:
    deep_dive = result['deep_dive']
    print(json.dumps(deep_dive, indent=2))
