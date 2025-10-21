export type PositionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Position {
  x: number;
  y: number;
}

export interface NoGoZone {
  element: HTMLElement;
  center: Position;
  radius: number;
  priority: PositionPriority;
}

export interface SafePosition extends Position {
  score: number; // Higher is better
  conflicts: NoGoZone[];
}

export interface GetBestPositionOptions {
  noGoZones?: NoGoZone[];
  viewportWidth?: number;
  viewportHeight?: number;
  minEdgeDistance?: number;
  preferredPosition?: Position;
}

const INTERACTIVE_SELECTORS = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'nav',
  'header',
  'footer',
  '[role="button"]',
  '[role="link"]',
  '[role="navigation"]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
];

const DEFAULT_NO_GO_RADIUS = 200;
const MAX_THROTTLE_INTERVAL = 100; // 10 updates per second max

/**
 * Scan the DOM for interactive elements that should be avoided
 */
export function scanInteractiveElements(root: Document | HTMLElement = document): HTMLElement[] {
  const selector = INTERACTIVE_SELECTORS.join(', ');
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));

  return elements.filter((element) => {
    // Exclude hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Exclude disabled elements
    if (element.hasAttribute('disabled')) {
      return false;
    }

    return true;
  });
}

/**
 * Get the priority level for an element
 */
function getElementPriority(element: HTMLElement): PositionPriority {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');

  // Critical: form inputs, critical buttons
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return 'critical';
  }

  // High: buttons, links in nav
  if (
    tagName === 'button' ||
    role === 'button' ||
    (tagName === 'a' && element.closest('nav'))
  ) {
    return 'high';
  }

  // Medium: regular links, nav elements
  if (tagName === 'a' || tagName === 'nav' || role === 'navigation') {
    return 'medium';
  }

  // Low: everything else
  return 'low';
}

/**
 * Create no-go zones around interactive elements
 */
export function getNoGoZones(radius: number = DEFAULT_NO_GO_RADIUS): NoGoZone[] {
  const elements = scanInteractiveElements();

  return elements.map((element) => {
    const rect = element.getBoundingClientRect();

    return {
      element,
      center: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
      radius,
      priority: getElementPriority(element),
    };
  });
}

/**
 * Check if a position is safe (doesn't conflict with no-go zones)
 */
export function isPositionSafe(
  position: Position,
  zones: NoGoZone[],
  ellieSize: number = 100
): boolean {
  return zones.every((zone) => {
    const distance = Math.sqrt(
      Math.pow(position.x - zone.center.x, 2) + Math.pow(position.y - zone.center.y, 2)
    );

    return distance > zone.radius + ellieSize / 2;
  });
}

/**
 * Calculate score for a position (higher is better)
 */
function scorePosition(
  position: Position,
  zones: NoGoZone[],
  viewportWidth: number,
  viewportHeight: number,
  preferredPosition?: Position
): number {
  let score = 1000;

  // Penalty for being close to no-go zones
  zones.forEach((zone) => {
    const distance = Math.sqrt(
      Math.pow(position.x - zone.center.x, 2) + Math.pow(position.y - zone.center.y, 2)
    );

    if (distance < zone.radius) {
      // Inside no-go zone - heavy penalty
      const priorityMultiplier = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 5,
      }[zone.priority];

      score -= 500 * priorityMultiplier;
    } else if (distance < zone.radius * 1.5) {
      // Close to no-go zone - medium penalty
      score -= 100;
    }
  });

  // Bonus for being on the right side (preferred)
  if (position.x > viewportWidth * 0.6) {
    score += 100;
  }

  // Bonus for being in the right half
  if (position.x > viewportWidth / 2) {
    score += 50;
  }

  // Penalty for being too close to edges
  const edgeDistance = Math.min(
    position.x,
    viewportWidth - position.x,
    position.y,
    viewportHeight - position.y
  );

  if (edgeDistance < 20) {
    score -= 200;
  }

  // Bonus for being close to preferred position
  if (preferredPosition) {
    const distanceToPreferred = Math.sqrt(
      Math.pow(position.x - preferredPosition.x, 2) +
      Math.pow(position.y - preferredPosition.y, 2)
    );

    score += Math.max(0, 200 - distanceToPreferred);
  }

  return score;
}

/**
 * Find the best position for Ellie, avoiding UI collisions
 */
export function getBestPosition(options: GetBestPositionOptions = {}): SafePosition {
  const {
    noGoZones = getNoGoZones(),
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
    minEdgeDistance = 20,
    preferredPosition,
  } = options;

  // Generate candidate positions
  const candidates: SafePosition[] = [];

  // Priority zones: right side > left side > top > bottom
  const zones = [
    // Right edge (preferred)
    { x: viewportWidth - 100 - minEdgeDistance, y: viewportHeight - 100 - minEdgeDistance },
    { x: viewportWidth - 100 - minEdgeDistance, y: viewportHeight / 2 },
    { x: viewportWidth - 100 - minEdgeDistance, y: 100 + minEdgeDistance },

    // Left edge
    { x: 100 + minEdgeDistance, y: viewportHeight - 100 - minEdgeDistance },
    { x: 100 + minEdgeDistance, y: viewportHeight / 2 },
    { x: 100 + minEdgeDistance, y: 100 + minEdgeDistance },

    // Top edge
    { x: viewportWidth / 2, y: 100 + minEdgeDistance },
    { x: viewportWidth * 0.75, y: 100 + minEdgeDistance },
    { x: viewportWidth * 0.25, y: 100 + minEdgeDistance },

    // Bottom edge
    { x: viewportWidth / 2, y: viewportHeight - 100 - minEdgeDistance },
    { x: viewportWidth * 0.75, y: viewportHeight - 100 - minEdgeDistance },
    { x: viewportWidth * 0.25, y: viewportHeight - 100 - minEdgeDistance },

    // Center (fallback)
    { x: viewportWidth / 2, y: viewportHeight / 2 },
  ];

  // Add preferred position if provided
  if (preferredPosition) {
    zones.unshift(preferredPosition);
  }

  // Score each candidate position
  zones.forEach((pos) => {
    const conflicts = noGoZones.filter((zone) => {
      const distance = Math.sqrt(
        Math.pow(pos.x - zone.center.x, 2) + Math.pow(pos.y - zone.center.y, 2)
      );
      return distance < zone.radius + 50;
    });

    const score = scorePosition(pos, noGoZones, viewportWidth, viewportHeight, preferredPosition);

    candidates.push({
      x: pos.x,
      y: pos.y,
      score,
      conflicts,
    });
  });

  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);

  // Return best position
  return candidates[0] || {
    x: viewportWidth - 100 - minEdgeDistance,
    y: viewportHeight - 100 - minEdgeDistance,
    score: 0,
    conflicts: [],
  };
}

/**
 * Create a MutationObserver to watch for DOM changes
 */
export function createUIAwarenessObserver(
  callback: () => void,
  throttleMs: number = MAX_THROTTLE_INTERVAL
): MutationObserver {
  let timeoutId: number | null = null;
  let lastCall = 0;

  const throttledCallback = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= throttleMs) {
      lastCall = now;
      callback();
    } else {
      // Schedule for later
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        lastCall = Date.now();
        callback();
      }, throttleMs - timeSinceLastCall);
    }
  };

  return new MutationObserver(throttledCallback);
}
