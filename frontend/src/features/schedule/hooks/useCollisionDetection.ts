/**
 * Custom hook for collision detection in schedules
 */

import { useMemo, useCallback } from 'react';
import type { TimeBlock, CollisionResult } from '../types/schedule.types';
import {
  detectCollisions,
  wouldBlockCollide,
  getCollidingBlocks,
} from '../utils/collisionDetection';

interface UseCollisionDetectionResult {
  hasCollisions: boolean;
  collisions: CollisionResult;
  checkBlockCollision: (block: TimeBlock, existingBlocks: TimeBlock[]) => boolean;
  getBlockCollisions: (block: TimeBlock, allBlocks: TimeBlock[]) => TimeBlock[];
}

/**
 * Hook for detecting time block collisions
 */
export function useCollisionDetection(
  timeBlocks: TimeBlock[]
): UseCollisionDetectionResult {
  // Memoize collision detection result
  const collisions = useMemo(() => {
    return detectCollisions(timeBlocks);
  }, [timeBlocks]);

  const hasCollisions = collisions.hasCollision;

  // Callback to check if a new block would collide
  const checkBlockCollision = useCallback(
    (block: TimeBlock, existingBlocks: TimeBlock[]): boolean => {
      return wouldBlockCollide(block, existingBlocks, block.id);
    },
    []
  );

  // Callback to get all blocks that collide with a given block
  const getBlockCollisions = useCallback(
    (block: TimeBlock, allBlocks: TimeBlock[]): TimeBlock[] => {
      return getCollidingBlocks(block, allBlocks);
    },
    []
  );

  return {
    hasCollisions,
    collisions,
    checkBlockCollision,
    getBlockCollisions,
  };
}
