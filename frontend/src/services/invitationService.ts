/**
 * Invitation Service
 * Complete API integration for invitation management
 */

import { apiService } from './api';
import type {
  Invitation,
  CreateInvitationRequest,
  BulkCreateInvitationRequest,
  BulkInvitationResponse,
  JoinByCodeRequest,
  ValidateInviteCodeResponse,
  InvitationStatsResponse
} from '../types/invitation.types';

export class InvitationServiceError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'InvitationServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class InvitationService {
  private readonly baseEndpoint = '/api/invitations';

  /**
   * Create a single invitation
   */
  async createInvitation(request: CreateInvitationRequest): Promise<Invitation> {
    try {
      return await apiService.post<Invitation>(this.baseEndpoint, request);
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to create invitation');
    }
  }

  /**
   * Create multiple invitations at once
   */
  async createBulkInvitations(
    request: BulkCreateInvitationRequest
  ): Promise<BulkInvitationResponse> {
    try {
      return await apiService.post<BulkInvitationResponse>(
        `${this.baseEndpoint}/bulk`,
        request
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to create bulk invitations');
    }
  }

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<{ invitations: Invitation[] }> {
    try {
      return await apiService.get<{ invitations: Invitation[] }>(
        `${this.baseEndpoint}/pending`
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to fetch pending invitations');
    }
  }

  /**
   * Get invitations for a specific space (admin only)
   */
  async getSpaceInvitations(spaceId: string): Promise<{ invitations: Invitation[] }> {
    try {
      return await apiService.get<{ invitations: Invitation[] }>(
        `/api/spaces/${spaceId}/invitations`
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to fetch space invitations');
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: string): Promise<Invitation> {
    try {
      return await apiService.post<Invitation>(
        `${this.baseEndpoint}/${invitationId}/accept`,
        {}
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to accept invitation');
    }
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string): Promise<Invitation> {
    try {
      return await apiService.post<Invitation>(
        `${this.baseEndpoint}/${invitationId}/decline`,
        {}
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to decline invitation');
    }
  }

  /**
   * Revoke/cancel an invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    try {
      await apiService.delete(`${this.baseEndpoint}/${invitationId}`);
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to revoke invitation');
    }
  }

  /**
   * Join space by invitation code
   */
  async joinByCode(request: JoinByCodeRequest): Promise<Invitation> {
    try {
      return await apiService.post<Invitation>(
        `${this.baseEndpoint}/join`,
        request
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to join by code');
    }
  }

  /**
   * Validate invitation code
   */
  async validateCode(code: string): Promise<ValidateInviteCodeResponse> {
    try {
      return await apiService.get<ValidateInviteCodeResponse>(
        `${this.baseEndpoint}/validate/${code}`
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to validate code');
    }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string): Promise<Invitation> {
    try {
      return await apiService.post<Invitation>(
        `${this.baseEndpoint}/${invitationId}/resend`,
        {}
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to resend invitation');
    }
  }

  /**
   * Get invitation statistics for a space
   */
  async getInvitationStats(spaceId: string): Promise<InvitationStatsResponse> {
    try {
      return await apiService.get<InvitationStatsResponse>(
        `/api/spaces/${spaceId}/invitations/stats`
      );
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to fetch invitation statistics');
    }
  }

  /**
   * Upload CSV file for bulk invitations
   */
  async uploadBulkInvitations(
    spaceId: string,
    file: File,
    defaultRole: string = 'member'
  ): Promise<BulkInvitationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('spaceId', spaceId);
    formData.append('defaultRole', defaultRole);

    try {
      const response = await fetch(
        `${apiService.baseUrl}${this.baseEndpoint}/bulk/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      throw this.handleError(error, 'Failed to upload bulk invitations');
    }
  }

  /**
   * Get authentication token for manual requests
   */
  private async getAuthToken(): Promise<string> {
    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || '';
    } catch {
      return '';
    }
  }

  /**
   * Handle and transform API errors
   */
  private handleError(error: unknown, fallbackMessage: string): InvitationServiceError {
    // Type guard for error objects with status
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const apiError = error as { status?: number; message?: string };
      if (typeof apiError.status === 'number') {
        const code = this.mapStatusToErrorCode(apiError.status);
        return new InvitationServiceError(
          apiError.message || fallbackMessage,
          code,
          apiError.status
        );
      }
    }

    // Network or other errors
    const errorMessage = (error instanceof Error) ? error.message : fallbackMessage;
    return new InvitationServiceError(
      errorMessage,
      'NETWORK_ERROR'
    );
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'INVALID_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'PERMISSION_DENIED';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'QUOTA_EXCEEDED';
      case 500:
        return 'SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}

// Create singleton instance
export const invitationService = new InvitationService();

// Export service class for testing
export { InvitationService };

// Email validation utilities
export const emailUtils = {
  /**
   * Validate single email address
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  },

  /**
   * Validate and normalize multiple emails
   */
  validateEmails(emails: string[]): {
    valid: string[];
    invalid: Array<{ email: string; error: string }>;
  } {
    const valid: string[] = [];
    const invalid: Array<{ email: string; error: string }> = [];

    emails.forEach(email => {
      const result = this.validateEmail(email);
      if (result.valid) {
        const normalized = email.trim().toLowerCase();
        if (!valid.includes(normalized)) {
          valid.push(normalized);
        }
      } else {
        invalid.push({ email, error: result.error! });
      }
    });

    return { valid, invalid };
  },

  /**
   * Parse emails from text (comma/newline separated)
   */
  parseEmailList(text: string): string[] {
    return text
      .split(/[,\n;]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }
};