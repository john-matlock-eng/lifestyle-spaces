/**
 * ScheduleWizard component - Multi-step wizard for schedule creation
 */

import React, { useState, useEffect } from 'react';
import { TimeBlockEditor } from './TimeBlockEditor';
import type {
  CreateScheduleData,
  ScheduleData,
  TimeBlock as TimeBlockType,
  DayOfWeek,
} from '../types/schedule.types';
import { getWeekStart } from '../utils/scheduleValidation';
import '../styles/schedule.css';

interface ScheduleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (scheduleData: CreateScheduleData) => void;
  spaceId: string;
  templates?: Array<{
    id: string;
    name: string;
    description: string;
    scheduleData: ScheduleData;
  }>;
}

type WizardStep = 1 | 2 | 3;

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
 * Multi-step wizard for creating new schedules
 */
export const ScheduleWizard: React.FC<ScheduleWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  spaceId,
  templates = [],
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [weekStarting, setWeekStarting] = useState<string>(getWeekStart());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const [notes, setNotes] = useState<string>('');
  const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setWeekStarting(getWeekStart());
      setSelectedTemplate(null);
      setScheduleData({});
      setNotes('');
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleFinish = () => {
    const createData: CreateScheduleData = {
      spaceId,
      weekStarting,
      scheduleData,
      notes: notes || undefined,
      isTemplate: false,
    };

    onComplete(createData);
    onClose();
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setScheduleData(template.scheduleData);
    }
  };

  const handleAddBlock = (day: DayOfWeek) => {
    setEditingDay(day);
    setIsBlockEditorOpen(true);
  };

  const handleSaveBlock = (block: Partial<TimeBlockType>) => {
    if (!editingDay) return;

    const newBlock: TimeBlockType = {
      id: `block-${Date.now()}`,
      startTime: block.startTime || '09:00',
      endTime: block.endTime || '10:00',
      activity: block.activity || '',
      activityType: block.activityType || 'other',
      description: block.description,
      color: block.color,
    };

    setScheduleData((prev) => ({
      ...prev,
      [editingDay]: [...(prev[editingDay] || []), newBlock],
    }));

    setIsBlockEditorOpen(false);
    setEditingDay(null);
  };

  const handleWeekChange = (offset: number) => {
    const currentDate = new Date(weekStarting);
    currentDate.setDate(currentDate.getDate() + offset * 7);
    setWeekStarting(getWeekStart(currentDate));
  };

  const formatWeekRange = (mondayStr: string): string => {
    const monday = new Date(mondayStr);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  };

  if (!isOpen) return null;

  const canGoNext = currentStep === 1 || currentStep === 2;
  const canFinish = currentStep === 3;

  return (
    <div
      className="time-block-editor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div className="schedule-wizard">
        <div className="wizard-progress">
          <div className={`wizard-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="wizard-step-number">1</div>
            <div className="wizard-step-label">Select Week</div>
          </div>
          <div className={`wizard-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="wizard-step-number">2</div>
            <div className="wizard-step-label">Choose Template</div>
          </div>
          <div className={`wizard-step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="wizard-step-number">3</div>
            <div className="wizard-step-label">Add Activities</div>
          </div>
        </div>

        <div className="wizard-content">
          {/* Step 1: Select Week */}
          {currentStep === 1 && (
            <div>
              <h2 id="wizard-title" style={{ marginBottom: '1rem' }}>
                Select Week
              </h2>
              <p style={{ color: 'var(--theme-text-secondary)', marginBottom: '2rem' }}>
                Choose the week you want to create a schedule for. Weeks must start on Monday.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="nav-button"
                  onClick={() => handleWeekChange(-1)}
                  aria-label="Previous week"
                >
                  Previous Week
                </button>

                <div
                  style={{
                    padding: '1rem 2rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    minWidth: '300px',
                  }}
                >
                  {formatWeekRange(weekStarting)}
                </div>

                <button
                  className="nav-button"
                  onClick={() => handleWeekChange(1)}
                  aria-label="Next week"
                >
                  Next Week
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Template */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>Choose Template</h2>
              <p style={{ color: 'var(--theme-text-secondary)', marginBottom: '2rem' }}>
                Start with a template or create a schedule from scratch.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <button
                  className={`activity-type-option ${selectedTemplate === null ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedTemplate(null);
                    setScheduleData({});
                  }}
                  style={{ padding: '1.5rem', height: 'auto' }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Blank Schedule</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Start from scratch</div>
                </button>

                {templates.map((template) => (
                  <button
                    key={template.id}
                    className={`activity-type-option ${
                      selectedTemplate === template.id ? 'selected' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                    style={{ padding: '1.5rem', height: 'auto' }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{template.name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Add Activities */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>Add Activities</h2>
              <p style={{ color: 'var(--theme-text-secondary)', marginBottom: '2rem' }}>
                Add time blocks to your schedule. You can always edit them later.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {DAYS.map((day) => {
                  const blocks = scheduleData[day] || [];
                  return (
                    <div
                      key={day}
                      style={{
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: blocks.length > 0 ? '0.5rem' : 0,
                        }}
                      >
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{day}</div>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleAddBlock(day)}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          Add Activity
                        </button>
                      </div>
                      {blocks.length > 0 && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--theme-text-secondary)' }}>
                          {blocks.length} {blocks.length === 1 ? 'activity' : 'activities'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label htmlFor="notes" className="form-label">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  className="form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this schedule"
                  maxLength={1000}
                />
              </div>
            </div>
          )}

          <div className="wizard-actions">
            <div>
              {currentStep > 1 && (
                <button className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              {canGoNext && (
                <button className="btn btn-primary" onClick={handleNext}>
                  Next
                </button>
              )}
              {canFinish && (
                <button className="btn btn-primary" onClick={handleFinish}>
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Block Editor */}
      <TimeBlockEditor
        isOpen={isBlockEditorOpen}
        onClose={() => {
          setIsBlockEditorOpen(false);
          setEditingDay(null);
        }}
        onSave={handleSaveBlock}
        mode="create"
      />
    </div>
  );
};
