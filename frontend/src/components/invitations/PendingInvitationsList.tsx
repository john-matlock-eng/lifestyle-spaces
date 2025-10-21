/**
 * PendingInvitationsList - Display user's pending invitations
 * Features: Loading states, empty states, filtering, sorting, real-time updates
 */

import React, { useEffect, useState } from 'react';
import { useInvitations } from '../../hooks/useInvitations';
import { InvitationCard } from './InvitationCard';
import { InvitationStatus, SpaceMemberRole } from '../../types/invitation.types';
import type { Invitation } from '../../types/invitation.types';

interface FilterState {
  searchTerm: string;
  status: InvitationStatus | 'all';
  role: SpaceMemberRole | 'all';
  sortBy: 'createdAt' | 'expiresAt' | 'spaceName';
  sortOrder: 'asc' | 'desc';
}

export const PendingInvitationsList: React.FC = () => {
  const {
    pendingInvitations,
    isLoading,
    error,
    fetchPendingInvitations,
    clearError,
    subscribeToUpdates
  } = useInvitations();

  const [filter, setFilter] = useState<FilterState>({
    searchTerm: '',
    status: 'all',
    role: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch data on mount
  useEffect(() => {
    fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToUpdates();
    return unsubscribe;
  }, [subscribeToUpdates]);

  // Filter and sort invitations
  const filteredInvitations = React.useMemo(() => {
    let filtered = [...pendingInvitations];

    // Apply search filter
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(invitation =>
        invitation.spaceName.toLowerCase().includes(searchLower) ||
        invitation.inviterDisplayName.toLowerCase().includes(searchLower) ||
        invitation.inviterEmail.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(invitation => invitation.status === filter.status);
    }

    // Apply role filter
    if (filter.role !== 'all') {
      filtered = filtered.filter(invitation => invitation.role === filter.role);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (filter.sortBy) {
        case 'spaceName':
          aValue = a.spaceName.toLowerCase();
          bValue = b.spaceName.toLowerCase();
          break;
        case 'expiresAt':
          aValue = new Date(a.expiresAt).getTime();
          bValue = new Date(b.expiresAt).getTime();
          break;
        default: // createdAt
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue < bValue) return filter.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filter.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pendingInvitations, filter]);

  // Group invitations by status for better UX
  const groupedInvitations = React.useMemo(() => {
    const groups: Record<string, Invitation[]> = {};

    filteredInvitations.forEach(invitation => {
      const status = invitation.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(invitation);
    });

    return groups;
  }, [filteredInvitations]);

  const handleRefresh = () => {
    clearError();
    fetchPendingInvitations();
  };

  if (isLoading && pendingInvitations.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>

        {/* Filter Skeleton */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Card Skeletons */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                    <div className="flex space-x-2">
                      <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                      <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Invitations</h1>
          <p className="mt-1 text-sm text-gray-600">
            {filteredInvitations.length} invitation{filteredInvitations.length !== 1 ? 's' : ''}
            {filter.searchTerm && ` matching "${filter.searchTerm}"`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh invitations"
        >
          <svg
            className={`-ml-1 mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="sr-only">
              Search invitations
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search spaces or inviters..."
              value={filter.searchTerm}
              onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as InvitationStatus | 'all' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value={InvitationStatus.PENDING}>Pending</option>
              <option value={InvitationStatus.ACCEPTED}>Accepted</option>
              <option value={InvitationStatus.DECLINED}>Declined</option>
              <option value={InvitationStatus.EXPIRED}>Expired</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label htmlFor="role-filter" className="sr-only">
              Filter by role
            </label>
            <select
              id="role-filter"
              value={filter.role}
              onChange={(e) => setFilter(prev => ({ ...prev, role: e.target.value as SpaceMemberRole | 'all' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value={SpaceMemberRole.MEMBER}>Member</option>
              <option value={SpaceMemberRole.ADMIN}>Admin</option>
              <option value={SpaceMemberRole.OWNER}>Owner</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={filter.sortBy}
              onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Sort by"
            >
              <option value="createdAt">Date Invited</option>
              <option value="expiresAt">Expires</option>
              <option value="spaceName">Space Name</option>
            </select>
            <button
              onClick={() => setFilter(prev => ({
                ...prev,
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Sort ${filter.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <svg
                className={`h-4 w-4 transition-transform ${filter.sortOrder === 'desc' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="inline-flex text-red-400 hover:text-red-500"
                aria-label="Dismiss error"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredInvitations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter.searchTerm || filter.status !== 'all' || filter.role !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'You don\'t have any pending invitations at the moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Group by status if multiple statuses */}
          {Object.keys(groupedInvitations).length > 1 ? (
            Object.entries(groupedInvitations).map(([status, invitations]) => (
              <div key={status} className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 capitalize">
                  {status} ({invitations.length})
                </h2>
                <div className="space-y-4">
                  {invitations.map(invitation => (
                    <InvitationCard
                      key={invitation.invitationId}
                      invitation={invitation}
                      variant="pending"
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {filteredInvitations.map(invitation => (
                <InvitationCard
                  key={invitation.invitationId}
                  invitation={invitation}
                  variant="pending"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};