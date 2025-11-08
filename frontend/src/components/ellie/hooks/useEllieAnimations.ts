import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { EllieMood } from '../../../contexts/EllieContext';

// Register GSAP with React
gsap.registerPlugin(useGSAP);

interface AnimationRefs {
  body: React.RefObject<SVGGElement | null>;
  tail: React.RefObject<SVGGElement | null>;
  ears: React.RefObject<SVGGElement | null>;
  nose: React.RefObject<SVGGElement | null>;
  tongue: React.RefObject<SVGGElement | null>;
  head: React.RefObject<SVGGElement | null>;
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

  // Initialize tail position on mount
  useEffect(() => {
    if (tailRef.current) {
      console.log('[Ellie Animations] Initializing tail position to -25°');
      gsap.set(tailRef.current, {
        rotation: -25,
        transformOrigin: '66 50',
      });
    }
  }, []);

  // Mood-specific animations
  const applyMoodAnimation = useCallback(() => {
    if (!tailRef.current || !bodyRef.current) return;

    console.log('[Ellie Animations] Applying mood animation:', mood);

    // Kill previous mood timeline
    if (moodTimelineRef.current) {
      moodTimelineRef.current.kill();
    }

    const tl = gsap.timeline();

    switch (mood) {
      case 'happy':
        // Gentle tail wag
        console.log('[Ellie Animations] Happy tail wag: base=-25, range=±2, duration=1.2, yoyo');
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
        tl.to(tailRef.current, {
          rotation: '-=2',
          transformOrigin: '66 50',
          duration: 1.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'excited':
        // Faster tail wag + bounce
        console.log('[Ellie Animations] Excited tail wag: base=-25, range=±2, duration=0.8, yoyo');
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
        tl.to(tailRef.current, {
          rotation: '-=2',
          transformOrigin: '66 50',
          duration: 0.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        tl.to(
          bodyRef.current,
          {
            y: -1,
            duration: 0.6,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          },
          0
        );
        break;

      case 'playful':
        // Wiggle tail
        console.log('[Ellie Animations] Playful tail wag: base=-25, range=±3, duration=0.9, yoyo');
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
        tl.to(tailRef.current, {
          rotation: '-=3',
          transformOrigin: '66 50',
          duration: 0.9,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'celebrating':
        // Fast tail wag + big bounce
        console.log('[Ellie Animations] Celebrating tail wag: base=-25, range=±3, duration=0.6, yoyo');
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
        tl.to(tailRef.current, {
          rotation: '-=3',
          transformOrigin: '66 50',
          duration: 0.6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        tl.to(
          bodyRef.current,
          {
            y: -2,
            duration: 0.4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          },
          0
        );
        break;

      case 'curious':
        // Head tilt
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
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
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
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
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
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
        // Set tail to tucked (more downward)
        gsap.set(tailRef.current, {
          rotation: -35,
          transformOrigin: '66 50',
        });
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
            transformOrigin: '66 50',
            duration: 0.6,
            ease: 'back.out',
          },
          0
        );
        break;

      case 'walking':
        // Bounce animation
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
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
        // Set tail to idle position
        console.log('[Ellie Animations] Idle mode: setting tail to rotation=-25');
        gsap.set(tailRef.current, {
          rotation: -25,
          transformOrigin: '66 50',
        });
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

    console.log('[Ellie Animations] celebrate() function triggered: base=-25, range=±3, duration=0.4, repeat=3');

    const celebrationTl = gsap.timeline();

    // Set base position
    gsap.set(tailRef.current, {
      rotation: -30,
      transformOrigin: '52 75',
    });

    // Gentle bounce
    celebrationTl.to(bodyRef.current, {
      y: -3,
      duration: 0.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    });

    // Fast tail wag
    celebrationTl.to(
      tailRef.current,
      {
        rotation: '-=3',
        transformOrigin: '66 50',
        duration: 0.4,
        ease: 'sine.inOut',
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
