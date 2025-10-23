import { useState, useEffect, useCallback, useRef } from 'react';

export interface ElliePosition {
  x: number;
  y: number;
}

export interface UseEllieSmartPositionOptions {
  followMode?: boolean;
  initialPosition?: ElliePosition;
}

export interface UseEllieSmartPositionReturn {
  position: ElliePosition;
  setPosition: (position: ElliePosition, options?: { animate?: boolean }) => void;
  animateToPosition: (position: ElliePosition) => void;
  cursorProximity: number | null;
  isDocked: boolean;
  toggleDock: () => void;
  hasCollision: boolean;
  collidingElements: HTMLElement[];
}

const SAFE_ZONE_MARGIN = 20;
// const FOLLOW_DELAY = 500; // Removed - scroll following disabled
const STORAGE_KEY = 'ellie-position';

export const useEllieSmartPosition = (
  options: UseEllieSmartPositionOptions = {}
): UseEllieSmartPositionReturn => {
  const { followMode = false, initialPosition } = options;

  // Get default position (bottom-right with safe zone)
  const getDefaultPosition = useCallback((): ElliePosition => {
    const x = window.innerWidth - 200 - SAFE_ZONE_MARGIN;
    const y = window.innerHeight - 200 - SAFE_ZONE_MARGIN;
    const defaultPos = { x: Math.max(SAFE_ZONE_MARGIN, x), y: Math.max(SAFE_ZONE_MARGIN, y) };
    console.log('[useEllieSmartPosition] getDefaultPosition:', defaultPos, 'viewport:', { width: window.innerWidth, height: window.innerHeight });
    return defaultPos;
  }, []);

  // Load position from localStorage or use default
  const getInitialPosition = useCallback((): ElliePosition => {
    console.log('[useEllieSmartPosition] getInitialPosition called with initialPosition:', initialPosition);

    if (initialPosition) {
      const constrained = constrainPosition(initialPosition);
      console.log('[useEllieSmartPosition] Using provided initialPosition:', initialPosition, '=> constrained:', constrained);
      return constrained;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ElliePosition;
        const constrained = constrainPosition(parsed);
        console.log('[useEllieSmartPosition] Loaded from localStorage:', parsed, '=> constrained:', constrained);
        return constrained;
      }
    } catch (error) {
      console.warn('Failed to load Ellie position from localStorage:', error);
    }

    const defaultPos = getDefaultPosition();
    console.log('[useEllieSmartPosition] Using default position:', defaultPos);
    return defaultPos;
  }, [initialPosition, getDefaultPosition]);

  // State
  const [position, setPositionState] = useState<ElliePosition>(getInitialPosition);
  const [cursorProximity, setCursorProximity] = useState<number | null>(null);
  const [isDocked, setIsDocked] = useState(false);
  const [hasCollision] = useState(false);
  const [collidingElements] = useState<HTMLElement[]>([]);

  // Refs
  // const followTimeoutRef = useRef<number | null>(null); // Removed - scroll following disabled
  const animationFrameRef = useRef<number | null>(null);
  const dockedPositionRef = useRef<ElliePosition | null>(null);
  const isAnimatingRef = useRef(false);

  // Constrain position to viewport with safe zones
  // Assumes Ellie + control panel is ~200px wide/tall
  function constrainPosition(pos: ElliePosition): ElliePosition {
    const ELLIE_SIZE = 200; // Approximate size including control panel
    const maxX = window.innerWidth - ELLIE_SIZE - SAFE_ZONE_MARGIN;
    const maxY = window.innerHeight - ELLIE_SIZE - SAFE_ZONE_MARGIN;

    return {
      x: Math.max(SAFE_ZONE_MARGIN, Math.min(pos.x, maxX)),
      y: Math.max(SAFE_ZONE_MARGIN, Math.min(pos.y, maxY)),
    };
  }

  // Save position to localStorage
  const savePosition = useCallback((pos: ElliePosition) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch (error) {
      console.warn('Failed to save Ellie position to localStorage:', error);
    }
  }, []);

  // Animate to target position
  const animateToPosition = useCallback((targetPos: ElliePosition) => {
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Get start position from DOM to avoid closure issues
    const getStartPos = (): ElliePosition => {
      // Use ref to get current position without dependency
      return position;
    };

    const startPos = getStartPos();
    const constrainedTarget = constrainPosition(targetPos);
    const startTime = performance.now();
    const duration = 300; // ms

    isAnimatingRef.current = true;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic bezier easing (0.4, 0, 0.2, 1)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const newPos = {
        x: startPos.x + (constrainedTarget.x - startPos.x) * eased,
        y: startPos.y + (constrainedTarget.y - startPos.y) * eased,
      };

      setPositionState(newPos);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
        animationFrameRef.current = null;
        setPositionState(constrainedTarget);
        savePosition(constrainedTarget);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [position, savePosition]);

  // Set position with optional animation
  const setPosition = useCallback(
    (newPos: ElliePosition, opts: { animate?: boolean } = { animate: true }) => {
      const constrainedPos = constrainPosition(newPos);

      if (opts.animate) {
        animateToPosition(constrainedPos);
      } else {
        setPositionState(constrainedPos);
        savePosition(constrainedPos);
      }
      // Note: Auto edge-snapping removed as it was causing Ellie to get stuck at edges
    },
    [savePosition, animateToPosition]
  );

  // Toggle dock mode
  const toggleDock = useCallback(() => {
    setIsDocked((prev) => {
      if (!prev) {
        // Entering dock mode - save current position
        dockedPositionRef.current = position;
        return true;
      } else {
        // Exiting dock mode - restore position
        if (dockedPositionRef.current) {
          setPosition(dockedPositionRef.current, { animate: true });
        }
        dockedPositionRef.current = null;
        return false;
      }
    });
  }, [position, setPosition]);

  // Handle mouse move for proximity detection
  // DISABLED nudging as it was interfering with dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPositionState((currentPos) => {
        const distance = Math.sqrt(
          Math.pow(e.clientX - currentPos.x, 2) + Math.pow(e.clientY - currentPos.y, 2)
        );

        setCursorProximity(distance);

        // Just track proximity, no nudging to avoid interfering with drag
        return currentPos;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPositionState((prev) => constrainPosition(prev));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle follow mode (scroll following)
  // DISABLED: This was causing position updates on scroll, interfering with user control
  /*
  useEffect(() => {
    if (!followMode) {
      return;
    }

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
      }

      followTimeoutRef.current = window.setTimeout(() => {
        const scrollOffset = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;

        setPositionState((currentPos) => {
          const newPos = constrainPosition({
            x: currentPos.x,
            y: currentPos.y + scrollOffset * 0.1, // Follow with damping
          });
          return newPos;
        });
      }, FOLLOW_DELAY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
      }
    };
  }, [followMode]);
  */

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    position,
    setPosition,
    animateToPosition,
    cursorProximity,
    isDocked,
    toggleDock,
    hasCollision,
    collidingElements,
  };
};
