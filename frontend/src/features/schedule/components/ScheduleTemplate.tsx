/**
 * ScheduleTemplate component - Main container for schedule feature
 */

import React, { useState, useEffect } from 'react';
import { WeekView } from './WeekView';
import { ScheduleWizard } from './ScheduleWizard';
import { TimeBlockEditor } from './TimeBlockEditor';
import { ShareModal } from './ShareModal';
import { ScheduleHistory } from './ScheduleHistory';
import type {
  ScheduleData,
  TimeBlock as TimeBlockType,
  DayOfWeek,
  CreateScheduleData,
  Schedule,
} from '../types/schedule.types';
import { useSchedule } from '../hooks/useSchedule';
import { useWeekNavigation } from '../hooks/useWeekNavigation';
import { Plus, ChevronLeft, ChevronRight, Calendar, Share2, Clock, Link2 } from 'lucide-react';
import '../styles/schedule.css';

interface ScheduleTemplateProps {
  spaceId: string;
  userId: string;
  onScheduleCreated?: (scheduleId: string) => void;
  onScheduleUpdated?: (scheduleId: string) => void;
}

/**
 * Main schedule template component
 * Provides week navigation, schedule CRUD, and floating action button
 */
export const ScheduleTemplate: React.FC<ScheduleTemplateProps> = ({
  spaceId,
  userId,
  onScheduleCreated,
  onScheduleUpdated,
}) => {
  const {
    schedules,
    isLoading,
    error,
    getSchedules,
    createSchedule,
    updateSchedule,
  } = useSchedule();

  const {
    currentWeek,
    weekStarting,
    goToNextWeek,
    goToPreviousWeek,
    goToCurrentWeek,
    isCurrentWeek,
  } = useWeekNavigation();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<{
    block: TimeBlockType;
    day: DayOfWeek;
  } | null>(null);
  const [currentScheduleData, setCurrentScheduleData] = useState<ScheduleData>({});
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);

  // Fetch schedules for current week
  useEffect(() => {
    if (spaceId && weekStarting) {
      getSchedules(spaceId, weekStarting);
    }
  }, [spaceId, weekStarting, getSchedules]);

  // Update current schedule data when schedules change
  useEffect(() => {
    const userSchedule = schedules.find((s) => s.userId === userId);
    if (userSchedule) {
      setCurrentScheduleData(userSchedule.scheduleData);
      setCurrentScheduleId(userSchedule.scheduleId);
      setCurrentSchedule(userSchedule);
    } else {
      setCurrentScheduleData({});
      setCurrentScheduleId(null);
      setCurrentSchedule(null);
    }
  }, [schedules, userId]);

  /**
   * Handle wizard completion
   */
  const handleWizardComplete = async (data: CreateScheduleData) => {
    try {
      const newSchedule = await createSchedule(data);
      if (onScheduleCreated) {
        onScheduleCreated(newSchedule.scheduleId);
      }
    } catch (err) {
      console.error('Failed to create schedule:', err);
    }
  };

  /**
   * Handle schedule data change (from drag-and-drop)
   */
  const handleScheduleChange = async (updatedData: ScheduleData) => {
    setCurrentScheduleData(updatedData);

    if (currentScheduleId) {
      try {
        await updateSchedule(currentScheduleId, {
          scheduleData: updatedData,
        });
        if (onScheduleUpdated) {
          onScheduleUpdated(currentScheduleId);
        }
      } catch (err) {
        console.error('Failed to update schedule:', err);
      }
    }
  };

  /**
   * Handle block edit
   */
  const handleBlockEdit = (block: TimeBlockType, day: DayOfWeek) => {
    setEditingBlock({ block, day });
    setIsBlockEditorOpen(true);
  };

  /**
   * Handle block save
   */
  const handleBlockSave = async (updatedBlock: Partial<TimeBlockType>) => {
    if (!editingBlock) return;

    const { day } = editingBlock;
    const dayBlocks = currentScheduleData[day] || [];

    const updatedBlocks = dayBlocks.map((b) =>
      b.id === editingBlock.block.id ? { ...b, ...updatedBlock } : b
    );

    const updatedSchedule = {
      ...currentScheduleData,
      [day]: updatedBlocks,
    };

    await handleScheduleChange(updatedSchedule);
    setIsBlockEditorOpen(false);
    setEditingBlock(null);
  };

  /**
   * Handle block delete
   */
  const handleBlockDelete = async (block: TimeBlockType, day: DayOfWeek) => {
    if (!confirm('Are you sure you want to delete this time block?')) {
      return;
    }

    const dayBlocks = currentScheduleData[day] || [];
    const updatedBlocks = dayBlocks.filter((b) => b.id !== block.id);

    const updatedSchedule = {
      ...currentScheduleData,
      [day]: updatedBlocks,
    };

    await handleScheduleChange(updatedSchedule);
  };

  /**
   * Handle version restore
   */
  const handleVersionRestore = async (versionData: { scheduleData: ScheduleData; notes?: string }) => {
    if (!currentScheduleId) return;

    try {
      await updateSchedule(currentScheduleId, versionData);
      if (onScheduleUpdated) {
        onScheduleUpdated(currentScheduleId);
      }
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  /**
   * Format week range for display
   */
  const formatWeekRange = (): string => {
    const { start, end } = currentWeek;

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    };

    const year = start.getFullYear();
    return `${formatDate(start)} - ${formatDate(end)}, ${year}`;
  };

  return (
    <div className="schedule-template">
      {/* Header */}
      <div className="schedule-header">
        <div>
          <h1 className="schedule-header-title">
            <Calendar size={32} />
            Weekly Schedule
            {currentSchedule?.sharingSettings?.isPublic && (
              <span className="share-indicator" title="Schedule is shared">
                <Link2 size={16} />
              </span>
            )}
          </h1>
          <p className="schedule-header-subtitle">
            Plan and share your weekly activities
          </p>
        </div>

        <div className="header-actions">
          {currentScheduleId && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setIsHistoryModalOpen(true)}
                title="View version history"
              >
                <Clock size={18} />
                History
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsShareModalOpen(true)}
                title={currentSchedule?.sharingSettings?.isPublic ? 'Manage sharing' : 'Share schedule'}
              >
                <Share2 size={18} />
                {currentSchedule?.sharingSettings?.isPublic ? 'Shared' : 'Share'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="week-navigation-bar">
        <div className="week-navigation">
          <button
            className="nav-button"
            onClick={goToPreviousWeek}
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="week-range-display">
            {formatWeekRange()}
          </div>

          <button
            className="nav-button"
            onClick={goToNextWeek}
            aria-label="Next week"
          >
            Next
            <ChevronRight size={20} />
          </button>

          {!isCurrentWeek && (
            <button
              className="nav-button"
              onClick={goToCurrentWeek}
              aria-label="Go to current week"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="schedule-loading">
          <p>Loading schedule...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="schedule-error">
          <p>Error: {error}</p>
          <button
            className="btn btn-primary"
            onClick={() => getSchedules(spaceId, weekStarting)}
            style={{ marginTop: '1rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Week View */}
      {!isLoading && !error && (
        <WeekView
          scheduleData={currentScheduleData}
          weekStart={currentWeek.start}
          onBlockEdit={handleBlockEdit}
          onBlockDelete={handleBlockDelete}
          onScheduleChange={handleScheduleChange}
        />
      )}

      {/* Floating Action Button */}
      <button
        className="fab"
        onClick={() => setIsWizardOpen(true)}
        aria-label="Create new schedule"
        title="Create new schedule"
      >
        <Plus size={28} />
      </button>

      {/* Schedule Wizard */}
      <ScheduleWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
        spaceId={spaceId}
      />

      {/* Time Block Editor */}
      <TimeBlockEditor
        isOpen={isBlockEditorOpen}
        onClose={() => {
          setIsBlockEditorOpen(false);
          setEditingBlock(null);
        }}
        onSave={handleBlockSave}
        initialData={editingBlock?.block}
        mode="edit"
      />

      {/* Share Modal */}
      {currentScheduleId && (
        <ShareModal
          scheduleId={currentScheduleId}
          existingShare={
            currentSchedule?.sharingSettings?.isPublic && currentSchedule?.sharingSettings?.shareToken
              ? {
                  shareToken: currentSchedule.sharingSettings.shareToken,
                  scheduleId: currentScheduleId,
                  shareLink: `${window.location.origin}/shared/${currentSchedule.sharingSettings.shareToken}`,
                  createdAt: currentSchedule.sharingSettings.createdAt || '',
                  expiresAt: currentSchedule.sharingSettings.expiresAt,
                }
              : undefined
          }
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onDisableShare={() => {
            getSchedules(spaceId, weekStarting);
          }}
        />
      )}

      {/* History Modal */}
      {currentScheduleId && currentSchedule && (
        <ScheduleHistory
          scheduleId={currentScheduleId}
          currentVersion={currentSchedule.version || 1}
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          onRestore={handleVersionRestore}
        />
      )}
    </div>
  );
};
