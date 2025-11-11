/**
 * Tests for collision detection utilities
 */

import { describe, it, expect } from 'vitest';
import type { TimeBlock } from '../types/schedule.types';
import {
  doBlocksOverlap,
  detectCollisions,
  wouldBlockCollide,
  getCollidingBlocks,
  findGaps,
} from './collisionDetection';

describe('collisionDetection', () => {
  const block1: TimeBlock = {
    id: '1',
    startTime: '09:00',
    endTime: '10:00',
    activity: 'Meeting',
    activityType: 'work',
  };

  const block2: TimeBlock = {
    id: '2',
    startTime: '09:30',
    endTime: '11:00',
    activity: 'Workshop',
    activityType: 'study',
  };

  const block3: TimeBlock = {
    id: '3',
    startTime: '11:00',
    endTime: '12:00',
    activity: 'Lunch',
    activityType: 'meal',
  };

  describe('doBlocksOverlap', () => {
    it('should detect overlapping blocks', () => {
      expect(doBlocksOverlap(block1, block2)).toBe(true);
    });

    it('should not detect overlap for adjacent blocks', () => {
      expect(doBlocksOverlap(block2, block3)).toBe(false);
    });

    it('should not detect overlap for separate blocks', () => {
      const earlyBlock: TimeBlock = {
        ...block1,
        startTime: '08:00',
        endTime: '08:30',
      };
      expect(doBlocksOverlap(earlyBlock, block1)).toBe(false);
    });

    it('should handle overnight blocks', () => {
      const nightBlock: TimeBlock = {
        id: '4',
        startTime: '23:00',
        endTime: '01:00',
        activity: 'Sleep',
        activityType: 'sleep',
      };

      const morningBlock: TimeBlock = {
        id: '5',
        startTime: '00:30',
        endTime: '02:00',
        activity: 'Early Work',
        activityType: 'work',
      };

      expect(doBlocksOverlap(nightBlock, morningBlock)).toBe(true);
    });
  });

  describe('detectCollisions', () => {
    it('should detect all collisions in a list', () => {
      const result = detectCollisions([block1, block2, block3]);

      expect(result.hasCollision).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].block1.id).toBe('1');
      expect(result.conflicts[0].block2.id).toBe('2');
    });

    it('should return no collisions for non-overlapping blocks', () => {
      const result = detectCollisions([block1, block3]);

      expect(result.hasCollision).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle empty list', () => {
      const result = detectCollisions([]);

      expect(result.hasCollision).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('wouldBlockCollide', () => {
    it('should detect if new block would collide', () => {
      const newBlock: TimeBlock = {
        id: 'new',
        startTime: '09:30',
        endTime: '10:30',
        activity: 'New Meeting',
        activityType: 'work',
      };

      expect(wouldBlockCollide(newBlock, [block1, block3])).toBe(true);
    });

    it('should not detect collision for non-overlapping block', () => {
      const newBlock: TimeBlock = {
        id: 'new',
        startTime: '12:00',
        endTime: '13:00',
        activity: 'Afternoon Work',
        activityType: 'work',
      };

      expect(wouldBlockCollide(newBlock, [block1, block3])).toBe(false);
    });

    it('should exclude block with same ID', () => {
      const updatedBlock: TimeBlock = {
        ...block1,
        endTime: '10:30',
      };

      expect(wouldBlockCollide(updatedBlock, [block1, block3], block1.id)).toBe(false);
    });
  });

  describe('getCollidingBlocks', () => {
    it('should get all blocks that collide with target', () => {
      const blocks = [block1, block2, block3];
      const colliding = getCollidingBlocks(block1, blocks);

      expect(colliding).toHaveLength(1);
      expect(colliding[0].id).toBe('2');
    });

    it('should return empty array if no collisions', () => {
      const blocks = [block1, block3];
      const colliding = getCollidingBlocks(block3, blocks);

      expect(colliding).toHaveLength(0);
    });
  });

  describe('findGaps', () => {
    it('should find gaps between blocks', () => {
      const gaps = findGaps([block1, block3]);

      expect(gaps).toHaveLength(1);
      expect(gaps[0].startTime).toBe('10:00');
      expect(gaps[0].endTime).toBe('11:00');
      expect(gaps[0].duration).toBe(60);
    });

    it('should respect minimum gap minutes', () => {
      const gaps = findGaps([block1, block3], 90);

      expect(gaps).toHaveLength(0);
    });

    it('should handle overlapping blocks', () => {
      const gaps = findGaps([block1, block2]);

      expect(gaps).toHaveLength(0);
    });
  });
});
