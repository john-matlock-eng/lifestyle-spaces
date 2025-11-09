/**
 * WeekView component - Grid layout showing full week schedule
 */

import React, { useState } from 'react';
import { DayColumn } from './DayColumn';
import type {
  ScheduleData,
  TimeBlock as TimeBlockType,
  DayOfWeek,
} from '../types/schedule.types';
import '../styles/schedule.css';

interface WeekViewProps {
  scheduleData: ScheduleData;
  weekStart: Date;
  onBlockClick?: (block: TimeBlockType, day: DayOfWeek) => void;
  onBlockEdit?: (block: TimeBlockType, day: DayOfWeek) => void;
  onBlockDelete?: (block: TimeBlockType, day: DayOfWeek) => void;
  onScheduleChange?: (scheduleData: ScheduleData) => void;
  readOnly?: boolean;
}

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Week view component with drag-and-drop support
 * Displays a grid of day columns with time blocks
 */
export const WeekView: React.FC<WeekViewProps> = ({
  scheduleData,
  weekStart,
  onBlockClick,
  onBlockEdit,
  onBlockDelete,
  onScheduleChange,
  readOnly = false,
}) => {
  const [draggedBlock, setDraggedBlock] = useState<{
    block: TimeBlockType;
    sourceDay: DayOfWeek;
  } | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<DayOfWeek | null>(null);

  /**
   * Get date for a specific day of the week
   */
  const getDateForDay = (dayIndex: number): Date => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  /**
   * Get time blocks for a specific day
   */
  const getTimeBlocksForDay = (day: DayOfWeek): TimeBlockType[] => {
    return scheduleData[day] || [];
  };

  /**
   * Handle drag start
   * TODO: Implement drag-and-drop functionality
   */
  // const handleDragStart = (block: TimeBlockType, day: DayOfWeek) => {
  //   if (readOnly) return;
  //   setDraggedBlock({ block, sourceDay: day });
  // };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent, day: DayOfWeek) => {
    e.preventDefault();
    setDropTargetDay(day);
  };

  /**
   * Handle drag leave
   */
  const handleDragLeave = () => {
    setDropTargetDay(null);
  };

  /**
   * Handle drop
   */
  const handleDrop = (targetDay: DayOfWeek) => {
    if (!draggedBlock || readOnly) return;

    const { block, sourceDay } = draggedBlock;

    // If dropped on same day, do nothing
    if (sourceDay === targetDay) {
      setDraggedBlock(null);
      setDropTargetDay(null);
      return;
    }

    // Create updated schedule data
    const updatedSchedule = { ...scheduleData };

    // Remove block from source day
    updatedSchedule[sourceDay] = (updatedSchedule[sourceDay] || []).filter(
      (b) => b.id !== block.id
    );

    // Add block to target day
    updatedSchedule[targetDay] = [...(updatedSchedule[targetDay] || []), block];

    // Update schedule
    if (onScheduleChange) {
      onScheduleChange(updatedSchedule);
    }

    setDraggedBlock(null);
    setDropTargetDay(null);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    setDraggedBlock(null);
    setDropTargetDay(null);
  };

  /**
   * Generate time markers (00:00 to 23:00)
   */
  const generateTimeMarkers = () => {
    const markers: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      markers.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  return (
    <div className="week-view" role="grid" aria-label="Weekly schedule">
      {/* Time Ruler */}
      <div className="time-ruler" role="rowheader">
        {timeMarkers.map((time) => (
          <div key={time} className="time-marker" aria-label={`${time}`}>
            {time}
          </div>
        ))}
      </div>

      {/* Day Columns */}
      {DAYS.map((day, index) => {
        const blocks = getTimeBlocksForDay(day);
        const date = getDateForDay(index);

        return (
          <DayColumn
            key={day}
            day={day}
            date={date}
            timeBlocks={blocks}
            onBlockClick={(block) => onBlockClick?.(block, day)}
            onBlockEdit={(block) => onBlockEdit?.(block, day)}
            onBlockDelete={(block) => onBlockDelete?.(block, day)}
            onDrop={(targetDay) => handleDrop(targetDay)}
            isDropTarget={dropTargetDay === day}
            onDragOver={(e) => handleDragOver(e, day)}
            onDragLeave={handleDragLeave}
          />
        );
      })}

      {/* Drag overlay for better UX */}
      {draggedBlock && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 999,
          }}
          onDragEnd={handleDragEnd}
        />
      )}
    </div>
  );
};
