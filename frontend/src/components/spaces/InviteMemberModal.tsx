import React, { useState, useEffect, useRef } from 'react';
import { useSpace } from '../../stores/spaceStore';
import type { Space, SpaceMemberRole, Invitation, InvitationData } from '../../types';
import './spaces.css';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space;
  onInviteSent?: (invitation: Invitation) => void;
  existingMemberEmails?: string[];
  allowMultiple?: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  space,
  onInviteSent,
  existingMemberEmails = [],
  allowMultiple = false,
}) => {
  const { inviteMember, clearError, isLoading, error } = useSpace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SpaceMemberRole>('member');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('member');
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

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const parseEmails = (emailString: string): string[] => {
    if (!allowMultiple) return [emailString.trim()];
    
    return emailString
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else {
      const emails = parseEmails(email);
      const invalidEmails = emails.filter(e => !validateEmail(e));
      
      if (invalidEmails.length > 0) {
        errors.email = 'Please enter a valid email address';
      } else {
        // Check for existing members
        const existingEmails = emails.filter(e => 
          existingMemberEmails.includes(e.toLowerCase())
        );
        
        if (existingEmails.length > 0) {
          errors.email = allowMultiple && existingEmails.length < emails.length
            ? `Some users are already members: ${existingEmails.join(', ')}`
            : 'This user is already a member of this space';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) return;

    try {
      const invitationData: InvitationData = {
        email: email.trim(),
        spaceId: space.spaceId,
        role,
      };

      const invitation = await inviteMember(invitationData);
      onInviteSent?.(invitation);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setLocalError(errorMessage);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getRoleDescription = (selectedRole: SpaceMemberRole): string => {
    switch (selectedRole) {
      case 'admin':
        return 'Admins can manage members and settings in addition to all member permissions.';
      case 'member':
        return 'Members can view and participate in the space content.';
      default:
        return '';
    }
  };

  const getRecipientCount = (): number => {
    if (!allowMultiple) return 1;
    return parseEmails(email).length;
  };

  const getEmailLabel = (): string => {
    return allowMultiple ? 'Email Addresses' : 'Email Address';
  };

  const getEmailPlaceholder = (): string => {
    return allowMultiple 
      ? 'Enter email addresses separated by commas'
      : 'Enter email address';
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
        className="modal modal--invite"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            Invite Member to {space.name}
          </h2>
          <p id="modal-description" className="modal-description">
            Send an invitation to join this space
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {displayError && (
            <div className="error-message" role="alert">
              {displayError}
            </div>
          )}

          {space.isPublic && (
            <div className="info-message">
              <div className="info-message__icon">ℹ️</div>
              <div className="info-message__content">
                This is a public space. Users can join without an invitation, but 
                inviting them will notify them directly and assign their role.
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="invite-email" className="form-label">
              {getEmailLabel()} <span aria-label="required">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="invite-email"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear validation error when user starts typing
                if (validationErrors.email) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              disabled={isLoading}
              aria-required="true"
              aria-invalid={!!validationErrors.email}
              aria-describedby={validationErrors.email ? 'email-error' : 'email-help'}
              className={validationErrors.email ? 'input-error' : ''}
              placeholder={getEmailPlaceholder()}
            />
            <div id="email-help" className="form-help-text">
              {allowMultiple && getRecipientCount() > 1 && (
                <span className="recipient-count">
                  {getRecipientCount()} recipients
                </span>
              )}
            </div>
            {validationErrors.email && (
              <div id="email-error" className="field-error" role="alert">
                {validationErrors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="invite-role" className="form-label">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as SpaceMemberRole)}
              disabled={isLoading}
              className="form-select"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <div className="form-help-text">
              {getRoleDescription(role)}
            </div>
          </div>

          {email && validateEmail(parseEmails(email)[0]) && (
            <div className="invitation-preview">
              <h4 className="invitation-preview__title">Invitation Preview</h4>
              <div className="invitation-preview__content">
                <span className="invitation-preview__email">
                  {allowMultiple && getRecipientCount() > 1 
                    ? `${getRecipientCount()} users` 
                    : parseEmails(email)[0]
                  }
                </span>
                {' '}will be invited to join{' '}
                <span className="invitation-preview__space">
                  {space.name}
                </span>
                {' '}as {role === 'admin' ? 'an' : 'a'}{' '}
                <span className="invitation-preview__role">
                  {role}
                </span>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
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