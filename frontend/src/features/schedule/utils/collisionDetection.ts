/**
 * Collision detection utilities for schedule time blocks
 */

import type { TimeBlock, CollisionResult } from '../types/schedule.types';
import { timeToMinutes } from './timeUtils';

/**
 * Check if two time blocks overlap
 */
export function doBlocksOverlap(block1: TimeBlock, block2: TimeBlock): boolean {
  const start1 = timeToMinutes(block1.startTime);
  const end1 = timeToMinutes(block1.endTime);
  const start2 = timeToMinutes(block2.startTime);
  const end2 = timeToMinutes(block2.endTime);

  // Handle overnight blocks (end time is before start time)
  const isOvernight1 = end1 < start1;
  const isOvernight2 = end2 < start2;

  if (isOvernight1 && isOvernight2) {
    // Both blocks span midnight - they definitely overlap
    return true;
  }

  if (isOvernight1) {
    // Block 1 spans midnight
    return start2 < end1 || start2 >= start1;
  }

  if (isOvernight2) {
    // Block 2 spans midnight
    return start1 < end2 || start1 >= start2;
  }

  // Normal case: neither block spans midnight
  return (start1 < end2 && end1 > start2);
}

/**
 * Detect all collisions in a list of time blocks
 */
export function detectCollisions(timeBlocks: TimeBlock[]): CollisionResult {
  const conflicts: Array<{ block1: TimeBlock; block2: TimeBlock }> = [];

  for (let i = 0; i < timeBlocks.length; i++) {
    for (let j = i + 1; j < timeBlocks.length; j++) {
      if (doBlocksOverlap(timeBlocks[i], timeBlocks[j])) {
        conflicts.push({
          block1: timeBlocks[i],
          block2: timeBlocks[j],
        });
      }
    }
  }

  return {
    hasCollision: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Check if a new block would collide with existing blocks
 */
export function wouldBlockCollide(
  newBlock: TimeBlock,
  existingBlocks: TimeBlock[],
  excludeBlockId?: string
): boolean {
  const blocksToCheck = excludeBlockId
    ? existingBlocks.filter((b) => b.id !== excludeBlockId)
    : existingBlocks;

  return blocksToCheck.some((block) => doBlocksOverlap(newBlock, block));
}

/**
 * Get all blocks that collide with a given block
 */
export function getCollidingBlocks(
  targetBlock: TimeBlock,
  allBlocks: TimeBlock[]
): TimeBlock[] {
  return allBlocks.filter(
    (block) => block.id !== targetBlock.id && doBlocksOverlap(block, targetBlock)
  );
}

/**
 * Calculate overlap duration in minutes
 */
export function calculateOverlapDuration(block1: TimeBlock, block2: TimeBlock): number {
  if (!doBlocksOverlap(block1, block2)) {
    return 0;
  }

  const start1 = timeToMinutes(block1.startTime);
  const end1 = timeToMinutes(block1.endTime);
  const start2 = timeToMinutes(block2.startTime);
  const end2 = timeToMinutes(block2.endTime);

  // For simplicity, only handle non-overnight blocks for overlap duration
  if (end1 < start1 || end2 < start2) {
    return 0; // Complex overnight overlap calculation
  }

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  return overlapEnd - overlapStart;
}

/**
 * Find gaps between time blocks (sorted by start time)
 */
export function findGaps(
  timeBlocks: TimeBlock[],
  minGapMinutes: number = 0
): Array<{ startTime: string; endTime: string; duration: number }> {
  if (timeBlocks.length === 0) {
    return [];
  }

  // Sort blocks by start time
  const sorted = [...timeBlocks].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const gaps: Array<{ startTime: string; endTime: string; duration: number }> = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = timeToMinutes(sorted[i].endTime);
    const nextStart = timeToMinutes(sorted[i + 1].startTime);

    // Skip if current block ends after next block starts (overlap)
    if (currentEnd >= nextStart) {
      continue;
    }

    const gapDuration = nextStart - currentEnd;

    if (gapDuration >= minGapMinutes) {
      gaps.push({
        startTime: sorted[i].endTime,
        endTime: sorted[i + 1].startTime,
        duration: gapDuration,
      });
    }
  }

  return gaps;
}

/**
 * Check if time blocks can be merged (adjacent or overlapping)
 */
export function canMergeBlocks(block1: TimeBlock, block2: TimeBlock): boolean {
  // Can merge if same activity type and they overlap or are adjacent
  if (block1.activityType !== block2.activityType) {
    return false;
  }

  if (doBlocksOverlap(block1, block2)) {
    return true;
  }

  // Check if adjacent (end of one equals start of other)
  return block1.endTime === block2.startTime || block2.endTime === block1.startTime;
}
