# Ellie Animation States Documentation

This document describes the animation states and behaviors for Ellie, the Shih Tzu companion in Lifestyle Spaces.

## Overview

Ellie is an interactive Shih Tzu companion that provides contextual guidance and encouragement throughout the journaling experience. Her animations and moods adapt based on user actions and template configurations.

## Animation States

### idle
**Status:** Implemented
**Description:** Default resting state
**Visual:** Gentle breathing, occasional blink
**Use Cases:** Default state, waiting for interaction

### happy
**Status:** Implemented
**Description:** Positive, cheerful state
**Visual:** Upright posture, tail wagging, bright eyes
**Use Cases:** Positive feedback, encouragement, greetings

### excited
**Status:** Implemented
**Description:** High-energy, enthusiastic state
**Visual:** Rapid tail wagging, bouncing, alert ears
**Use Cases:** Achievements, milestones, celebrations

### curious
**Status:** Implemented
**Description:** Inquisitive, attentive state
**Visual:** Head tilted, ears forward, focused eyes
**Use Cases:** Prompting reflection, asking questions

### zen
**Status:** Implemented
**Description:** Calm, meditative state
**Visual:** Slow breathing, relaxed posture, peaceful
**Use Cases:** Gratitude practices, mindfulness, reflection

### celebrating
**Status:** Implemented
**Description:** Joyful celebration state
**Visual:** Jumping, spinning, tail wagging enthusiastically
**Use Cases:** Completion, achievements, major milestones

### proud
**Status:** Implemented
**Description:** Satisfied, supportive state
**Visual:** Chest out, gentle tail sway, warm eyes
**Use Cases:** Deep insights, meaningful progress

### concerned
**Status:** Implemented
**Description:** Supportive, empathetic state
**Visual:** Soft eyes, gentle approach, attentive
**Use Cases:** Difficult reflections, challenges, struggles

### playful
**Status:** Implemented
**Description:** Fun, interactive state
**Visual:** Play bow, bouncing, inviting
**Use Cases:** Breaks, lighthearted moments

### sleeping
**Status:** Implemented
**Description:** Resting, inactive state
**Visual:** Curled up, gentle breathing, ZZZ particles
**Use Cases:** Idle periods, breaks

### walking
**Status:** Implemented
**Description:** Moving, transitioning state
**Visual:** Trotting animation, tail up
**Use Cases:** Transitions between sections

### calm-breathing
**Status:** Implemented
**Description:** Slow, deep breathing cycle
**Visual:** Gentle rhythm, 4-5 second breathing cycles
**Use Cases:** General calm states, default for reflective templates
**Used In:** Weekly Gratitude & Reflection (fallback for proud-reflective-zen)

---

## Animation State: proud-reflective-zen (PLANNED)

**Status:** Documented for future implementation

**Current Fallback:** calm-breathing

**Used In:** Weekly Gratitude & Reflection template

**Specifications:**
- **Primary:** Slow, deep breathing cycle (4-5 seconds)
- **Secondary:** Very slow tail sway, occasional slow blink (every 8-10s)
- **Posture:** Sitting upright, chest slightly forward
- **Intensity:** Subtle
- **Emotional Tone:** Warm, patient, honoring

**Visual Reference:** Wise companion sitting in comfortable silence at sunset

**Purpose:** This animation state is designed for weekly reflection templates where the user is engaging in deeper, more meaningful introspection. The state should convey patience, wisdom, and a sense of honoring the reflection process.

**Implementation Notes:**
- Should feel distinctly more contemplative than standard "zen"
- Breathing should be slightly slower than calm-breathing
- Tail sway should be minimal and very slow (one complete sway every 12-15 seconds)
- Eyes should have a gentle, supportive expression
- No sudden movements or energetic behaviors

**Differentiation from Other States:**
- vs. zen: More settled, less active meditation
- vs. calm-breathing: More emotionally present, conveying support
- vs. proud: Less celebratory, more reflective acknowledgment

---

## Particle Effects

### hearts
**Visual:** Pink/red heart particles floating upward
**Use Cases:** Gratitude, love, completion, appreciation
**Duration:** 3-5 seconds

### sparkles
**Visual:** Golden sparkle particles radiating outward
**Use Cases:** Achievements, insights, celebrations, milestones
**Duration:** 3-5 seconds

### treats
**Visual:** Dog treat icons falling down
**Use Cases:** Rewards, playful moments, achievements
**Duration:** 2-3 seconds

### zzz
**Visual:** "Z" letters floating upward
**Use Cases:** Sleeping state, rest periods
**Duration:** Continuous while sleeping

---

## Secondary Animations

### bounce
**Description:** Gentle bouncing motion
**Use Cases:** Celebration, excitement, completion

### sway
**Description:** Gentle side-to-side swaying
**Use Cases:** Calm states, meditation, reflection

### spin
**Description:** 360-degree rotation
**Use Cases:** Celebration, playfulness

### pulse
**Description:** Gentle size pulsing
**Use Cases:** Drawing attention, notifications

---

## Template-Specific Ellie Behavior

### Daily Gratitude
- **onSelect:** zen mood, sway animation
- **onStart:** happy mood, welcoming message
- **onComplete:** celebrating mood, hearts particles, bounce animation
- **Theme:** Supportive, reflective

### Weekly Gratitude & Reflection
- **onSelect:** zen mood, sway animation
- **onStart:** zen mood, welcoming message with 2s delay
- **onProgress (Section 2):** zen mood, sparkle particles, encouragement
- **onComplete:** celebrating mood, hearts particles, brief happy animation
- **Theme:** Deeply supportive, patient, reflective
- **Animation State:** calm-breathing (fallback for proud-reflective-zen)

### Weekly Reset
- **onSelect:** reflective mood, sway animation
- **onStart:** zen mood
- **onComplete:** celebrating mood, sparkles, bounce animation
- **Theme:** Supportive, planning-focused

### Grounding 5-4-3-2-1
- **Focus:** Calm, zen states
- **Particles:** Minimal, mostly calm presence
- **Theme:** Grounding, present, supportive

---

## Messaging Guidelines

### Tone
- Warm and supportive (never judgmental)
- Encouraging without being pushy
- Personalized when possible (use [User] placeholder)
- Age-appropriate and professional

### Timing
- **onStart delays:** 2-3 seconds after page load
- **onProgress triggers:** Event-based (section focus, milestones)
- **onComplete:** Immediate upon completion
- **Message duration:** 5-6 seconds for full messages, 3-4 for short

### Message Length
- **Short:** 5-10 words (quick encouragement)
- **Medium:** 10-20 words (standard messages)
- **Long:** 20-30 words (deep reflection prompts)

### Personalization
- Use `[User]` placeholder for username injection
- Reference specific template/section context
- Acknowledge specific milestones (word count, item count, etc.)

---

## Mood Transitions

Smooth transitions between moods are important for maintaining immersion:

- **Gentle transitions:** zen ↔ happy ↔ proud
- **Energetic transitions:** excited ↔ celebrating ↔ playful
- **Supportive transitions:** concerned ↔ zen ↔ proud

Avoid jarring transitions like:
- sleeping → excited (too abrupt)
- concerned → celebrating (emotionally inconsistent)

---

## Future Enhancements

### Planned Animation States
1. **proud-reflective-zen** - For deep weekly reflections
2. **gentle-encouragement** - For moments of difficulty
3. **patient-waiting** - For long pauses in journaling
4. **warm-welcome** - For returning users

### Planned Particle Effects
1. **flowers** - For growth and nature-themed templates
2. **stars** - For nighttime/evening journaling
3. **butterflies** - For transformation templates
4. **raindrops** - For mood/emotion templates

### Planned Features
1. **Animation sequencing** - Smooth transitions between multiple animations
2. **Contextual idle behaviors** - Different idle states based on context
3. **Sound effects** - Optional gentle sounds for animations
4. **Seasonal variations** - Holiday/season-specific decorations
5. **Achievement animations** - Special animations for streaks and milestones

---

## Accessibility Considerations

- All animations should be smooth and non-jarring
- Particle effects should not obscure important UI elements
- Consider "reduced motion" user preferences
- Ensure animations don't interfere with screen readers
- Provide option to reduce or disable animations
- Color choices should maintain WCAG AA contrast standards

---

## Performance Guidelines

- Animations should run at 60fps
- Particle effects should be limited to 20-30 particles max
- Heavy animations should be throttled on low-performance devices
- CSS animations preferred over JavaScript when possible
- Use `will-change` CSS property sparingly
- Lazy load animation assets
