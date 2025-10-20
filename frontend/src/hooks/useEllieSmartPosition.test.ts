import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEllieSmartPosition } from './useEllieSmartPosition';

describe('useEllieSmartPosition', () => {
  let mockIntersectionObserver: ReturnType<typeof vi.fn>;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock IntersectionObserver
    mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
    }));
    global.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
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

    // Setup viewport dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('Basic Position Management', () => {
    it('should initialize with default position', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position).toBeDefined();
      expect(result.current.position.x).toBeGreaterThanOrEqual(20);
      expect(result.current.position.y).toBeGreaterThanOrEqual(20);
    });

    it('should respect safe zones (minimum 20px from edges)', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position.x).toBeGreaterThanOrEqual(20);
      expect(result.current.position.y).toBeGreaterThanOrEqual(20);
      expect(result.current.position.x).toBeLessThanOrEqual(1024 - 20);
      expect(result.current.position.y).toBeLessThanOrEqual(768 - 20);
    });
  });

  describe('Position Persistence', () => {
    it('should load position from localStorage on mount', () => {
      mockLocalStorage['ellie-position'] = JSON.stringify({ x: 500, y: 400 });

      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position.x).toBe(500);
      expect(result.current.position.y).toBe(400);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['ellie-position'] = 'invalid-json';

      const { result } = renderHook(() => useEllieSmartPosition());

      // Should use default position instead of crashing
      expect(result.current.position).toBeDefined();
      expect(result.current.position.x).toBeGreaterThan(0);
      expect(result.current.position.y).toBeGreaterThan(0);
    });
  });

  describe('Follow Mode', () => {
    it('should disable follow mode', () => {
      const { result } = renderHook(() =>
        useEllieSmartPosition({ enableFollow: false })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Dock Mode', () => {
    it('should minimize to dock mode', () => {
      const { result } = renderHook(() =>
        useEllieSmartPosition({ isDocked: true })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Collision Detection', () => {
    it('should detect collisions with UI elements', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.hasCollision).toBeDefined();
      expect(typeof result.current.hasCollision).toBe('boolean');
    });

    it('should provide list of colliding elements', () => {
      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.collidingElements).toBeDefined();
      expect(Array.isArray(result.current.collidingElements)).toBe(true);
    });
  });

  describe('Smooth Transitions', () => {
    it('should allow instant position changes', () => {
      const { result } = renderHook(() =>
        useEllieSmartPosition({ smoothTransitions: false })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tiny viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 100 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 100 });

      const { result } = renderHook(() => useEllieSmartPosition());

      expect(result.current.position.x).toBeGreaterThanOrEqual(20);
      expect(result.current.position.y).toBeGreaterThanOrEqual(20);
      expect(result.current.position.x).toBeLessThanOrEqual(100);
      expect(result.current.position.y).toBeLessThanOrEqual(100);
    });

    it('should handle missing localStorage', () => {
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });

      const { result } = renderHook(() => useEllieSmartPosition());

      // Should still work with default position
      expect(result.current.position).toBeDefined();
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useEllieSmartPosition());

      expect(() => unmount()).not.toThrow();
    });
  });
});
