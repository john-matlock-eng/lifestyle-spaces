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
    nose: { cx: 60, cy: 40, rx: 6, ry: 4.5 },
    // Eyes closer together (center is 60)
    leftEye: { cx: 54, cy: 32 },
    rightEye: { cx: 66, cy: 32 },
    // Ears as ellipses for better control
    leftEar: { cx: 40, cy: 25, rx: 8, ry: 12 },
    rightEar: { cx: 80, cy: 25, rx: 8, ry: 12 },
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

  // Collar positioning (on neck - using rect instead of ellipse)
  collar: {
    x: 48,      // Left edge (neck center 60 - half width 12)
    y: 48,      // Top of neck area
    width: 24,  // Matches neck width (rx: 12 * 2)
    height: 6,  // Thinner collar
    rx: 3,      // Border radius
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
