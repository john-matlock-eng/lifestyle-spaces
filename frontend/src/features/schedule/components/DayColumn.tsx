/**
 * DayColumn component - Single day column in week view
 */

import React from 'react';
import { TimeBlock } from './TimeBlock';
import type { TimeBlock as TimeBlockType, DayOfWeek } from '../types/schedule.types';
import { timeToMinutes } from '../utils/timeUtils';
import { useCollisionDetection } from '../hooks/useCollisionDetection';
import '../styles/schedule.css';

interface DayColumnProps {
  day: DayOfWeek;
  date: Date;
  timeBlocks: TimeBlockType[];
  onBlockClick?: (block: TimeBlockType) => void;
  onBlockEdit?: (block: TimeBlockType) => void;
  onBlockDelete?: (block: TimeBlockType) => void;
  onDrop?: (day: DayOfWeek, timeBlocks: TimeBlockType[]) => void;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent, day: DayOfWeek) => void;
  onDragLeave?: (e: React.DragEvent) => void;
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/**
 * Day column component for week view
 * Displays time blocks for a single day with collision detection
 */
export const DayColumn: React.FC<DayColumnProps> = ({
  day,
  date,
  timeBlocks,
  onBlockClick,
  onBlockEdit,
  onBlockDelete,
  onDrop,
  isDropTarget = false,
  onDragOver,
  onDragLeave,
}) => {
  const { collisions } = useCollisionDetection(timeBlocks);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(e, day);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(day, timeBlocks);
    }
  };

  /**
   * Calculate position and height for time block based on time
   */
  const getBlockStyle = (block: TimeBlockType): React.CSSProperties => {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);

    // Handle overnight blocks
    let duration = endMinutes - startMinutes;
    if (duration < 0) {
      duration = 1440 - startMinutes + endMinutes; // 1440 = 24 hours
    }

    // 1 minute = 1px, so position and height in pixels
    const top = startMinutes;
    const height = Math.max(duration, 30); // Minimum 30px height

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  /**
   * Check if a block has collisions
   */
  const hasCollision = (block: TimeBlockType): boolean => {
    return collisions.conflicts.some(
      (conflict) => conflict.block1.id === block.id || conflict.block2.id === block.id
    );
  };

  const formatDate = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = date.getDate();
    return `${month} ${dayNum}`;
  };

  return (
    <div
      className={`day-column ${isDropTarget ? 'drop-target' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label={`${DAY_NAMES[day]}, ${formatDate(date)}`}
    >
      <div className="day-column-header">
        <div className="day-name">{DAY_NAMES[day]}</div>
        <div className="day-date">{formatDate(date)}</div>
      </div>

      <div className="day-column-content">
        {timeBlocks.map((block, index) => (
          <TimeBlock
            key={block.id || `block-${index}`}
            timeBlock={block}
            onClick={onBlockClick}
            onEdit={onBlockEdit}
            onDelete={onBlockDelete}
            hasCollision={hasCollision(block)}
            style={getBlockStyle(block)}
            draggable
          />
        ))}

        {timeBlocks.length === 0 && (
          <div
            className="empty-day"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'var(--theme-text-secondary)',
              fontSize: '0.875rem',
              textAlign: 'center',
              opacity: 0.5,
            }}
          >
            No activities
          </div>
        )}
      </div>
    </div>
  );
};
