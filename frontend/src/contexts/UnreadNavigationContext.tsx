/**
 * UnreadNavigationContext
 *
 * Manages navigation state for unread messages across components.
 * When a user clicks an unread thread from ConversationsTab, this context:
 * - Stores the queue of unread threads
 * - Tracks current position in the queue
 * - Provides navigation to next/previous unread
 * - Handles marking threads as read during navigation
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConversationThread } from '../types/conversation';
import { conversationService } from '../services/conversationService';

export interface UnreadNavigationState {
  unreadThreads: ConversationThread[];
  currentIndex: number;
  spaceId: string | null;
  isActive: boolean;
}

export interface UnreadNavigationContextValue {
  state: UnreadNavigationState;
  enterUnreadNavigation: (threads: ConversationThread[], spaceId: string, startIndex?: number) => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  markCurrentAsRead: () => void;
  exitNavigation: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  currentThread: ConversationThread | null;
  remainingCount: number;
  totalCount: number;
}

const UnreadNavigationContext = createContext<UnreadNavigationContextValue | undefined>(undefined);

export const UnreadNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [state, setState] = useState<UnreadNavigationState>({
    unreadThreads: [],
    currentIndex: 0,
    spaceId: null,
    isActive: false,
  });

  // Navigate to a specific thread by constructing the appropriate URL
  const navigateToThread = useCallback((thread: ConversationThread, spaceId: string) => {
    const baseUrl = `/spaces/${spaceId}/journals/${thread.journalId}`;

    if (thread.threadType === 'highlight') {
      navigate(`${baseUrl}?highlightId=${thread.threadId}`);
    } else {
      // Journal discussion - include scrollToEnd to scroll to latest comments
      navigate(`${baseUrl}?openJournalComments=true&scrollToEnd=true`);
    }
  }, [navigate]);

  // Enter navigation mode with a list of unread threads
  const enterUnreadNavigation = useCallback((
    threads: ConversationThread[],
    spaceId: string,
    startIndex: number = 0
  ) => {
    if (threads.length === 0) return;

    setState({
      unreadThreads: threads,
      currentIndex: startIndex,
      spaceId,
      isActive: true,
    });

    // Navigate to the starting thread
    navigateToThread(threads[startIndex], spaceId);
  }, [navigateToThread]);

  // Navigate to the next unread thread
  const navigateToNext = useCallback(() => {
    if (!state.isActive || !state.spaceId) return;

    const nextIndex = state.currentIndex + 1;
    if (nextIndex < state.unreadThreads.length) {
      setState(prev => ({ ...prev, currentIndex: nextIndex }));
      navigateToThread(state.unreadThreads[nextIndex], state.spaceId!);
    }
  }, [state.isActive, state.spaceId, state.currentIndex, state.unreadThreads, navigateToThread]);

  // Navigate to the previous unread thread
  const navigateToPrevious = useCallback(() => {
    if (!state.isActive || !state.spaceId) return;

    const prevIndex = state.currentIndex - 1;
    if (prevIndex >= 0) {
      setState(prev => ({ ...prev, currentIndex: prevIndex }));
      navigateToThread(state.unreadThreads[prevIndex], state.spaceId!);
    }
  }, [state.isActive, state.spaceId, state.currentIndex, state.unreadThreads, navigateToThread]);

  // Mark the current thread as read and remove it from the queue
  const markCurrentAsRead = useCallback(() => {
    if (!state.isActive || !state.spaceId) return;

    const currentThread = state.unreadThreads[state.currentIndex];
    if (!currentThread) return;

    // Call API to mark as read (fire and forget)
    conversationService
      .markThreadAsRead(state.spaceId, currentThread.threadId, currentThread.threadType)
      .catch(err => console.error('Error marking thread as read:', err));

    // Remove the thread from the queue
    setState(prev => {
      const newThreads = prev.unreadThreads.filter((_, i) => i !== prev.currentIndex);

      // If no more unread threads, exit navigation
      if (newThreads.length === 0) {
        return {
          unreadThreads: [],
          currentIndex: 0,
          spaceId: null,
          isActive: false,
        };
      }

      // Adjust current index if needed (stay at same position or move back if at end)
      const newIndex = Math.min(prev.currentIndex, newThreads.length - 1);

      return {
        ...prev,
        unreadThreads: newThreads,
        currentIndex: newIndex,
      };
    });
  }, [state.isActive, state.spaceId, state.currentIndex, state.unreadThreads]);

  // Exit navigation mode
  const exitNavigation = useCallback(() => {
    setState({
      unreadThreads: [],
      currentIndex: 0,
      spaceId: null,
      isActive: false,
    });
  }, []);

  // Computed values
  const hasNext = state.currentIndex < state.unreadThreads.length - 1;
  const hasPrevious = state.currentIndex > 0;
  const currentThread = state.unreadThreads[state.currentIndex] || null;
  const remainingCount = state.unreadThreads.length - state.currentIndex;
  const totalCount = state.unreadThreads.length;

  const value = useMemo(() => ({
    state,
    enterUnreadNavigation,
    navigateToNext,
    navigateToPrevious,
    markCurrentAsRead,
    exitNavigation,
    hasNext,
    hasPrevious,
    currentThread,
    remainingCount,
    totalCount,
  }), [
    state,
    enterUnreadNavigation,
    navigateToNext,
    navigateToPrevious,
    markCurrentAsRead,
    exitNavigation,
    hasNext,
    hasPrevious,
    currentThread,
    remainingCount,
    totalCount,
  ]);

  return (
    <UnreadNavigationContext.Provider value={value}>
      {children}
    </UnreadNavigationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUnreadNavigation = (): UnreadNavigationContextValue => {
  const context = useContext(UnreadNavigationContext);
  if (!context) {
    throw new Error('useUnreadNavigation must be used within UnreadNavigationProvider');
  }
  return context;
};
