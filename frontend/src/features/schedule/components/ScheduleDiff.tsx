/**
 * ScheduleDiff component - Side-by-side schedule comparison
 */

import React, { useMemo } from 'react';
import type {
  Schedule,
  DayOfWeek,
  ScheduleDiffItem,
} from '../types/schedule.types';
import { formatTimeRange } from '../utils/timeUtils';
import { getActivityIcon } from '../utils/activityTypes';
import '../styles/schedule.css';

interface ScheduleDiffProps {
  schedule1: Schedule;
  schedule2: Schedule;
  title1?: string;
  title2?: string;
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
 * Compare two schedules and show differences
 */
export const ScheduleDiff: React.FC<ScheduleDiffProps> = ({
  schedule1,
  schedule2,
  title1 = 'Schedule 1',
  title2 = 'Schedule 2',
}) => {
  /**
   * Calculate differences between two schedules
   */
  const differences = useMemo(() => {
    const diffs: ScheduleDiffItem[] = [];

    DAYS.forEach((day) => {
      const blocks1 = schedule1.scheduleData[day] || [];
      const blocks2 = schedule2.scheduleData[day] || [];

      // Find blocks only in schedule1 (removed)
      blocks1.forEach((block) => {
        const existsIn2 = blocks2.some(
          (b) =>
            b.startTime === block.startTime &&
            b.endTime === block.endTime &&
            b.activity === block.activity
        );

        if (!existsIn2) {
          diffs.push({
            type: 'removed',
            day,
            timeBlock: block,
          });
        }
      });

      // Find blocks only in schedule2 (added)
      blocks2.forEach((block) => {
        const existsIn1 = blocks1.some(
          (b) =>
            b.startTime === block.startTime &&
            b.endTime === block.endTime &&
            b.activity === block.activity
        );

        if (!existsIn1) {
          // Check if it's a modification
          const modified = blocks1.find(
            (b) =>
              (b.startTime === block.startTime && b.activity !== block.activity) ||
              (b.activity === block.activity && b.startTime !== block.startTime)
          );

          if (modified) {
            diffs.push({
              type: 'modified',
              day,
              timeBlock: block,
              originalBlock: modified,
            });
          } else {
            diffs.push({
              type: 'added',
              day,
              timeBlock: block,
            });
          }
        }
      });
    });

    return diffs;
  }, [schedule1, schedule2]);

  /**
   * Get differences for a specific day
   */
  const getDifferencesForDay = (day: DayOfWeek) => {
    return differences.filter((diff) => diff.day === day);
  };

  /**
   * Render a time block diff item
   */
  const renderDiffItem = (diff: ScheduleDiffItem) => {
    const { type, timeBlock, originalBlock } = diff;
    const icon = getActivityIcon(timeBlock.activityType);

    return (
      <div key={`${diff.day}-${timeBlock.id || timeBlock.startTime}`} className={`diff-item ${type}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span role="img" aria-label={timeBlock.activityType}>
            {icon}
          </span>
          <span style={{ fontWeight: 600 }}>{timeBlock.activity}</span>
          {type === 'added' && (
            <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>(Added)</span>
          )}
          {type === 'removed' && (
            <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>(Removed)</span>
          )}
          {type === 'modified' && (
            <span style={{ fontSize: '0.75rem', color: '#eab308' }}>(Modified)</span>
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--theme-text-secondary)' }}>
          {formatTimeRange(timeBlock.startTime, timeBlock.endTime)}
        </div>

        {type === 'modified' && originalBlock && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--theme-text-secondary)',
              marginTop: '0.25rem',
            }}
          >
            Was: {originalBlock.activity} ({formatTimeRange(originalBlock.startTime, originalBlock.endTime)})
          </div>
        )}

        {timeBlock.description && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--theme-text-secondary)',
              marginTop: '0.25rem',
            }}
          >
            {timeBlock.description}
          </div>
        )}
      </div>
    );
  };

  const hasDifferences = differences.length > 0;

  return (
    <div className="schedule-diff">
      <div className="schedule-diff-column">
        <div className="schedule-diff-header">{title1}</div>

        {DAYS.map((day) => {
          const dayDiffs = getDifferencesForDay(day);
          const blocks1 = schedule1.scheduleData[day] || [];

          if (blocks1.length === 0 && dayDiffs.length === 0) return null;

          return (
            <div key={day} style={{ marginBottom: '1.5rem' }}>
              <h4
                style={{
                  textTransform: 'capitalize',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: 'var(--theme-text-secondary)',
                }}
              >
                {day}
              </h4>

              {blocks1.map((block, index) => {
                const icon = getActivityIcon(block.activityType);
                return (
                  <div
                    key={block.id || `${day}-${index}`}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span role="img" aria-label={block.activityType}>
                        {icon}
                      </span>
                      <span style={{ fontWeight: 600 }}>{block.activity}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--theme-text-secondary)', marginTop: '0.25rem' }}>
                      {formatTimeRange(block.startTime, block.endTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="schedule-diff-column">
        <div className="schedule-diff-header">{title2}</div>

        {DAYS.map((day) => {
          const dayDiffs = getDifferencesForDay(day);
          const blocks2 = schedule2.scheduleData[day] || [];

          if (blocks2.length === 0 && dayDiffs.length === 0) return null;

          return (
            <div key={day} style={{ marginBottom: '1.5rem' }}>
              <h4
                style={{
                  textTransform: 'capitalize',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: 'var(--theme-text-secondary)',
                }}
              >
                {day}
              </h4>

              {blocks2.map((block, index) => {
                const icon = getActivityIcon(block.activityType);
                return (
                  <div
                    key={block.id || `${day}-${index}`}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span role="img" aria-label={block.activityType}>
                        {icon}
                      </span>
                      <span style={{ fontWeight: 600 }}>{block.activity}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--theme-text-secondary)', marginTop: '0.25rem' }}>
                      {formatTimeRange(block.startTime, block.endTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Differences Summary */}
      {hasDifferences && (
        <div
          style={{
            gridColumn: '1 / -1',
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
            marginTop: '1rem',
          }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
            Changes Summary ({differences.length})
          </h3>

          {DAYS.map((day) => {
            const dayDiffs = getDifferencesForDay(day);
            if (dayDiffs.length === 0) return null;

            return (
              <div key={day} style={{ marginBottom: '1rem' }}>
                <h4
                  style={{
                    textTransform: 'capitalize',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  {day}
                </h4>
                {dayDiffs.map(renderDiffItem)}
              </div>
            );
          })}
        </div>
      )}

      {!hasDifferences && (
        <div
          style={{
            gridColumn: '1 / -1',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--theme-text-secondary)',
          }}
        >
          No differences found between schedules
        </div>
      )}
    </div>
  );
};
