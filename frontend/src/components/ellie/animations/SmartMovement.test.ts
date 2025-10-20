import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Position,
  PersonalityMovementType,
  animateToPosition,
  applyPersonalityMovement,
  createArcPath,
  calculateBezierPoint,
  createPeekAnimation,
  createAttentionAnimation,
  ensureSixtyFPS,
} from './SmartMovement';

describe('SmartMovement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(cb, 16) as unknown as number; // ~60fps
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('calculateBezierPoint', () => {
    it('should return start point at t=0', () => {
      const start = { x: 0, y: 0 };
      const control1 = { x: 100, y: 100 };
      const control2 = { x: 200, y: 200 };
      const end = { x: 300, y: 300 };

      const point = calculateBezierPoint(start, control1, control2, end, 0);

      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
    });

    it('should return end point at t=1', () => {
      const start = { x: 0, y: 0 };
      const control1 = { x: 100, y: 100 };
      const control2 = { x: 200, y: 200 };
      const end = { x: 300, y: 300 };

      const point = calculateBezierPoint(start, control1, control2, end, 1);

      expect(point.x).toBe(300);
      expect(point.y).toBe(300);
    });

    it('should return midpoint at t=0.5 for linear curve', () => {
      const start = { x: 0, y: 0 };
      const control1 = { x: 50, y: 50 };
      const control2 = { x: 100, y: 100 };
      const end = { x: 150, y: 150 };

      const point = calculateBezierPoint(start, control1, control2, end, 0.5);

      expect(point.x).toBeCloseTo(75, 0);
      expect(point.y).toBeCloseTo(75, 0);
    });

    it('should handle different x and y values', () => {
      const start = { x: 0, y: 100 };
      const control1 = { x: 50, y: 150 };
      const control2 = { x: 100, y: 50 };
      const end = { x: 150, y: 100 };

      const point = calculateBezierPoint(start, control1, control2, end, 0.5);

      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(150);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(200);
    });
  });

  describe('animateToPosition', () => {
    it('should animate from start to end position', async () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      animateToPosition(start, end, {
        duration: 300,
        onUpdate,
        onComplete,
      });

      // Advance time
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(onUpdate).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });

    it('should use cubic-bezier easing', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const updates: Position[] = [];

      animateToPosition(start, end, {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        onUpdate: (pos) => updates.push({ ...pos }),
      });

      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(16);
      }

      // Easing should cause non-linear progression
      expect(updates.length).toBeGreaterThan(0);
      if (updates.length >= 3) {
        const firstDelta = updates[1].x - updates[0].x;
        const lastDelta = updates[updates.length - 1].x - updates[updates.length - 2].x;
        // Due to easing, deltas should vary
        expect(firstDelta).not.toBe(lastDelta);
      }
    });

    it('should call onUpdate at ~60fps', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const onUpdate = vi.fn();

      animateToPosition(start, end, {
        duration: 300,
        onUpdate,
      });

      // Advance 300ms (should be ~18 frames at 60fps)
      for (let i = 0; i < 18; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(onUpdate).toHaveBeenCalled();
      expect(onUpdate.mock.calls.length).toBeGreaterThanOrEqual(10);
    });

    it('should respect custom duration', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const onComplete = vi.fn();

      animateToPosition(start, end, {
        duration: 500,
        onComplete,
      });

      // Should not complete at 300ms
      for (let i = 0; i < 18; i++) {
        vi.advanceTimersByTime(16);
      }
      expect(onComplete).not.toHaveBeenCalled();

      // Should complete around 500ms
      for (let i = 0; i < 15; i++) {
        vi.advanceTimersByTime(16);
      }
      expect(onComplete).toHaveBeenCalled();
    });

    it('should be cancellable', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      const cancel = animateToPosition(start, end, {
        duration: 300,
        onUpdate,
        onComplete,
      });

      // Advance partially
      vi.advanceTimersByTime(100);

      cancel();

      // Continue advancing
      vi.advanceTimersByTime(300);

      // Should not complete after cancel
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('createArcPath', () => {
    it('should create arc around obstacle', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const obstacle = { x: 50, y: 50 };

      const path = createArcPath(start, end, obstacle);

      expect(path).toBeDefined();
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBeGreaterThan(2);
    });

    it('should include start and end points', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const obstacle = { x: 50, y: 50 };

      const path = createArcPath(start, end, obstacle);

      expect(path[0]).toEqual(start);
      expect(path[path.length - 1]).toEqual(end);
    });

    it('should avoid obstacle', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };
      const obstacle = { x: 50, y: 0 };

      const path = createArcPath(start, end, obstacle);

      // Middle points should deviate from straight line
      const middlePoint = path[Math.floor(path.length / 2)];
      expect(middlePoint.y).not.toBe(0);
    });

    it('should create smooth curve', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const obstacle = { x: 50, y: 50 };

      const path = createArcPath(start, end, obstacle, 10);

      expect(path.length).toBe(10);

      // Points should be evenly distributed
      for (let i = 1; i < path.length; i++) {
        const dist = Math.sqrt(
          Math.pow(path[i].x - path[i - 1].x, 2) +
          Math.pow(path[i].y - path[i - 1].y, 2)
        );
        expect(dist).toBeGreaterThan(0);
      }
    });
  });

  describe('applyPersonalityMovement', () => {
    it('should apply floating movement', () => {
      const basePosition = { x: 100, y: 100 };
      const floatingPosition = applyPersonalityMovement(
        basePosition,
        PersonalityMovementType.FLOATING,
        0
      );

      expect(floatingPosition.x).toBe(basePosition.x);
      expect(Math.abs(floatingPosition.y - basePosition.y)).toBeLessThanOrEqual(2);
    });

    it('should create 2px oscillation for floating', () => {
      const basePosition = { x: 100, y: 100 };

      const positions: number[] = [];
      for (let time = 0; time < 2000; time += 100) {
        const pos = applyPersonalityMovement(
          basePosition,
          PersonalityMovementType.FLOATING,
          time
        );
        positions.push(pos.y);
      }

      const minY = Math.min(...positions);
      const maxY = Math.max(...positions);

      expect(maxY - minY).toBeGreaterThan(0);
      expect(maxY - minY).toBeLessThanOrEqual(4);
    });

    it('should apply breathing movement', () => {
      const basePosition = { x: 100, y: 100 };
      const breathingPosition = applyPersonalityMovement(
        basePosition,
        PersonalityMovementType.BREATHING,
        0
      );

      // Breathing is a scale effect, position should be the same
      expect(breathingPosition.x).toBe(basePosition.x);
      expect(breathingPosition.y).toBe(basePosition.y);
    });

    it('should create subtle movement', () => {
      const basePosition = { x: 100, y: 100 };
      const subtlePosition = applyPersonalityMovement(
        basePosition,
        PersonalityMovementType.SUBTLE,
        0
      );

      // Should be very close to base position
      expect(Math.abs(subtlePosition.x - basePosition.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(subtlePosition.y - basePosition.y)).toBeLessThanOrEqual(1);
    });

    it('should vary with time', () => {
      const basePosition = { x: 100, y: 100 };

      const pos1 = applyPersonalityMovement(
        basePosition,
        PersonalityMovementType.FLOATING,
        0
      );
      const pos2 = applyPersonalityMovement(
        basePosition,
        PersonalityMovementType.FLOATING,
        1000
      );

      // Positions should differ due to animation
      expect(pos1.y).not.toBe(pos2.y);
    });
  });

  describe('createPeekAnimation', () => {
    it('should create scale pulse animation', () => {
      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      createPeekAnimation({
        onUpdate,
        onComplete,
      });

      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(onUpdate).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });

    it('should pulse from 1.0 to 1.2 and back', () => {
      const scales: number[] = [];

      createPeekAnimation({
        onUpdate: (scale) => scales.push(scale),
      });

      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.95);
      expect(Math.min(...scales)).toBeLessThanOrEqual(1.05);
      expect(Math.max(...scales)).toBeGreaterThanOrEqual(1.15);
      expect(Math.max(...scales)).toBeLessThanOrEqual(1.25);
    });

    it('should return to 1.0 at end', () => {
      let finalScale = 0;

      createPeekAnimation({
        onComplete: (scale) => {
          finalScale = scale;
        },
      });

      for (let i = 0; i < 50; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(finalScale).toBeCloseTo(1.0, 1);
    });

    it('should be cancellable', () => {
      const onComplete = vi.fn();

      const cancel = createPeekAnimation({
        onComplete,
      });

      vi.advanceTimersByTime(100);
      cancel();

      vi.advanceTimersByTime(500);

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('createAttentionAnimation', () => {
    it('should create gentle bounce animation', () => {
      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      createAttentionAnimation({
        onUpdate,
        onComplete,
      });

      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(onUpdate).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });

    it('should bounce vertically', () => {
      const offsets: number[] = [];

      createAttentionAnimation({
        onUpdate: (offset) => offsets.push(offset),
      });

      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(16);
      }

      // Should have negative offsets (upward bounce)
      const hasNegative = offsets.some((offset) => offset < 0);
      expect(hasNegative).toBe(true);

      // Should return to 0
      const lastOffset = offsets[offsets.length - 1];
      expect(Math.abs(lastOffset)).toBeLessThan(2);
    });

    it('should respect custom bounce height', () => {
      const offsets: number[] = [];

      createAttentionAnimation({
        bounceHeight: 20,
        onUpdate: (offset) => offsets.push(offset),
      });

      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(16);
      }

      const minOffset = Math.min(...offsets);
      expect(Math.abs(minOffset)).toBeGreaterThan(10);
    });
  });

  describe('ensureSixtyFPS', () => {
    it('should throttle function to 60fps', () => {
      const callback = vi.fn();
      const throttled = ensureSixtyFPS(callback);

      // Call many times rapidly
      for (let i = 0; i < 100; i++) {
        throttled();
      }

      // Should only call once per frame
      expect(callback.mock.calls.length).toBeLessThan(10);
    });

    it('should call with requestAnimationFrame', () => {
      const callback = vi.fn();
      const throttled = ensureSixtyFPS(callback);

      throttled();

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle rapid calls gracefully', () => {
      const callback = vi.fn();
      const throttled = ensureSixtyFPS(callback);

      for (let i = 0; i < 1000; i++) {
        throttled();
      }

      // Should not crash or cause memory issues
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero distance animation', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 100, y: 100 };
      const onComplete = vi.fn();

      animateToPosition(start, end, {
        duration: 300,
        onComplete,
      });

      vi.advanceTimersByTime(300);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle very short duration', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const onComplete = vi.fn();

      animateToPosition(start, end, {
        duration: 10,
        onComplete,
      });

      vi.advanceTimersByTime(20);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle very long duration', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const onUpdate = vi.fn();

      animateToPosition(start, end, {
        duration: 10000,
        onUpdate,
      });

      // Should still update smoothly
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should handle negative positions', () => {
      const start = { x: -100, y: -100 };
      const end = { x: -200, y: -200 };
      const onComplete = vi.fn();

      animateToPosition(start, end, {
        duration: 300,
        onComplete,
      });

      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(16);
      }

      expect(onComplete).toHaveBeenCalled();
    });
  });
});
