/**
 * Zustand store for conversation/unread state management.
 *
 * This store handles client-side state for:
 * - Unread navigation (which threads are unread, current position)
 * - UI state (dismissed states, active thread)
 * - Optimistic updates when marking as read
 *
 * Server state (actual thread data) is managed by React Query hooks.
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { ConversationThread } from '../types/conversation'

// ============================================================================
// Types
// ============================================================================

interface UnreadNavigationState {
  /** Cached list of unread threads for navigation */
  threads: ConversationThread[]
  /** Current position in the unread list */
  currentIndex: number
  /** Whether the navigation bar has been dismissed */
  isDismissed: boolean
  /** When the unread list was last fetched */
  lastFetched: string | null
  /** Space ID this navigation state belongs to */
  spaceId: string | null
}

interface ActiveThreadState {
  /** Currently active/open thread ID */
  threadId: string | null
  /** Type of the active thread */
  threadType: 'highlight' | 'journal_discussion' | null
  /** Journal ID the thread belongs to */
  journalId: string | null
}

interface ConversationState {
  // Unread Navigation
  unreadNav: UnreadNavigationState

  // Active Thread
  activeThread: ActiveThreadState

  // Optimistic Updates - track threads we've marked as read locally
  // before server confirms (for instant UI feedback)
  optimisticallyReadThreads: Set<string>
}

interface ConversationActions {
  // Unread Navigation Actions
  setUnreadThreads: (spaceId: string, threads: ConversationThread[]) => void
  removeUnreadThread: (threadId: string) => void
  navigateToNextUnread: () => ConversationThread | null
  dismissNavigation: () => void
  resetNavigation: (spaceId?: string) => void

  // Active Thread Actions
  setActiveThread: (
    threadId: string | null,
    threadType?: 'highlight' | 'journal_discussion' | null,
    journalId?: string | null
  ) => void
  clearActiveThread: () => void

  // Optimistic Updates
  markThreadAsReadOptimistic: (threadId: string) => void
  clearOptimisticRead: (threadId: string) => void
  isThreadReadOptimistic: (threadId: string) => boolean

  // Reset
  reset: () => void
}

// ============================================================================
// Initial State
// ============================================================================

const initialUnreadNavState: UnreadNavigationState = {
  threads: [],
  currentIndex: 0,
  isDismissed: false,
  lastFetched: null,
  spaceId: null,
}

const initialActiveThreadState: ActiveThreadState = {
  threadId: null,
  threadType: null,
  journalId: null,
}

const initialState: ConversationState = {
  unreadNav: initialUnreadNavState,
  activeThread: initialActiveThreadState,
  optimisticallyReadThreads: new Set(),
}

// ============================================================================
// Store
// ============================================================================

export const useConversationStore = create<ConversationState & ConversationActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      ...initialState,

      // Unread Navigation Actions
      setUnreadThreads: (spaceId, threads) => {
        set(
          {
            unreadNav: {
              threads,
              currentIndex: 0,
              isDismissed: false,
              lastFetched: new Date().toISOString(),
              spaceId,
            },
          },
          false,
          'setUnreadThreads'
        )
      },

      removeUnreadThread: (threadId) => {
        set(
          (state) => {
            const { threads, currentIndex } = state.unreadNav
            const threadIndex = threads.findIndex((t) => t.threadId === threadId)

            if (threadIndex === -1) return state

            const newThreads = threads.filter((t) => t.threadId !== threadId)

            // Adjust currentIndex if we removed a thread before or at current position
            let newIndex = currentIndex
            if (threadIndex < currentIndex) {
              newIndex = Math.max(0, currentIndex - 1)
            } else if (threadIndex === currentIndex && newIndex >= newThreads.length) {
              newIndex = Math.max(0, newThreads.length - 1)
            }

            return {
              unreadNav: {
                ...state.unreadNav,
                threads: newThreads,
                currentIndex: newIndex,
              },
            }
          },
          false,
          'removeUnreadThread'
        )
      },

      navigateToNextUnread: () => {
        const { threads, currentIndex } = get().unreadNav

        // Remove current thread and get next
        const remainingThreads = threads.slice(currentIndex + 1)

        if (remainingThreads.length === 0) {
          set(
            (state) => ({
              unreadNav: {
                ...state.unreadNav,
                threads: [],
                currentIndex: 0,
              },
            }),
            false,
            'navigateToNextUnread/empty'
          )
          return null
        }

        const nextThread = remainingThreads[0]

        set(
          (state) => ({
            unreadNav: {
              ...state.unreadNav,
              threads: remainingThreads,
              currentIndex: 0,
            },
          }),
          false,
          'navigateToNextUnread'
        )

        return nextThread
      },

      dismissNavigation: () => {
        set(
          (state) => ({
            unreadNav: {
              ...state.unreadNav,
              isDismissed: true,
            },
          }),
          false,
          'dismissNavigation'
        )
      },

      resetNavigation: (spaceId) => {
        set(
          {
            unreadNav: {
              ...initialUnreadNavState,
              spaceId: spaceId ?? null,
            },
          },
          false,
          'resetNavigation'
        )
      },

      // Active Thread Actions
      setActiveThread: (threadId, threadType = null, journalId = null) => {
        set(
          {
            activeThread: {
              threadId,
              threadType,
              journalId,
            },
          },
          false,
          'setActiveThread'
        )
      },

      clearActiveThread: () => {
        set({ activeThread: initialActiveThreadState }, false, 'clearActiveThread')
      },

      // Optimistic Updates
      markThreadAsReadOptimistic: (threadId) => {
        set(
          (state) => ({
            optimisticallyReadThreads: new Set([...state.optimisticallyReadThreads, threadId]),
          }),
          false,
          'markThreadAsReadOptimistic'
        )
      },

      clearOptimisticRead: (threadId) => {
        set(
          (state) => {
            const newSet = new Set(state.optimisticallyReadThreads)
            newSet.delete(threadId)
            return { optimisticallyReadThreads: newSet }
          },
          false,
          'clearOptimisticRead'
        )
      },

      isThreadReadOptimistic: (threadId) => {
        return get().optimisticallyReadThreads.has(threadId)
      },

      // Reset
      reset: () => {
        set(initialState, false, 'reset')
      },
    })),
    { name: 'conversation-store' }
  )
)

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectUnreadThreads = (state: ConversationState) => state.unreadNav.threads
export const selectUnreadCount = (state: ConversationState) => state.unreadNav.threads.length
export const selectCurrentUnreadThread = (state: ConversationState) =>
  state.unreadNav.threads[state.unreadNav.currentIndex] ?? null
export const selectHasMoreUnread = (state: ConversationState) => state.unreadNav.threads.length > 1
export const selectIsNavigationDismissed = (state: ConversationState) => state.unreadNav.isDismissed
export const selectActiveThread = (state: ConversationState) => state.activeThread
