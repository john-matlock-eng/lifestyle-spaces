/**
 * InvitationCard - Display invitation with actions
 * Features: Status indicators, action buttons, accessibility, loading states
 */

import React, { useState } from 'react';
import { useInvitations } from '../../hooks/useInvitations';
import { InvitationStatus, SpaceMemberRole } from '../../types/invitation.types';
import type { Invitation } from '../../types/invitation.types';

interface InvitationCardProps {
  invitation: Invitation;
  variant?: 'pending' | 'admin';
  showActions?: boolean;
  className?: string;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  variant = 'pending',
  showActions = true,
  className = ''
}) => {
  const {
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    resendInvitation
  } = useInvitations();

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAction = async (action: string, actionFn: () => Promise<void>) => {
    setActionInProgress(action);
    try {
      await actionFn();
    } catch (error) {
      console.error(`Failed to ${action} invitation:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case InvitationStatus.ACCEPTED:
        return 'bg-green-100 text-green-800 border-green-200';
      case InvitationStatus.DECLINED:
        return 'bg-red-100 text-red-800 border-red-200';
      case InvitationStatus.EXPIRED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: SpaceMemberRole) => {
    switch (role) {
      case SpaceMemberRole.OWNER:
        return 'bg-purple-100 text-purple-800';
      case SpaceMemberRole.ADMIN:
        return 'bg-blue-100 text-blue-800';
      case SpaceMemberRole.MEMBER:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const canAccept = invitation.status === InvitationStatus.PENDING && !isExpired;
  const canDecline = invitation.status === InvitationStatus.PENDING;
  const canRevoke = invitation.status === InvitationStatus.PENDING && variant === 'admin';
  const canResend = (invitation.status === InvitationStatus.EXPIRED || invitation.status === InvitationStatus.DECLINED) && variant === 'admin';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {variant === 'pending' ? invitation.spaceName : invitation.inviteeEmail}
            </h3>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invitation.status)}`}>
                {invitation.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                {invitation.role}
              </span>
            </div>
          </div>

          {/* Status icon */}
          <div className="ml-3 flex-shrink-0">
            {invitation.status === InvitationStatus.PENDING && (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            )}
            {invitation.status === InvitationStatus.ACCEPTED && (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {invitation.status === InvitationStatus.DECLINED && (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-600">
          {variant === 'pending' ? (
            <div>
              <div>
                <span className="font-medium">From:</span> {invitation.inviterDisplayName} ({invitation.inviterEmail})
              </div>
            </div>
          ) : (
            <div>
              <span className="font-medium">Space:</span> {invitation.spaceName}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div>
              <span className="font-medium">Invited:</span> {formatDate(invitation.createdAt)}
            </div>
            {!isExpired && (
              <div>
                <span className="font-medium">Expires:</span> {formatDate(invitation.expiresAt)}
              </div>
            )}
            {isExpired && (
              <div className="text-red-600">
                <span className="font-medium">Expired:</span> {formatDate(invitation.expiresAt)}
              </div>
            )}
          </div>

          {invitation.acceptedAt && (
            <div>
              <span className="font-medium">Accepted:</span> {formatDate(invitation.acceptedAt)}
            </div>
          )}

          {invitation.declinedAt && (
            <div>
              <span className="font-medium">Declined:</span> {formatDate(invitation.declinedAt)}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
            {variant === 'pending' && (
              <>
                {canAccept && (
                  <button
                    onClick={() => handleAction('accept', () => acceptInvitation(invitation.invitationId))}
                    disabled={actionInProgress !== null}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'accept' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Accepting...
                      </>
                    ) : (
                      'Accept'
                    )}
                  </button>
                )}

                {canDecline && (
                  <button
                    onClick={() => handleAction('decline', () => declineInvitation(invitation.invitationId))}
                    disabled={actionInProgress !== null}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'decline' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Declining...
                      </>
                    ) : (
                      'Decline'
                    )}
                  </button>
                )}
              </>
            )}

            {variant === 'admin' && (
              <>
                {canRevoke && (
                  <button
                    onClick={() => handleAction('revoke', () => revokeInvitation(invitation.invitationId))}
                    disabled={actionInProgress !== null}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'revoke' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Revoking...
                      </>
                    ) : (
                      'Revoke'
                    )}
                  </button>
                )}

                {canResend && (
                  <button
                    onClick={() => handleAction('resend', () => resendInvitation(invitation.invitationId))}
                    disabled={actionInProgress !== null}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'resend' ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resending...
                      </>
                    ) : (
                      'Resend'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};