export interface Position {
  x: number;
  y: number;
}

export interface AnimationOptions {
  duration?: number;
  easing?: string;
  onUpdate?: (position: Position) => void;
  onComplete?: () => void;
}

export interface PeekAnimationOptions {
  duration?: number;
  onUpdate?: (scale: number) => void;
  onComplete?: (scale: number) => void;
}

export interface AttentionAnimationOptions {
  duration?: number;
  bounceHeight?: number;
  onUpdate?: (offset: number) => void;
  onComplete?: () => void;
}

export enum PersonalityMovementType {
  FLOATING = 'floating',
  BREATHING = 'breathing',
  SUBTLE = 'subtle',
}

const CUBIC_BEZIER = { x1: 0.4, y1: 0, x2: 0.2, y2: 1 };
const FRAME_DURATION = 1000 / 60; // 60 FPS

/**
 * Calculate cubic bezier easing
 */
function cubicBezierEasing(t: number): number {
  const { x1, y1, x2, y2 } = CUBIC_BEZIER;

  // Simplified cubic bezier for common easing curve
  if (t < 0.5) {
    return 4 * t * t * t;
  } else {
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

/**
 * Calculate a point on a cubic Bezier curve
 */
export function calculateBezierPoint(
  p0: Position,
  p1: Position,
  p2: Position,
  p3: Position,
  t: number
): Position {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  return { x, y };
}

/**
 * Animate from one position to another with smooth easing
 */
export function animateToPosition(
  start: Position,
  end: Position,
  options: AnimationOptions = {}
): () => void {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
    onUpdate,
    onComplete,
  } = options;

  const startTime = performance.now();
  let animationFrameId: number | null = null;
  let cancelled = false;

  const animate = (currentTime: number) => {
    if (cancelled) return;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Apply easing
    const eased = cubicBezierEasing(progress);

    // Calculate current position
    const current = {
      x: start.x + (end.x - start.x) * eased,
      y: start.y + (end.y - start.y) * eased,
    };

    if (onUpdate) {
      onUpdate(current);
    }

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      if (onComplete) {
        onComplete();
      }
    }
  };

  animationFrameId = requestAnimationFrame(animate);

  // Return cancel function
  return () => {
    cancelled = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

/**
 * Create an arc path around an obstacle
 */
export function createArcPath(
  start: Position,
  end: Position,
  obstacle: Position,
  steps: number = 20
): Position[] {
  // Calculate arc control points
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Determine arc direction (away from obstacle)
  const dx = midX - obstacle.x;
  const dy = midY - obstacle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const arcHeight = Math.max(50, distance * 0.3);
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const control1 = {
    x: start.x + (midX - start.x) * 0.5 + perpX * arcHeight,
    y: start.y + (midY - start.y) * 0.5 + perpY * arcHeight,
  };

  const control2 = {
    x: midX + (end.x - midX) * 0.5 + perpX * arcHeight,
    y: midY + (end.y - midY) * 0.5 + perpY * arcHeight,
  };

  // Generate path points
  const path: Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = calculateBezierPoint(start, control1, control2, end, t);
    path.push(point);
  }

  return path;
}

/**
 * Apply personality movement (subtle animations)
 */
export function applyPersonalityMovement(
  basePosition: Position,
  type: PersonalityMovementType,
  time: number
): Position {
  switch (type) {
    case PersonalityMovementType.FLOATING: {
      // Gentle 2px vertical oscillation
      const offset = Math.sin((time / 1000) * Math.PI) * 2;
      return {
        x: basePosition.x,
        y: basePosition.y + offset,
      };
    }

    case PersonalityMovementType.BREATHING: {
      // Breathing is a scale effect, not position change
      return basePosition;
    }

    case PersonalityMovementType.SUBTLE: {
      // Very subtle random movement
      const offsetX = Math.sin((time / 2000) * Math.PI) * 0.5;
      const offsetY = Math.cos((time / 2000) * Math.PI) * 0.5;
      return {
        x: basePosition.x + offsetX,
        y: basePosition.y + offsetY,
      };
    }

    default:
      return basePosition;
  }
}

/**
 * Create a peek animation (scale pulse: 1.0 -> 1.2 -> 1.0)
 */
export function createPeekAnimation(options: PeekAnimationOptions = {}): () => void {
  const { duration = 600, onUpdate, onComplete } = options;

  const startTime = performance.now();
  let animationFrameId: number | null = null;
  let cancelled = false;

  const animate = (currentTime: number) => {
    if (cancelled) return;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Scale from 1.0 to 1.2 and back
    const scale = 1.0 + Math.sin(progress * Math.PI) * 0.2;

    if (onUpdate) {
      onUpdate(scale);
    }

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      if (onComplete) {
        onComplete(1.0);
      }
    }
  };

  animationFrameId = requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

/**
 * Create attention-getting animation (gentle bounce)
 */
export function createAttentionAnimation(
  options: AttentionAnimationOptions = {}
): () => void {
  const { duration = 500, bounceHeight = 10, onUpdate, onComplete } = options;

  const startTime = performance.now();
  let animationFrameId: number | null = null;
  let cancelled = false;

  const animate = (currentTime: number) => {
    if (cancelled) return;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Bounce with decay
    const bounce = Math.sin(progress * Math.PI * 2) * bounceHeight * (1 - progress);
    const offset = -Math.abs(bounce); // Negative for upward movement

    if (onUpdate) {
      onUpdate(offset);
    }

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      if (onComplete) {
        onComplete();
      }
    }
  };

  animationFrameId = requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

/**
 * Ensure function runs at max 60fps
 */
export function ensureSixtyFPS<T extends (...args: any[]) => void>(fn: T): T {
  let frameId: number | null = null;
  let lastArgs: any[] | null = null;

  const throttled = (...args: any[]) => {
    lastArgs = args;

    if (frameId === null) {
      frameId = requestAnimationFrame(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        frameId = null;
        lastArgs = null;
      });
    }
  };

  return throttled as T;
}

/**
 * Get breathing scale for current time
 */
export function getBreathingScale(time: number): number {
  // Slow breathing: 3 second cycle
  const breathCycle = 3000;
  const progress = (time % breathCycle) / breathCycle;

  // Gentle scale from 1.0 to 1.05 and back
  return 1.0 + Math.sin(progress * Math.PI * 2) * 0.025;
}
