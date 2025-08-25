import React, { useState, useEffect, useRef } from 'react';
import { useSpace } from '../../stores/spaceStore';
import { CreateSpaceData, Space } from '../../types';
import './spaces.css';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated?: (space: Space) => void;
}

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({
  isOpen,
  onClose,
  onSpaceCreated,
}) => {
  const { createSpace, clearError, isLoading, error } = useSpace();
  const [formData, setFormData] = useState<CreateSpaceData>({
    name: '',
    description: '',
    isPublic: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        isPublic: false,
      });
      setValidationErrors({});
      setLocalError(null);
      clearError();
      
      // Focus first input when modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, clearError]);

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

  const handleInputChange = (field: keyof CreateSpaceData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Space name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Space name must be 100 characters or less';
    }

    if (formData.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) return;

    try {
      const space = await createSpace(formData);
      onSpaceCreated?.(space);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create space';
      setLocalError(errorMessage);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div 
      className="modal-overlay" 
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            Create New Space
          </h2>
          <p id="modal-description" className="modal-description">
            Create a space to organize and share content with others
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {displayError && (
            <div className="error-message" role="alert">
              {displayError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="space-name" className="form-label">
              Space Name <span aria-label="required">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="space-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              aria-required="true"
              aria-invalid={!!validationErrors.name}
              aria-describedby={validationErrors.name ? 'name-error' : undefined}
              className={validationErrors.name ? 'input-error' : ''}
              maxLength={100}
              placeholder="Enter space name"
            />
            {validationErrors.name && (
              <div id="name-error" className="field-error" role="alert">
                {validationErrors.name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="space-description" className="form-label">
              Description
            </label>
            <textarea
              id="space-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isLoading}
              aria-invalid={!!validationErrors.description}
              aria-describedby={validationErrors.description ? 'description-error' : undefined}
              className={validationErrors.description ? 'input-error' : ''}
              maxLength={500}
              rows={3}
              placeholder="Optional description for your space"
            />
            {validationErrors.description && (
              <div id="description-error" className="field-error" role="alert">
                {validationErrors.description}
              </div>
            )}
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                id="space-public"
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                disabled={isLoading}
              />
              <label htmlFor="space-public" className="checkbox-label">
                Public Space
              </label>
            </div>
            <div className="form-help-text">
              Public spaces can be discovered and joined by anyone
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Space'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};