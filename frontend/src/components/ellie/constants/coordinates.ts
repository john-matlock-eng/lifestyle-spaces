/**
 * Central coordinate system for all Ellie body parts
 * All measurements are based on a 120x120 SVG viewBox
 */

export const ELLIE_COORDINATES = {
  // Center point of the SVG
  centerX: 60,
  centerY: 60,

  // Body positioning (torso)
  body: {
    cx: 60,
    cy: 65,
    rx: 25,
    ry: 18,
  },

  // Neck positioning (connects head to body)
  neck: {
    cx: 60,
    cy: 52,
    rx: 12,
    ry: 8,
  },

  // Head positioning
  head: {
    cx: 60,
    cy: 38,
    radius: 18,
  },

  // Muzzle/Snout positioning (relative to head)
  muzzle: {
    lower: { cx: 60, cy: 46, rx: 10, ry: 6 },
    upper: { cx: 60, cy: 44, rx: 8, ry: 5 },
  },

  // Facial features
  face: {
    nose: { cx: 60, cy: 42, rx: 4, ry: 3 },
    leftEye: { cx: 53, cy: 34, radius: 2.5 },
    rightEye: { cx: 67, cy: 34, radius: 2.5 },
    leftEar: {
      path: 'M 45 28 Q 38 32 40 42 Q 42 45 45 42 Q 47 35 45 28',
    },
    rightEar: {
      path: 'M 75 28 Q 82 32 80 42 Q 78 45 75 42 Q 73 35 75 28',
    },
  },

  // Mouth positioning (below nose)
  mouth: {
    baseX: 60,
    baseY: 44,
  },

  // Tongue positioning
  tongue: {
    baseX: 60,
    baseY: 48,
  },

  // Legs positioning
  legs: {
    back: {
      left: { cx: 48, cy: 78, rx: 4, ry: 12 },
      right: { cx: 72, cy: 78, rx: 4, ry: 12 },
    },
    front: {
      left: { cx: 52, cy: 78, rx: 4, ry: 12 },
      right: { cx: 68, cy: 78, rx: 4, ry: 12 },
    },
  },

  // Paws positioning
  paws: {
    back: {
      left: { cx: 48, cy: 88, rx: 4.5, ry: 3 },
      right: { cx: 72, cy: 88, rx: 4.5, ry: 3 },
    },
    front: {
      left: { cx: 52, cy: 88, rx: 4.5, ry: 3 },
      right: { cx: 68, cy: 88, rx: 4.5, ry: 3 },
    },
  },

  // Tail positioning
  tail: {
    cx: 35,
    cy: 62,
    rx: 8,
    ry: 4,
    rotation: -45,
    transformOrigin: '35 62',
  },

  // Collar positioning (on neck)
  collar: {
    cx: 60,
    cy: 52,
    rx: 14,
    ry: 4,
  },

  // Shadow positioning
  shadow: {
    cx: 60,
    cy: 93,
    rx: 20,
    ry: 4,
  },
} as const;

export type EllieCoordinates = typeof ELLIE_COORDINATES;
