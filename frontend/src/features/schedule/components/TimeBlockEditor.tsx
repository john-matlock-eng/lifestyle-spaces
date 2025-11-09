/**
 * TimeBlockEditor component - Modal for creating/editing time blocks
 */

import React, { useState, useEffect, useRef } from 'react';
import type { TimeBlock, ActivityType, TimeBlockFormData } from '../types/schedule.types';
import { validateTimeBlock } from '../utils/scheduleValidation';
import { getCurrentTime, roundTimeToInterval, addMinutes } from '../utils/timeUtils';
import { getAllActivityTypes, getDefaultColor } from '../utils/activityTypes';
import '../styles/schedule.css';

interface TimeBlockEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timeBlock: Partial<TimeBlock>) => void;
  initialData?: Partial<TimeBlock>;
  mode?: 'create' | 'edit';
}

/**
 * Time block editor modal
 * Form for creating or editing time blocks with validation
 */
export const TimeBlockEditor: React.FC<TimeBlockEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
}) => {
  const activityTypes = getAllActivityTypes();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TimeBlockFormData>({
    startTime: initialData?.startTime || roundTimeToInterval(getCurrentTime()),
    endTime:
      initialData?.endTime ||
      roundTimeToInterval(addMinutes(getCurrentTime(), 60)),
    activity: initialData?.activity || '',
    activityType: initialData?.activityType || 'other',
    description: initialData?.description || '',
    color: initialData?.color || getDefaultColor('other'),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          startTime: initialData.startTime || roundTimeToInterval(getCurrentTime()),
          endTime: initialData.endTime || roundTimeToInterval(addMinutes(getCurrentTime(), 60)),
          activity: initialData.activity || '',
          activityType: initialData.activityType || 'other',
          description: initialData.description || '',
          color: initialData.color || getDefaultColor(initialData.activityType || 'other'),
        });
      } else {
        const now = roundTimeToInterval(getCurrentTime());
        const later = roundTimeToInterval(addMinutes(getCurrentTime(), 60));
        setFormData({
          startTime: now,
          endTime: later,
          activity: '',
          activityType: 'other',
          description: '',
          color: getDefaultColor('other'),
        });
      }
      setErrors({});
      setIsSubmitting(false);

      // Focus first input
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, initialData]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const handleInputChange = (
    field: keyof TimeBlockFormData,
    value: string | ActivityType
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Update color when activity type changes
      if (field === 'activityType' && typeof value === 'string') {
        updated.color = getDefaultColor(value as ActivityType);
      }

      return updated;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const timeBlock: Partial<TimeBlock> = {
      ...formData,
      id: initialData?.id,
    };

    const validationErrors = validateTimeBlock(timeBlock);

    const errorMap: Record<string, string> = {};
    validationErrors.forEach((error) => {
      errorMap[error.field] = error.message;
    });

    setErrors(errorMap);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const timeBlock: Partial<TimeBlock> = {
        ...formData,
        id: initialData?.id,
      };

      onSave(timeBlock);
      onClose();
    } catch (err) {
      console.error('Failed to save time block:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="time-block-editor-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
    >
      <div ref={modalRef} className="time-block-editor">
        <div className="time-block-editor-header">
          <h2 id="editor-title" className="time-block-editor-title">
            {mode === 'create' ? 'Create Time Block' : 'Edit Time Block'}
          </h2>
          <p className="time-block-editor-subtitle">
            {mode === 'create'
              ? 'Add a new activity to your schedule'
              : 'Update activity details'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="time-block-editor-form">
          {/* Activity Name */}
          <div className="form-group">
            <label htmlFor="activity" className="form-label">
              Activity Name <span aria-label="required">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="activity"
              type="text"
              className="form-input"
              value={formData.activity}
              onChange={(e) => handleInputChange('activity', e.target.value)}
              placeholder="e.g., Morning Workout"
              maxLength={100}
              aria-invalid={!!errors.activity}
              aria-describedby={errors.activity ? 'activity-error' : undefined}
            />
            {errors.activity && (
              <div id="activity-error" className="form-error" role="alert">
                {errors.activity}
              </div>
            )}
          </div>

          {/* Time Range */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime" className="form-label">
                Start Time <span aria-label="required">*</span>
              </label>
              <input
                id="startTime"
                type="time"
                className="form-input"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                aria-invalid={!!errors.startTime}
                aria-describedby={errors.startTime ? 'startTime-error' : undefined}
              />
              {errors.startTime && (
                <div id="startTime-error" className="form-error" role="alert">
                  {errors.startTime}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="endTime" className="form-label">
                End Time <span aria-label="required">*</span>
              </label>
              <input
                id="endTime"
                type="time"
                className="form-input"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                aria-invalid={!!errors.endTime}
                aria-describedby={errors.endTime ? 'endTime-error' : undefined}
              />
              {errors.endTime && (
                <div id="endTime-error" className="form-error" role="alert">
                  {errors.endTime}
                </div>
              )}
            </div>
          </div>

          {/* Activity Type */}
          <div className="form-group">
            <label className="form-label">
              Activity Type <span aria-label="required">*</span>
            </label>
            <div className="activity-type-selector" role="radiogroup" aria-label="Activity type">
              {activityTypes.map((type) => (
                <div
                  key={type.type}
                  className={`activity-type-option ${
                    formData.activityType === type.type ? 'selected' : ''
                  }`}
                  onClick={() => handleInputChange('activityType', type.type)}
                  role="radio"
                  aria-checked={formData.activityType === type.type}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleInputChange('activityType', type.type);
                    }
                  }}
                >
                  <span className="activity-type-icon" role="img" aria-label={type.label}>
                    {type.icon}
                  </span>
                  <div className="activity-type-label">{type.label}</div>
                </div>
              ))}
            </div>
            {errors.activityType && (
              <div className="form-error" role="alert">
                {errors.activityType}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add notes or details about this activity"
              maxLength={500}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <div id="description-error" className="form-error" role="alert">
                {errors.description}
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="form-group">
            <label htmlFor="color" className="form-label">
              Color
            </label>
            <div className="color-picker-wrapper">
              <input
                id="color"
                type="color"
                className="color-input"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                aria-label="Block color"
              />
              <div
                className="color-preview"
                style={{ backgroundColor: formData.color }}
                aria-hidden="true"
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--theme-text-secondary)' }}>
                {formData.color}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="editor-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
