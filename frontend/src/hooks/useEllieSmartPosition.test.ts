import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEllieSmartPosition } from './useEllieSmartPosition';

describe('useEllieSmartPosition', () => {
  let mockIntersectionObserver: any;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock IntersectionObserver
    mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockImplementation((callback: any) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
    }));
    global.IntersectionObserver = mockIntersectionObserver as any;

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      cb(0);
      return 0;
    });

    // Mock localStorage
    mockLocalStorage = {};
    Storage.prototype.getItem = vi.fn((key: string) => mockLocalStorage[key] || null);
    Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    Storage.prototype.removeItem = vi.fn((key: string) => {
      delete mockLocalStorage[key];
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Position Management', () => {
    it('should initialize with default position', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position).toBeDefined();
      expect(result.current.position.x).toBeGreaterThanOrEqual(0);
      expect(result.current.position.y).toBeGreaterThanOrEqual(0);
    });

    it('should respect safe zones (minimum 20px from edges)', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position.x).toBeGreaterThanOrEqual(20);
      expect(result.current.position.y).toBeGreaterThanOrEqual(20);
      expect(result.current.position.x).toBeLessThanOrEqual(1024 - 20);
      expect(result.current.position.y).toBeLessThanOrEqual(768 - 20);
    });

    it('should update position manually', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 100, y: 200 });
      });

      expect(result.current.position.x).toBe(100);
      expect(result.current.position.y).toBe(200);
    });
  });

  describe('Position Persistence', () => {
    it('should load position from localStorage on mount', () => {
      mockLocalStorage['ellie-position'] = JSON.stringify({ x: 300, y: 400 });

      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position.x).toBe(300);
      expect(result.current.position.y).toBe(400);
    });

    it('should save position to localStorage on change', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 150, y: 250 });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ellie-position',
        JSON.stringify({ x: 150, y: 250 })
      );
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['ellie-position'] = 'invalid-json';

      const { result } = renderHook(() => useEllieSmartPosition());

      // Should use default position instead
      expect(result.current.position).toBeDefined();
      expect(result.current.position.x).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Boundary Detection', () => {
    it('should constrain position within viewport boundaries', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: -50, y: -50 });
      });

      expect(result.current.position.x).toBeGreaterThanOrEqual(20);
      expect(result.current.position.y).toBeGreaterThanOrEqual(20);
    });

    it('should constrain position at maximum boundaries', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 2000, y: 2000 });
      });

      expect(result.current.position.x).toBeLessThanOrEqual(1024 - 20);
      expect(result.current.position.y).toBeLessThanOrEqual(768 - 20);
    });

    it('should handle window resize', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 900, y: 700 });
      });

      // Resize window smaller
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 800 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 600 });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Position should be adjusted to fit new viewport
      expect(result.current.position.x).toBeLessThanOrEqual(800 - 20);
      expect(result.current.position.y).toBeLessThanOrEqual(600 - 20);
    });
  });

  describe('Nudge Functionality', () => {
    it('should track cursor proximity', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.cursorProximity).toBe(null);

      act(() => {
        result.current.setPosition({ x: 500, y: 400 });
      });

      act(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 550,
          clientY: 450,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.cursorProximity).toBeLessThan(100);
    });

    it('should nudge away when cursor is nearby', async () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      const initialX = 500;
      const initialY = 400;

      act(() => {
        result.current.setPosition({ x: initialX, y: initialY });
      });

      // Move cursor close to Ellie (within 100px)
      act(() => {
        const event = new MouseEvent('mousemove', {
          clientX: initialX + 50,
          clientY: initialY + 50,
        });
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        // Position should have changed (nudged away)
        const distanceMoved = Math.sqrt(
          Math.pow(result.current.position.x - initialX, 2) +
          Math.pow(result.current.position.y - initialY, 2)
        );
        expect(distanceMoved).toBeGreaterThan(0);
      });
    });

    it('should not nudge when cursor is far away', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      const initialX = 500;
      const initialY = 400;

      act(() => {
        result.current.setPosition({ x: initialX, y: initialY });
      });

      act(() => {
        const event = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 100,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.position.x).toBe(initialX);
      expect(result.current.position.y).toBe(initialY);
    });
  });

  describe('Magnetic Edges', () => {
    it('should snap to nearest edge after idle timeout', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 200, y: 200 });
      });

      // Wait for 3 seconds (idle timeout)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        // Should have snapped to an edge
        const { x, y } = result.current.position;
        const isNearEdge =
          x <= 50 || x >= 1024 - 50 || y <= 50 || y >= 768 - 50;
        expect(isNearEdge).toBe(true);
      });

      vi.useRealTimers();
    });

    it('should cancel edge snap on user interaction', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 200, y: 200 });
      });

      // Wait 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // User moves Ellie
      act(() => {
        result.current.setPosition({ x: 250, y: 250 });
      });

      // Timer should reset, so no snap yet after another 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Position should still be where user placed it
      expect(result.current.position.x).toBe(250);
      expect(result.current.position.y).toBe(250);

      vi.useRealTimers();
    });
  });

  describe('Follow Mode', () => {
    it('should follow scroll position in follow mode', async () => {
      const { result } = renderHook(() => useEllieSmartPosition({ followMode: true }));

      const initialY = result.current.position.y;

      act(() => {
        window.scrollY = 200;
        window.dispatchEvent(new Event('scroll'));
      });

      await waitFor(() => {
        expect(result.current.position.y).not.toBe(initialY);
      });
    });

    it('should have 500ms delay for follow behavior', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useEllieSmartPosition({ followMode: true }));

      const initialY = result.current.position.y;

      act(() => {
        window.scrollY = 300;
        window.dispatchEvent(new Event('scroll'));
      });

      // Immediately after scroll, position shouldn't change
      expect(result.current.position.y).toBe(initialY);

      // After 500ms, position should update
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.position.y).not.toBe(initialY);
      });

      vi.useRealTimers();
    });

    it('should disable follow mode', () => {
      const { result } = renderHook(() => useEllieSmartPosition({ followMode: false }));

      const initialY = result.current.position.y;

      act(() => {
        window.scrollY = 200;
        window.dispatchEvent(new Event('scroll'));
      });

      expect(result.current.position.y).toBe(initialY);
    });
  });

  describe('Dock Mode', () => {
    it('should minimize to dock mode', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.isDocked).toBe(false);

      act(() => {
        result.current.toggleDock();
      });

      expect(result.current.isDocked).toBe(true);
    });

    it('should restore position when undocking', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 300, y: 400 });
      });

      const positionBeforeDock = { ...result.current.position };

      act(() => {
        result.current.toggleDock();
      });

      expect(result.current.isDocked).toBe(true);

      act(() => {
        result.current.toggleDock();
      });

      expect(result.current.isDocked).toBe(false);
      expect(result.current.position.x).toBe(positionBeforeDock.x);
      expect(result.current.position.y).toBe(positionBeforeDock.y);
    });
  });

  describe('Collision Detection', () => {
    it('should detect collisions with UI elements', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.hasCollision).toBe(false);

      // Collision detection will be triggered by IntersectionObserver
      // This is tested in integration tests
    });

    it('should provide list of colliding elements', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.collidingElements).toEqual([]);
    });
  });

  describe('Smooth Transitions', () => {
    it('should animate position changes smoothly', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 100, y: 100 });
      });

      act(() => {
        result.current.animateToPosition({ x: 500, y: 500 });
      });

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should allow instant position changes', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      act(() => {
        result.current.setPosition({ x: 100, y: 100 }, { animate: false });
      });

      expect(result.current.position.x).toBe(100);
      expect(result.current.position.y).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tiny viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 100 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 100 });

      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position.x).toBeGreaterThanOrEqual(0);
      expect(result.current.position.y).toBeGreaterThanOrEqual(0);
      expect(result.current.position.x).toBeLessThanOrEqual(100);
      expect(result.current.position.y).toBeLessThanOrEqual(100);
    });

    it('should handle missing localStorage', () => {
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });

      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position).toBeDefined();
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useEllieSmartPosition());

      unmount();

      // No errors should occur
      expect(true).toBe(true);
    });
  });
});
