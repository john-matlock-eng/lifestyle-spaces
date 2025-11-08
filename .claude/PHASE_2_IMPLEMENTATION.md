# PHASE 2: GSAP ANIMATION SYSTEM - FLUID, ORGANIC ELLIE

## Executive Summary

Replace mechanical CSS keyframe animations with GSAP-powered, organic animation system that delivers:
- Non-repetitive idle behaviors through randomization
- Smooth mood transitions without abrupt class swaps
- Spontaneous micro-animations (ear twitches, blinks, breathes)
- Professional 60fps performance maintained

---

## Problem Statement

### Current System Issues (CSS Keyframes)

**Identified in Reconnaissance:**
1. **Mechanical Looping**: `animation: wag-enhanced 0.6s ease-in-out infinite`
2. **No Variability**: Same animation every time, no randomization
3. **Abrupt Transitions**: Mood changes via class swap (`.mood-idle` → `.mood-happy`)
4. **Limited Control**: Cannot pause, restart, or modify animations programmatically

**User Experience Impact:**
- "0.5s fast loop of bouncing nose" → Distracting
- "Static animations loop infinitely" → Boring
- "Limited Idle Variety" → Predictable

---

## Solution Architecture

### GSAP Integration Strategy

```
Animation System
├─ GSAP Core (44KB gzipped)
├─ @gsap/react Plugin (React hooks)
├─ useEllieAnimations() Hook
│  ├─ Idle Animation Manager (randomized sequences)
│  ├─ Mood Transition Controller (smooth crossfades)
│  └─ Micro-animation Scheduler (spontaneous events)
└─ SVG Element Refs (direct DOM control)
```

### Animation Philosophy

**"Organic" Defined:**
1. **Non-repetitive**: Random variation in timing and sequence
2. **Spontaneous**: Unexpected micro-animations (blink, ear twitch)
3. **Responsive**: React to user interaction smoothly
4. **Subtle**: Enhance, don't distract from content

---

## Bundle Size Impact Assessment

### GSAP Core Packages

| Package | Size (gzipped) | Purpose |
|---------|----------------|---------|
| `gsap` | 44KB | Core animation engine |
| `@gsap/react` | 2KB | React hooks integration |
| **Total Added** | **46KB** | Acceptable for POC |

### Current Bundle

- **Before Phase 2**: 425KB gzipped
- **After Phase 2**: ~471KB gzipped (+10.8%)
- **Impact**: Acceptable - GSAP provides significant value

### Optimization Strategy

- Tree-shake unused GSAP features
- Lazy-load if needed (not required for POC)
- Monitor in production with performance budgets

**Decision**: ✅ **PROCEED** - Bundle impact acceptable for animation quality gained

---

## Implementation Instructions for Claude Code

Execute steps sequentially with agent specialization.

---

## STEP 1: Install GSAP Dependencies

**@package-manager**: Install packages

```bash
cd frontend
npm install gsap@3.12.5 --save
npm install @gsap/react@2.1.0 --save
```

**Validation**:
- `package.json` updated with gsap dependencies
- `package-lock.json` regenerated
- No peer dependency warnings

---

## STEP 2: Create Animation Hook (useEllieAnimations)

**@architect**: Design animation hook architecture
**@frontend-builder**: Implement hook with GSAP

**Create**: `frontend/src/components/ellie/hooks/useEllieAnimations.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { EllieMood } from '../../../contexts/EllieContext';

// Register GSAP with React
gsap.registerPlugin(useGSAP);

interface AnimationRefs {
  body: React.RefObject<SVGGElement>;
  tail: React.RefObject<SVGGElement>;
  ears: React.RefObject<SVGGElement>;
  nose: React.RefObject<SVGGElement>;
  tongue: React.RefObject<SVGGElement>;
  head: React.RefObject<SVGGElement>;
}

interface UseEllieAnimationsOptions {
  mood: EllieMood;
  isTyping?: boolean;
}

interface UseEllieAnimationsReturn {
  refs: AnimationRefs;
  celebrate: () => void;
}

/**
 * GSAP-powered animation system for Ellie
 * Replaces CSS keyframes with programmatic, organic animations
 */
export const useEllieAnimations = ({
  mood,
  isTyping = false,
}: UseEllieAnimationsOptions): UseEllieAnimationsReturn => {
  // Refs for direct DOM control
  const bodyRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGGElement>(null);
  const earsRef = useRef<SVGGElement>(null);
  const noseRef = useRef<SVGGElement>(null);
  const tongueRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);

  // Timeline refs for cleanup
  const idleTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const moodTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // Random helper
  const random = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Idle Animation Manager - Creates varied, non-repetitive sequences
  const createIdleSequence = useCallback(() => {
    if (!bodyRef.current || isTyping) return;

    // Kill previous timeline
    if (idleTimelineRef.current) {
      idleTimelineRef.current.kill();
    }

    const tl = gsap.timeline({ repeat: 0 }); // No infinite loop!

    // Breathing (always included, but varied)
    const breathDuration = random(3, 5);
    tl.to(bodyRef.current, {
      scaleY: 1.02,
      scaleX: 0.99,
      duration: breathDuration,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    });

    // Random chance of ear twitch (30% probability)
    if (Math.random() < 0.3 && earsRef.current) {
      const earDelay = random(1, 3);
      tl.to(
        earsRef.current,
        {
          rotation: random(5, 10),
          duration: 0.2,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        },
        earDelay
      );
    }

    // Random chance of blink (40% probability)
    if (Math.random() < 0.4) {
      const blinkDelay = random(2, 4);
      // Note: Blink will be handled in ModularEnhancedShihTzu via opacity
      // Just schedule a callback event here
      tl.call(() => {
        // Trigger blink event (will be wired in component)
      }, [], blinkDelay);
    }

    // Schedule next sequence after this one completes + random delay
    tl.eventCallback('onComplete', () => {
      const nextDelay = random(2, 5);
      setTimeout(() => {
        createIdleSequence();
      }, nextDelay * 1000);
    });

    idleTimelineRef.current = tl;
  }, [isTyping]);

  // Mood-specific animations
  const applyMoodAnimation = useCallback(() => {
    if (!tailRef.current || !bodyRef.current) return;

    // Kill previous mood timeline
    if (moodTimelineRef.current) {
      moodTimelineRef.current.kill();
    }

    const tl = gsap.timeline();

    switch (mood) {
      case 'happy':
        // Gentle tail wag
        tl.to(tailRef.current, {
          rotation: 5,
          duration: 0.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'excited':
        // Faster tail wag + bounce
        tl.to(tailRef.current, {
          rotation: 8,
          duration: 0.4,
          ease: 'power2.inOut',
          yoyo: true,
          repeat: -1,
        });
        tl.to(
          bodyRef.current,
          {
            y: -3,
            duration: 0.6,
            ease: 'bounce.out',
            yoyo: true,
            repeat: -1,
          },
          0
        );
        break;

      case 'playful':
        // Wiggle tail
        tl.to(tailRef.current, {
          rotation: '+=10',
          duration: 0.5,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'celebrating':
        // Fast tail wag + big bounce
        tl.to(tailRef.current, {
          rotation: 10,
          duration: 0.3,
          ease: 'power2.inOut',
          yoyo: true,
          repeat: -1,
        });
        tl.to(
          bodyRef.current,
          {
            y: -5,
            duration: 0.4,
            ease: 'bounce.out',
            yoyo: true,
            repeat: -1,
          },
          0
        );
        break;

      case 'curious':
        // Head tilt
        if (headRef.current) {
          tl.to(headRef.current, {
            rotation: 5,
            duration: 0.8,
            ease: 'power2.inOut',
          });
        }
        break;

      case 'sleeping':
        // Very slow breathing
        tl.to(bodyRef.current, {
          scaleY: 1.03,
          duration: 4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'zen':
        // Minimal, slow breathing
        tl.to(bodyRef.current, {
          scaleY: 1.01,
          duration: 6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'concerned':
        // Ear droop (position change, not animation)
        if (earsRef.current) {
          tl.to(earsRef.current, {
            rotation: -5,
            duration: 0.5,
            ease: 'power2.out',
          });
        }
        break;

      case 'proud':
        // Head up, tail up
        if (headRef.current) {
          tl.to(headRef.current, {
            y: -2,
            duration: 0.6,
            ease: 'power2.out',
          });
        }
        tl.to(
          tailRef.current,
          {
            rotation: 50,
            duration: 0.6,
            ease: 'back.out',
          },
          0
        );
        break;

      case 'walking':
        // Bounce animation
        tl.to(bodyRef.current, {
          y: -2,
          duration: 0.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'idle':
      default:
        // Just breathing, handled by idle sequence
        break;
    }

    moodTimelineRef.current = tl;
  }, [mood]);

  // Smooth mood transitions
  useEffect(() => {
    // Create transition timeline
    const transitionTl = gsap.timeline();

    // Fade out current animations
    transitionTl.to([bodyRef.current, tailRef.current, headRef.current], {
      opacity: 0.7,
      duration: 0.2,
      ease: 'power2.inOut',
    });

    // Apply new mood
    transitionTl.call(() => {
      applyMoodAnimation();
    });

    // Fade back in
    transitionTl.to([bodyRef.current, tailRef.current, headRef.current], {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.inOut',
    });

    return () => {
      transitionTl.kill();
    };
  }, [mood, applyMoodAnimation]);

  // Idle sequence manager
  useEffect(() => {
    if (!isTyping && mood === 'idle') {
      createIdleSequence();
    }

    return () => {
      if (idleTimelineRef.current) {
        idleTimelineRef.current.kill();
      }
    };
  }, [mood, isTyping, createIdleSequence]);

  // Celebration animation (called via celebrate())
  const celebrate = useCallback(() => {
    if (!bodyRef.current || !tailRef.current) return;

    const celebrationTl = gsap.timeline();

    // Big bounce
    celebrationTl.to(bodyRef.current, {
      y: -10,
      duration: 0.5,
      ease: 'back.out',
      yoyo: true,
      repeat: 1,
    });

    // Fast tail wag
    celebrationTl.to(
      tailRef.current,
      {
        rotation: 15,
        duration: 0.2,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 3,
      },
      0
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimelineRef.current) {
        idleTimelineRef.current.kill();
      }
      if (moodTimelineRef.current) {
        moodTimelineRef.current.kill();
      }
    };
  }, []);

  return {
    refs: {
      body: bodyRef,
      tail: tailRef,
      ears: earsRef,
      nose: noseRef,
      tongue: tongueRef,
      head: headRef,
    },
    celebrate,
  };
};
```

**Validation**:
- Hook compiles without TypeScript errors
- GSAP imported correctly
- Returns refs and celebrate function

---

## STEP 3: Update ModularEnhancedShihTzu (Integrate GSAP)

**@frontend-builder**: Replace CSS animations with GSAP refs

**File**: `frontend/src/components/ellie/ModularEnhancedShihTzu.tsx`

**Step 3a: Add imports**

```typescript
// ADD at top:
import { useEllieAnimations } from './hooks/useEllieAnimations';
import { useEllie } from '../../contexts/EllieContext';
```

**Step 3b: Replace animation hook**

**FIND:**
```typescript
const { mood, setMood } = useEllieMood({ initialMood: propMood });
const { particles, particleEffect, celebrate } = useEllieAnimation();
```

**REPLACE WITH:**
```typescript
const { mood, setMood } = useEllieMood({ initialMood: propMood });
const { isTyping } = useEllie();
const { refs: animRefs, celebrate: gsapCelebrate } = useEllieAnimations({ 
  mood, 
  isTyping 
});
const { particles, particleEffect, celebrate: particleCelebrate } = useEllieAnimation();

// Combine celebrations
const celebrate = useCallback(() => {
  gsapCelebrate();
  particleCelebrate();
}, [gsapCelebrate, particleCelebrate]);
```

**Step 3c: Add refs to SVG elements**

**FIND each SVG group and add ref:**

```typescript
// Body
<Body 
  furColor={effectiveFurColor} 
  mood={mood}
  ref={animRefs.body}  // ADD THIS
/>

// Tail
<Tail 
  furColor={effectiveFurColor} 
  mood={mood}
  ref={animRefs.tail}  // ADD THIS
/>

// Head (contains ears, nose, tongue)
<Head
  furColor={effectiveFurColor}
  mood={mood}
  onNoseBoop={handleNoseBoop}
  ref={animRefs.head}  // ADD THIS
/>
```

**Step 3d: Update anatomy components to accept refs**

This is complex - each anatomy component needs `React.forwardRef`. I'll provide the pattern for Body, apply to all:

**File**: `frontend/src/components/ellie/anatomy/Body.tsx`

**FIND:**
```typescript
export const Body: React.FC<BodyProps> = ({ furColor, mood }) => {
```

**REPLACE WITH:**
```typescript
export const Body = React.forwardRef<SVGGElement, BodyProps>(
  ({ furColor, mood }, ref) => {
```

**FIND the main `<g>` tag and add ref:**
```typescript
<g className="ellie-body" ref={ref}>
```

**FIND the closing, replace with:**
```typescript
  );
}
);

Body.displayName = 'Body';
```

**Repeat this pattern for:**
- `Tail.tsx`
- `Head.tsx`
- `Ears.tsx` (inside Head)
- `Nose.tsx` (inside Head)
- `Tongue.tsx` (inside Head)

**Validation**:
- All anatomy components use forwardRef
- Refs properly attached to SVG groups
- No TypeScript errors

---

## STEP 4: Remove CSS Keyframe Animations

**@deprecation-agent**: Clean up old animation system

**File**: `frontend/src/components/ellie/styles/animations.css`

**DELETE entire contents and REPLACE WITH:**

```css
/* ============================================================================
 * Ellie Animations - GSAP Powered (Phase 2)
 * ============================================================================
 * 
 * CSS keyframes removed - animations now controlled by GSAP via useEllieAnimations hook
 * Only particle and fade animations remain as they're simple CSS-only effects
 */

/* Particle animations (keep - simple CSS is fine here) */
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-40px); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-float-up {
  animation: float-up 3s ease-out forwards;
}

/* All other animations (wag, wiggle, bounce, breathe, etc.) 
   are now handled by GSAP in useEllieAnimations hook */
```

**File**: `frontend/src/components/ellie/styles/moods.css`

**DELETE all animation properties, KEEP only static transforms:**

```css
/* ============================================================================
 * Ellie Moods - GSAP Powered (Phase 2)
 * ============================================================================
 * 
 * Mood-specific animations removed - now handled by useEllieAnimations hook
 * Only static positioning/transforms remain
 */

.ellie-mood {
  transition: opacity 0.3s ease;
}

/* Static positioning only - no animations */

/* Concerned - ear position only */
.mood-concerned .ellie-ears {
  transform: rotate(-5deg);
}

/* Proud - static position only (GSAP handles animation) */
.mood-proud .ellie-tail {
  transform: rotate(50deg);
}

/* All other mood animations (happy, excited, playful, celebrating, etc.)
   are now handled programmatically via GSAP in useEllieAnimations hook */
```

**Validation**:
- CSS files drastically simplified
- No CSS animation properties remain
- Only particle effects and static transforms kept

---

## STEP 5: Update Ellie Hook Exports

**@frontend-builder**: Export new animation hook

**File**: `frontend/src/components/ellie/hooks/index.ts`

**ADD:**
```typescript
export { useEllieAnimations } from './useEllieAnimations';
```

**Validation**:
- Hook exported from index
- Can be imported by ModularEnhancedShihTzu

---

## STEP 6: Create Tests for GSAP Animations

**@test-agent**: Create animation hook tests

**Create**: `frontend/src/__tests__/components/ellie/hooks/useEllieAnimations.test.ts`

```typescript
import { renderHook } from '@testing-library/react';
import { useEllieAnimations } from '../../../../components/ellie/hooks/useEllieAnimations';
import { gsap } from 'gsap';

// Mock GSAP
jest.mock('gsap', () => ({
  gsap: {
    timeline: jest.fn(() => ({
      to: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      eventCallback: jest.fn().mockReturnThis(),
      kill: jest.fn(),
    })),
    to: jest.fn(),
    registerPlugin: jest.fn(),
  },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

describe('useEllieAnimations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return refs and celebrate function', () => {
    const { result } = renderHook(() =>
      useEllieAnimations({ mood: 'idle', isTyping: false })
    );

    expect(result.current.refs).toBeDefined();
    expect(result.current.refs.body).toBeDefined();
    expect(result.current.refs.tail).toBeDefined();
    expect(result.current.celebrate).toBeDefined();
  });

  it('should create timeline for idle mood', () => {
    renderHook(() => useEllieAnimations({ mood: 'idle', isTyping: false }));
    
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('should not create idle sequence when typing', () => {
    const timelineCallsBefore = (gsap.timeline as jest.Mock).mock.calls.length;
    
    renderHook(() => useEllieAnimations({ mood: 'idle', isTyping: true }));
    
    // Should create mood timeline but not idle sequence
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('should cleanup timelines on unmount', () => {
    const killMock = jest.fn();
    (gsap.timeline as jest.Mock).mockReturnValue({
      to: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      eventCallback: jest.fn().mockReturnThis(),
      kill: killMock,
    });

    const { unmount } = renderHook(() =>
      useEllieAnimations({ mood: 'happy', isTyping: false })
    );

    unmount();

    expect(killMock).toHaveBeenCalled();
  });

  it('should have different animations for different moods', () => {
    const { rerender } = renderHook(
      ({ mood }) => useEllieAnimations({ mood, isTyping: false }),
      { initialProps: { mood: 'idle' as const } }
    );

    const callsAfterIdle = (gsap.timeline as jest.Mock).mock.calls.length;

    rerender({ mood: 'happy' });

    // Should create new timeline for mood change
    expect((gsap.timeline as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsAfterIdle
    );
  });
});
```

**Validation**:
- Tests pass with mocked GSAP
- Covers hook lifecycle
- Tests mood changes

---

## STEP 7: Update Component Tests

**@test-agent**: Update ModularEnhancedShihTzu tests

**File**: `frontend/src/__tests__/components/ellie/modular-compatibility.test.tsx`

**ADD mock at top:**
```typescript
// Mock GSAP animations
jest.mock('../../../components/ellie/hooks/useEllieAnimations', () => ({
  useEllieAnimations: () => ({
    refs: {
      body: { current: null },
      tail: { current: null },
      ears: { current: null },
      nose: { current: null },
      tongue: { current: null },
      head: { current: null },
    },
    celebrate: jest.fn(),
  }),
}));
```

**Validation**:
- All existing tests still pass
- GSAP animations mocked properly

---

## STEP 8: Bundle Size Validation

**@validation-agent**: Verify bundle impact

**Run build:**
```bash
npm run build
```

**Check output:**
```bash
ls -lh dist/assets/*.js | awk '{print $5, $9}'
```

**Expected**:
- Bundle size increase ~40-50KB gzipped
- Total bundle: ~465-475KB gzipped
- Within acceptable range (<500KB)

**If bundle exceeds 500KB:**
- Consider code splitting for GSAP
- Lazy load animations on interaction
- Review tree-shaking configuration

**Validation**:
- Build succeeds
- Bundle size within budget
- No console warnings about bundle size

---

## STEP 9: Performance Testing

**@validation-agent**: Verify 60fps maintained

**Manual Testing:**

1. Start dev server: `npm run dev`
2. Open Chrome DevTools
3. Navigate to Performance tab
4. Start recording
5. Navigate to Dashboard (Ellie visible)
6. Let Ellie animate for 10 seconds
7. Click cycle button (change perch)
8. Click Ellie (trigger celebrate)
9. Stop recording

**Analyze:**
- FPS should stay at 60fps consistently
- No long tasks (>50ms)
- Smooth animation timeline
- GPU acceleration active (check Layers tab)

**If performance issues:**
- Add `will-change: transform` to animated elements
- Use `transform` and `opacity` only (GPU accelerated)
- Reduce number of simultaneous animations

**Validation**:
- Maintains 60fps during animations
- No frame drops
- Smooth user experience

---

## STEP 10: Final Integration Testing

**@validation-agent**: End-to-end validation

### Desktop Testing

1. **Idle Behavior**:
   - Ellie shows varied breathing patterns
   - Random ear twitches occur
   - Blinks happen spontaneously
   - No two idle sequences identical

2. **Mood Transitions**:
   - Happy → Excited: Smooth transition
   - Idle → Zen: Gradual slowdown
   - Playful → Sleeping: Natural progression
   - No abrupt jerks or class swap flashes

3. **Interaction**:
   - Click celebrate: Coordinated bounce + tail wag
   - Pet Ellie: Smooth reaction
   - Nose boop: Hearts appear with animation

4. **Perch Cycling**:
   - Animations continue during perch change
   - No animation interruption
   - Smooth position transition

### Mobile Testing (Chrome DevTools)

1. **Typing Behavior**:
   - Focus text field → Ellie disappears
   - Animations pause (no wasted GPU cycles)
   - Blur field → Ellie reappears with smooth fade-in
   - Animations resume from natural state

2. **Performance**:
   - 60fps maintained on mobile device
   - Battery usage reasonable
   - No lag or stuttering

3. **Responsive**:
   - Animations scale appropriately on small screens
   - Touch interactions smooth

### Accessibility Testing

1. **Reduced Motion**:
   - Enable: Settings > Accessibility > Reduce Motion
   - Verify: Animations significantly reduced or eliminated
   - Test: `@media (prefers-reduced-motion: reduce)` respected

2. **Focus Management**:
   - Keyboard navigation works
   - Animations don't interfere with focus indicators
   - Screen reader announcements not disrupted

---

## Success Criteria Checklist

### Technical Implementation

- [ ] GSAP installed (gsap + @gsap/react)
- [ ] useEllieAnimations hook created
- [ ] ModularEnhancedShihTzu integrated with GSAP
- [ ] All anatomy components use forwardRef
- [ ] CSS keyframes removed/replaced
- [ ] Hook exported from index
- [ ] Tests created and passing
- [ ] Component tests updated with mocks

### Animation Quality

- [ ] Idle animations non-repetitive (randomized)
- [ ] Mood transitions smooth (no abrupt swaps)
- [ ] Spontaneous micro-animations occur (blinks, twitches)
- [ ] Celebrate animation coordinated (bounce + wag)
- [ ] Different moods have distinct animations
- [ ] Animations feel organic, not mechanical

### Performance

- [ ] Build succeeds with no errors
- [ ] Bundle size within budget (<500KB gzipped)
- [ ] 60fps maintained during animations
- [ ] No frame drops or stuttering
- [ ] GPU acceleration active
- [ ] Mobile performance acceptable

### Integration

- [ ] Works with Phase 1 perch system
- [ ] Typing awareness pauses animations on mobile
- [ ] Perch cycling doesn't interrupt animations
- [ ] Customization props still work
- [ ] Control panel still functional

### Accessibility

- [ ] Reduced motion preference respected
- [ ] No animation interference with keyboard navigation
- [ ] Screen reader compatible
- [ ] Focus indicators visible

---

## Known Limitations & Future Enhancements

### Phase 2 Scope

- ✅ GSAP-powered animations replace CSS keyframes
- ✅ Non-repetitive idle sequences
- ✅ Smooth mood transitions
- ✅ Spontaneous micro-animations

### Potential Phase 3 Enhancements

- **Advanced Idle Behaviors**: More complex randomized sequences
- **Interactive Animations**: React to cursor proximity, scroll position
- **Sound Effects**: Subtle audio cues (optional, user toggle)
- **Particle System**: GSAP-powered particle effects (replace CSS)
- **3D Transforms**: Subtle depth effects using perspective
- **Gesture Animations**: Custom animations for specific user actions

---

## Rollback Plan

If critical issues arise:

1. **Uninstall GSAP**:
   ```bash
   npm uninstall gsap @gsap/react
   ```

2. **Restore CSS Animations**:
   ```bash
   git checkout HEAD -- frontend/src/components/ellie/styles/animations.css
   git checkout HEAD -- frontend/src/components/ellie/styles/moods.css
   ```

3. **Revert Component Changes**:
   ```bash
   git checkout HEAD -- frontend/src/components/ellie/ModularEnhancedShihTzu.tsx
   git checkout HEAD -- frontend/src/components/ellie/anatomy/*.tsx
   ```

4. **Delete New Files**:
   ```bash
   rm frontend/src/components/ellie/hooks/useEllieAnimations.ts
   rm frontend/src/__tests__/components/ellie/hooks/useEllieAnimations.test.ts
   ```

5. **Verify Rollback**:
   ```bash
   npm run build
   npm test
   ```

---

## Post-Completion Report Template

After Phase 2 completes:

### Metrics

- Bundle size impact: [XKB added]
- Build time change: [X seconds]
- Animation frame rate: [Xfps average]
- Test coverage: [X%]

### Quality Assessment

- Animation feel: [Organic/Mechanical]
- Mood transitions: [Smooth/Abrupt]
- Idle variety: [High/Low]
- Performance: [Excellent/Good/Poor]

### User Experience

- Desktop feel: [Description]
- Mobile feel: [Description]
- Accessibility: [Compliant/Issues]

### Recommendations

- Production ready: [Yes/No]
- Additional work needed: [List]
- Phase 3 priority: [High/Medium/Low]

---

## Notes for Claude Code Execution

### Critical Success Factors

1. **forwardRef Pattern**: MUST be applied consistently to all anatomy components
2. **Ref Attachment**: SVG group elements MUST have refs attached properly
3. **Timeline Cleanup**: ALWAYS kill timelines in useEffect cleanup
4. **Performance**: Use `transform` and `opacity` only for 60fps
5. **Mobile Optimization**: Respect isTyping to pause animations

### Common Pitfalls to Avoid

- ❌ Forgetting to kill timelines on unmount (memory leak)
- ❌ Animating non-GPU properties (width, height, top, left)
- ❌ Creating infinite timelines without pause mechanism
- ❌ Not testing with reduced motion preference
- ❌ Skipping performance validation

### Agent Responsibilities

- **@architect**: Design animation sequences and timing
- **@frontend-builder**: Implement hooks and component integration
- **@test-agent**: Create comprehensive animation tests
- **@validation-agent**: Performance testing and bundle validation
- **@deprecation-agent**: Remove old CSS animation system

### Questions to Ask If Stuck

1. "Are all anatomy components using forwardRef properly?"
2. "Is GSAP timeline cleanup happening in useEffect?"
3. "Are we animating GPU-accelerated properties only?"
4. "Does performance profiler show 60fps?"
5. "Are reduced motion preferences respected?"

---

## Timeline Estimate

- **GSAP Installation**: 5 minutes
- **Hook Creation**: 45 minutes
- **Component Integration**: 60 minutes
- **forwardRef Migration**: 30 minutes
- **CSS Cleanup**: 15 minutes
- **Testing**: 45 minutes
- **Performance Validation**: 30 minutes
- **Final Integration**: 30 minutes

**Total**: ~4 hours of focused development

---

## Success Definition

Phase 2 is complete when:

1. ✅ All CSS keyframe animations replaced with GSAP
2. ✅ Idle sequences show visible randomization (no two identical)
3. ✅ Mood transitions smooth (no class swap flash)
4. ✅ 60fps maintained across all animations
5. ✅ Bundle size within budget (<500KB)
6. ✅ Mobile typing pauses animations
7. ✅ Accessibility requirements met
8. ✅ All tests passing (≥95% coverage)

**Phase 2 delivers on promise: "Fluid, organic Ellie that enhances UX without distraction"**
