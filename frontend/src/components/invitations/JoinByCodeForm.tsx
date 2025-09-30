/**
 * JoinByCodeForm - Join space using invitation code
 * Features: Real-time validation, space preview, error handling
 */

import React, { useState, useCallback, useEffect } from 'react';
import { invitationService } from '../../services/invitationService';
import type { ValidateInviteCodeResponse, Invitation } from '../../types/invitation.types';

interface JoinByCodeFormProps {
  onSuccess?: (invitation: Invitation) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormState {
  code: string;
  isValidating: boolean;
  isJoining: boolean;
  validation: ValidateInviteCodeResponse | null;
  error: string | null;
}

export const JoinByCodeForm: React.FC<JoinByCodeFormProps> = ({
  onSuccess,
  onCancel,
  className = ''
}) => {

  const [state, setState] = useState<FormState>({
    code: '',
    isValidating: false,
    isJoining: false,
    validation: null,
    error: null
  });

  // Validate code with debouncing
  const validateCode = useCallback(async (code: string) => {
    if (!code || code.length < 6) {
      setState(prev => ({ ...prev, validation: null, error: null }));
      return;
    }

    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const validation = await invitationService.validateCode(code);
      setState(prev => ({ ...prev, validation, isValidating: false }));
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        validation: null,
        isValidating: false,
        error: (error instanceof Error ? error.message : 'Failed to validate code')
      }));
    }
  }, []);

  // Debounced validation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.code && state.code.length >= 6) {
        validateCode(state.code);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state.code, validateCode]);

  const handleCodeChange = useCallback((value: string) => {
    // Format code as user types (uppercase, alphanumeric only)
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setState(prev => ({
      ...prev,
      code: formatted,
      validation: null,
      error: null
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.validation?.valid || state.isJoining) {
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      const invitation = await invitationService.joinByCode({ code: state.code });
      onSuccess?.(invitation);

      // Reset form
      setState({
        code: '',
        isValidating: false,
        isJoining: false,
        validation: null,
        error: null
      });
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: (error instanceof Error ? error.message : 'Failed to join space')
      }));
    }
  }, [state.validation, state.isJoining, state.code, onSuccess]);

  const canSubmit = state.validation?.valid && !state.isJoining && !state.isValidating;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Join with Invitation Code</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enter the invitation code you received to join a space.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code Input */}
          <div>
            <label htmlFor="invitation-code" className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Code
            </label>
            <div className="relative">
              <input
                id="invitation-code"
                type="text"
                value={state.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Enter 8-character code"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm text-center text-lg font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  state.error
                    ? 'border-red-300 bg-red-50'
                    : state.validation?.valid
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }`}
                maxLength={8}
                aria-describedby={state.error ? 'code-error' : state.validation?.valid ? 'code-success' : undefined}
                aria-invalid={!!state.error}
              />

              {/* Validation indicator */}
              {state.isValidating && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}

              {state.validation?.valid && !state.isValidating && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {state.validation && !state.validation.valid && !state.isValidating && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Validation messages */}
            {state.validation?.valid && (
              <div id="code-success" className="mt-2 text-sm text-green-600">
                ✓ Valid invitation code
              </div>
            )}

            {state.validation && !state.validation.valid && (
              <div id="code-error" className="mt-2 text-sm text-red-600">
                {state.validation.error || 'Invalid invitation code'}
              </div>
            )}

            {state.error && (
              <div id="code-error" className="mt-2 text-sm text-red-600" role="alert">
                {state.error}
              </div>
            )}
          </div>

          {/* Space Preview */}
          {state.validation?.valid && state.validation.spaceName && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    You're about to join:
                  </h3>
                  <div className="mt-1">
                    <p className="text-sm text-blue-700 font-semibold">
                      {state.validation.spaceName}
                    </p>
                  </div>
                  {state.validation.expiresAt && (
                    <p className="mt-1 text-xs text-blue-600">
                      Code expires: {new Date(state.validation.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isJoining ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </>
              ) : (
                'Join Space'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};