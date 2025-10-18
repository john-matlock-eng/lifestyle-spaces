/**
 * Animation timing constants (in milliseconds)
 */

export const ANIMATION_TIMINGS = {
  // Mood transitions
  moodTransition: 300,

  // Particle effects
  particleDuration: 3000,
  particleDelay: 100,

  // Celebrations
  celebrationDuration: 2000,

  // Nose boop
  noseBoopDuration: 2000,
  noseBoopParticles: 1500,

  // Breathing
  breathingSlow: 4000,
  breathingFast: 2000,

  // Tail wag
  tailWagSlow: 2000,
  tailWagFast: 800,

  // Ear wiggle
  earWiggle: 1000,

  // Tongue animation
  tongueGentle: 2000,
  tonguePant: 600,

  // Eye blink
  blinkDuration: 200,
  blinkInterval: 3000,

  // Walking
  walkCycle: 1000,
  legMovement: 500,
} as const;

export const ANIMATION_DELAYS = {
  stagger: 100,
  particleStagger: 50,
} as const;
