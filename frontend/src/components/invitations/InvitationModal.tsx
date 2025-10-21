/**
 * InvitationModal - Create single or multiple invitations
 * Features: Form validation, email parsing, role selection, bulk upload
 */

import React, { useState, useCallback, useRef } from 'react';
import { useInvitations } from '../../hooks/useInvitations';
import { emailUtils } from '../../services/invitationService';
import { SpaceMemberRole } from '../../types/invitation.types';
import type { ModalProps } from '../../types';

interface InvitationModalProps extends ModalProps {
  spaceId: string;
  spaceName: string;
  mode?: 'single' | 'bulk';
}

interface FormData {
  emails: string;
  role: SpaceMemberRole;
  customMessage: string;
  mode: 'manual' | 'upload';
}

interface ValidationState {
  emails: {
    valid: string[];
    invalid: Array<{ email: string; error: string }>;
  };
  hasErrors: boolean;
  submitted: boolean;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  spaceName,
  mode = 'single'
}) => {
  const { createInvitation, createBulkInvitations, isCreating, error, clearError } = useInvitations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    emails: '',
    role: SpaceMemberRole.MEMBER,
    customMessage: '',
    mode: 'manual'
  });

  // Validation state
  const [validation, setValidation] = useState<ValidationState>({
    emails: { valid: [], invalid: [] },
    hasErrors: false,
    submitted: false
  });

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Validate emails in real-time
  const validateEmails = useCallback((emailText: string) => {
    if (!emailText.trim()) {
      return { valid: [], invalid: [], hasErrors: false };
    }

    const emailList = emailUtils.parseEmailList(emailText);
    const result = emailUtils.validateEmails(emailList);

    return result;
  }, []);

  // Handle email input change
  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, emails: value }));

    if (validation.submitted) {
      const emailValidation = validateEmails(value);
      setValidation(prev => ({
        ...prev,
        emails: emailValidation,
        hasErrors: emailValidation.invalid.length > 0
      }));
    }
  }, [validateEmails, validation.submitted]);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    setUploadFile(file);
    setFormData(prev => ({ ...prev, mode: 'upload' }));
  }, []);

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreating) return;

    setValidation(prev => ({ ...prev, submitted: true }));
    clearError();

    try {
      if (formData.mode === 'upload' && uploadFile) {
        // Handle CSV upload
        const formDataObj = new FormData();
        formDataObj.append('file', uploadFile);
        formDataObj.append('spaceId', spaceId);
        formDataObj.append('defaultRole', formData.role);

        // This would need to be implemented in the service
        // await invitationService.uploadBulkInvitations(spaceId, uploadFile, formData.role);

      } else {
        // Handle manual email entry
        const emailValidation = validateEmails(formData.emails);

        if (emailValidation.invalid.length > 0 || emailValidation.valid.length === 0) {
          setValidation(prev => ({
            ...prev,
            emails: emailValidation,
            hasErrors: emailValidation.invalid.length > 0 || emailValidation.valid.length === 0
          }));
          return;
        }

        if (emailValidation.valid.length === 1) {
          // Single invitation
          await createInvitation({
            email: emailValidation.valid[0],
            spaceId,
            role: formData.role,
            customMessage: formData.customMessage || undefined
          });
        } else {
          // Bulk invitations
          await createBulkInvitations({
            spaceId,
            invitations: emailValidation.valid.map(email => ({
              email,
              role: formData.role,
              customMessage: formData.customMessage || undefined
            }))
          });
        }
      }

      // Success - close modal
      onClose();

      // Reset form
      setFormData({
        emails: '',
        role: SpaceMemberRole.MEMBER,
        customMessage: '',
        mode: 'manual'
      });
      setValidation({
        emails: { valid: [], invalid: [] },
        hasErrors: false,
        submitted: false
      });
      setUploadFile(null);

    } catch (err) {
      console.error('Failed to send invitations:', err);
    }
  }, [
    formData,
    uploadFile,
    spaceId,
    isCreating,
    validateEmails,
    createInvitation,
    createBulkInvitations,
    clearError,
    onClose
  ]);

  if (!isOpen) return null;

  const emailValidation = validation.submitted ? validation.emails : validateEmails(formData.emails);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-labelledby="invite-modal-title" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="invite-modal-title" className="text-lg font-semibold text-gray-900">
            Invite to {spaceName}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close invite modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Mode selector for bulk mode */}
          {mode === 'bulk' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Invitation Method
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="manual"
                    checked={formData.mode === 'manual'}
                    onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as 'manual' | 'upload' }))}
                    className="mr-2"
                  />
                  Manual Entry
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="upload"
                    checked={formData.mode === 'upload'}
                    onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as 'manual' | 'upload' }))}
                    className="mr-2"
                  />
                  CSV Upload
                </label>
              </div>
            </div>
          )}

          {/* Email input or file upload */}
          {formData.mode === 'manual' ? (
            <div className="space-y-2">
              <label htmlFor="emails" className="block text-sm font-medium text-gray-700">
                Email Addresses
              </label>
              <textarea
                id="emails"
                value={formData.emails}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="Enter email addresses (one per line or comma-separated)"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validation.submitted && emailValidation.invalid.length > 0
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                rows={mode === 'single' ? 1 : 4}
                aria-describedby={validation.submitted && emailValidation.invalid.length > 0 ? 'email-error' : undefined}
              />

              {/* Email validation feedback */}
              {validation.submitted && (
                <div className="space-y-1">
                  {emailValidation.valid.length > 0 && (
                    <div className="text-sm text-green-600">
                      {emailValidation.valid.length} valid email{emailValidation.valid.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {emailValidation.invalid.length > 0 && (
                    <div id="email-error" className="text-sm text-red-600">
                      Invalid emails: {emailValidation.invalid.map(e => e.email).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                CSV File Upload
              </label>
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {uploadFile && (
                <div className="text-sm text-green-600">
                  Selected: {uploadFile.name}
                </div>
              )}
              <div className="text-xs text-gray-500">
                CSV should have columns: email, role (optional)
              </div>
            </div>
          )}

          {/* Role selection */}
          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as SpaceMemberRole }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={SpaceMemberRole.MEMBER}>Member</option>
              <option value={SpaceMemberRole.ADMIN}>Admin</option>
            </select>
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              value={formData.customMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
              placeholder="Add a personal note to the invitation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || (validation.submitted && (emailValidation.invalid.length > 0 || emailValidation.valid.length === 0))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};