/**
 * TimeBlock component - Individual time block display
 */

import React from 'react';
import type { TimeBlock as TimeBlockType } from '../types/schedule.types';
import { formatTimeRange, calculateDuration, formatDuration } from '../utils/timeUtils';
import { getActivityIcon } from '../utils/activityTypes';
import '../styles/schedule.css';

interface TimeBlockProps {
  timeBlock: TimeBlockType;
  onClick?: (timeBlock: TimeBlockType) => void;
  onEdit?: (timeBlock: TimeBlockType) => void;
  onDelete?: (timeBlock: TimeBlockType) => void;
  hasCollision?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, timeBlock: TimeBlockType) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

/**
 * Individual time block component
 * Shows activity, time range, and optional description
 * Supports drag-and-drop and collision detection
 */
export const TimeBlock: React.FC<TimeBlockProps> = ({
  timeBlock,
  onClick,
  onEdit,
  onDelete,
  hasCollision = false,
  isDragging = false,
  style,
  draggable = false,
  onDragStart,
  onDragEnd,
}) => {
  const duration = calculateDuration(timeBlock.startTime, timeBlock.endTime);
  const icon = getActivityIcon(timeBlock.activityType);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(timeBlock);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(timeBlock);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(timeBlock);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, timeBlock);
    }
  };

  const blockStyle: React.CSSProperties = {
    ...style,
    backgroundColor: timeBlock.color || 'rgba(59, 130, 246, 0.2)',
    borderColor: timeBlock.color || '#3b82f6',
  };

  return (
    <div
      className={`time-block ${hasCollision ? 'collision' : ''} ${isDragging ? 'dragging' : ''}`}
      style={blockStyle}
      onClick={handleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      aria-label={`${timeBlock.activity} from ${formatTimeRange(
        timeBlock.startTime,
        timeBlock.endTime
      )}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      <div className="time-block-header">
        <span className="time-block-icon" role="img" aria-label={timeBlock.activityType}>
          {icon}
        </span>
        <span className="time-block-activity">{timeBlock.activity}</span>
      </div>

      <div className="time-block-time">
        {formatTimeRange(timeBlock.startTime, timeBlock.endTime)}
        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>({formatDuration(duration)})</span>
      </div>

      {timeBlock.description && (
        <div className="time-block-description">{timeBlock.description}</div>
      )}

      {hasCollision && (
        <div
          className="collision-warning"
          style={{
            fontSize: '0.65rem',
            color: '#ef4444',
            marginTop: '0.25rem',
            fontWeight: 600,
          }}
          role="alert"
        >
          Time conflict detected
        </div>
      )}

      {(onEdit || onDelete) && (
        <div
          className="time-block-actions"
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '0.5rem',
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        >
          {onEdit && (
            <button
              className="btn-icon"
              onClick={handleEdit}
              aria-label="Edit time block"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="btn-icon"
              onClick={handleDelete}
              aria-label="Delete time block"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                color: '#ef4444',
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
