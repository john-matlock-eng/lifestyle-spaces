/**
 * Central coordinate system for all Ellie body parts
 * All measurements are based on a 120x120 SVG viewBox
 */

export const ELLIE_COORDINATES = {
  // Center point of the SVG
  centerX: 60,
  centerY: 60,

  // Body positioning (torso) - narrower/sleeker
  body: {
    cx: 60,
    cy: 65,
    rx: 20,  // Reduced from 25 (20% narrower)
    ry: 16,  // Reduced from 18 for better proportion
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
    lower: { cx: 60, cy: 41, rx: 10, ry: 4.5 },
    upper: { cx: 60, cy: 40, rx: 8, ry: 5 },
  },

  // Facial features
  face: {
    nose: { cx: 60, cy: 40, rx: 6, ry: 4.5 },
    // Eyes closer together (center is 60)
    leftEye: { cx: 54, cy: 32 },
    rightEye: { cx: 66, cy: 32 },
    // Ears positioned on sides of head (head center: 60, 38, radius: 18)
    leftEar: { cx: 45, cy: 30, rx: 6, ry: 10 },
    rightEar: { cx: 75, cy: 30, rx: 6, ry: 10 },
  },

  // Mouth positioning (below nose)
  mouth: {
    baseX: 60,
    baseY: 40,
  },

  // Tongue positioning
  tongue: {
    baseX: 60,
    baseY: 44,
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

  // Tail positioning - attached to back of body, longer
  tail: {
    cx: 42,     // Moved right to attach to body (body left edge is at 40)
    cy: 68,     // Positioned at back-middle of body
    rx: 12,     // Made longer (was 8)
    ry: 5,      // Slightly thicker (was 4)
    rotation: -45,
    transformOrigin: '42 68',
  },

  // Collar positioning (on neck - using rect instead of ellipse)
  collar: {
    x: 38,      // Left edge (neck center 60 - half width 22) - wider for better visibility
    y: 48,      // Top of neck area
    width: 44,  // Increased from 24 for prominence (nearly 2x wider)
    height: 8,  // Increased from 6 for better visibility
    rx: 4,      // Border radius (increased proportionally)
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
