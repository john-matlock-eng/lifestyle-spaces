/**
 * ConversationsTab Component
 *
 * Displays thread-level conversation data for a space with:
 * - Search functionality
 * - Filter by type and participation
 * - Sort by recent/unread/replies
 * - Mark all as read
 * - Infinite scroll pagination
 * - Auto-polling for updates
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Highlighter,
  Check,
  CheckCheck,
  Reply,
  User,
  Search,
  X,
  RefreshCw,
  ChevronRight,
  Inbox,
  Clock,
  Filter,
} from 'lucide-react';
import {
  useInfiniteThreads,
  useUnreadCount,
  useMarkThreadAsRead,
  useMarkAllAsRead,
} from '../hooks/useConversations';
import type { ConversationThread, GetThreadsOptions, GroupedJournalConversations } from '../types/conversation';
import { JournalConversationCard } from './JournalConversationCard';
import './ConversationsTab.css';

interface ConversationsTabProps {
  spaceId: string;
  onUnreadCountChange?: (count: number, repliesCount: number) => void;
}

const PAGE_SIZE = 20;

// Format timestamp smartly
const formatTimestamp = (isoString: string): string => {
  const now = new Date();
  // Ensure UTC parsing - append Z if no timezone specified
  const normalizedString =
    isoString.endsWith('Z') || isoString.includes('+') || isoString.includes('-', 10)
      ? isoString
      : isoString + 'Z';
  const then = new Date(normalizedString);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Generate consistent color for participant
const getParticipantColor = (name: string): string => {
  const colors = [
    '#14b8a6',
    '#a855f7',
    '#ec4899',
    '#10b981',
    '#0ea5e9',
    '#f59e0b',
    '#0d9488',
    '#9333ea',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get participation status text
const getParticipationText = (thread: ConversationThread): string => {
  if (thread.userStarted && thread.userParticipated) {
    return 'You started';
  }
  if (thread.userParticipated) {
    return 'You replied';
  }
  return '';
};

// Group threads by journal for card view
const groupThreadsByJournal = (threads: ConversationThread[]): GroupedJournalConversations[] => {
  const journalMap = new Map<string, GroupedJournalConversations>();

  threads.forEach((thread) => {
    if (!journalMap.has(thread.journalId)) {
      journalMap.set(thread.journalId, {
        journalId: thread.journalId,
        journalTitle: thread.journalTitle,
        journalAuthorId: thread.journalAuthorId,
        journalAuthorName: thread.journalAuthorName,
        lastActivity: thread.lastActivity,
        totalCommentCount: 0,
        totalUnreadCount: 0,
        hasReplyToUser: false,
        threads: [],
      });
    }

    const group = journalMap.get(thread.journalId)!;
    group.threads.push(thread);
    group.totalCommentCount += thread.commentCount;
    group.totalUnreadCount += thread.unreadCount;
    if (thread.hasReplyToUser) group.hasReplyToUser = true;
    // Update lastActivity to most recent
    if (thread.lastActivity > group.lastActivity) {
      group.lastActivity = thread.lastActivity;
    }
  });

  // Sort groups by most recent activity, with unread first
  return Array.from(journalMap.values()).sort((a, b) => {
    // Unread journals first
    if (a.totalUnreadCount > 0 && b.totalUnreadCount === 0) return -1;
    if (a.totalUnreadCount === 0 && b.totalUnreadCount > 0) return 1;
    // Then by activity
    return b.lastActivity.localeCompare(a.lastActivity);
  });
};

export const ConversationsTab: React.FC<ConversationsTabProps> = ({
  spaceId,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();

  // Filter/sort state
  const [sortBy, setSortBy] = useState<GetThreadsOptions['sort']>('recent');
  const [filterType, setFilterType] = useState<GetThreadsOptions['type']>(undefined);
  const [filterParticipation, setFilterParticipation] = useState<'all' | 'participated' | 'unread'>('all');
  const [timeFilter, setTimeFilter] = useState<GetThreadsOptions['timeFilter']>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const listRef = useRef<HTMLDivElement>(null);

  // Build query options (without offset - handled by infinite query)
  const queryOptions: Omit<GetThreadsOptions, 'offset'> = useMemo(() => ({
    sort: sortBy,
    type: filterType,
    filter: filterParticipation,
    timeFilter,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
  }), [sortBy, filterType, filterParticipation, timeFilter, searchQuery]);

  // React Query hooks - using infinite query for proper pagination accumulation
  const {
    data: infiniteData,
    isLoading: loading,
    isFetchingNextPage,
    error: queryError,
    refetch,
    dataUpdatedAt,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteThreads(spaceId, queryOptions);

  const {
    data: unreadCountData,
  } = useUnreadCount(spaceId);

  const markThreadAsReadMutation = useMarkThreadAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // Derived state from React Query - flatten all pages into a single array
  const threads = useMemo(() =>
    infiniteData?.pages.flatMap(page => page.threads) ?? [],
    [infiniteData]
  );
  const firstPage = infiniteData?.pages[0];
  const totalUnread = unreadCountData?.totalUnread ?? firstPage?.totalUnread ?? 0;
  const threadsWithReplies = unreadCountData?.threadsWithReplies ?? firstPage?.threadsWithReplies ?? 0;
  const totalCount = firstPage?.totalCount ?? threads.length;
  const hasMore = hasNextPage ?? false;
  const error = queryError ? 'Failed to load conversations' : null;
  const loadingMore = isFetchingNextPage;
  const lastRefresh = new Date(dataUpdatedAt);

  // Memoized grouped conversations
  const groupedConversations = useMemo(
    () => groupThreadsByJournal(threads),
    [threads]
  );

  // Notify parent of unread count changes
  useEffect(() => {
    onUnreadCountChange?.(totalUnread, threadsWithReplies);
  }, [totalUnread, threadsWithReplies, onUnreadCountChange]);

  // Note: No need to reset offset when filters change - useInfiniteQuery
  // automatically resets when query key changes (which includes queryOptions)

  // Infinite scroll - load more using fetchNextPage from useInfiniteQuery
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchNextPage();
    }
  }, [loadingMore, hasMore, fetchNextPage]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || loadingMore || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore();
      }
    };

    const listElement = listRef.current;
    listElement?.addEventListener('scroll', handleScroll);
    return () => listElement?.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, loadMore]);

  // Search debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleThreadClick = async (thread: ConversationThread) => {
    // Auto-mark as read using mutation (optimistic updates handled by React Query)
    if (thread.isUnread) {
      markThreadAsReadMutation.mutate({
        spaceId,
        threadId: thread.threadId,
        threadType: thread.threadType,
      });
    }

    // Navigate to the appropriate location with enhanced params
    const baseUrl = `/spaces/${spaceId}/journals/${thread.journalId}`;
    const params = new URLSearchParams();

    // Always include fromConversations to show the nav bar
    params.set('fromConversations', 'true');

    // If the thread was unread, enable scroll to unread
    if (thread.isUnread) {
      params.set('scrollToUnread', 'true');

      // Calculate position in unread queue for navigation
      const unreadThreads = threads.filter((t) => t.isUnread);
      const unreadIndex = unreadThreads.findIndex((t) => t.threadId === thread.threadId);
      if (unreadIndex >= 0) {
        params.set('unreadNavIndex', unreadIndex.toString());
      }
    }

    if (thread.threadType === 'highlight') {
      params.set('highlightId', thread.threadId);
    } else {
      params.set('openJournalComments', 'true');
    }

    const finalUrl = `${baseUrl}?${params.toString()}`;
    navigate(finalUrl);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, thread: ConversationThread) => {
    e.stopPropagation();
    markThreadAsReadMutation.mutate({
      spaceId,
      threadId: thread.threadId,
      threadType: thread.threadType,
    });
  };

  const handleMarkAllAsRead = async () => {
    if (markAllAsReadMutation.isPending || totalUnread === 0) return;
    markAllAsReadMutation.mutate(spaceId);
  };

  const handleRefresh = () => {
    refetch();
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilterType(undefined);
    setFilterParticipation('all');
    setTimeFilter(undefined);
    setSortBy('recent');
  };

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    searchQuery || filterType || filterParticipation !== 'all' || timeFilter
  );

  // Get filter label for display
  const getTimeFilterLabel = (tf: typeof timeFilter): string => {
    switch (tf) {
      case 'today': return 'Today';
      case 'week': return 'This week';
      case 'month': return 'This month';
      default: return '';
    }
  };

  const getParticipationLabel = (fp: typeof filterParticipation): string => {
    switch (fp) {
      case 'participated': return 'My threads';
      case 'unread': return 'Unread only';
      default: return '';
    }
  };

  const getTypeLabel = (ft: typeof filterType): string => {
    switch (ft) {
      case 'highlight': return 'Highlights';
      case 'journal_discussion': return 'Discussions';
      default: return '';
    }
  };

  if (loading && threads.length === 0) {
    return (
      <div className="conversations-tab">
        <div className="conversations-loading">
          <div className="conversations-loading-spinner" />
          <span>Loading conversations...</span>
        </div>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="conversations-tab">
        <div className="conversations-error">
          <span className="conversations-error-icon">!</span>
          <span>{error}</span>
          <button className="conversations-retry-btn" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversations-tab">
      {/* Header */}
      <div className="conversations-header">
        <div className="conversations-header-left">
          <h2 className="conversations-title">Conversations</h2>
          {totalUnread > 0 && (
            <span className="conversations-unread-badge">{totalUnread} new</span>
          )}
          {threadsWithReplies > 0 && (
            <span className="conversations-replies-badge">
              <Reply size={12} />
              {threadsWithReplies}
            </span>
          )}
        </div>
        <div className="conversations-header-actions">
          {totalUnread > 0 && (
            <button
              className="conversations-mark-all-btn"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              title="Mark all as read"
            >
              <CheckCheck size={16} />
              <span className="conversations-mark-all-text">Mark all read</span>
            </button>
          )}
          <button
            className="conversations-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title={`Last updated: ${formatTimestamp(lastRefresh.toISOString())}`}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button
            className={`conversations-view-toggle ${viewMode === 'grouped' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
            title={viewMode === 'grouped' ? 'Switch to flat view' : 'Switch to grouped view'}
          >
            {viewMode === 'grouped' ? '📑' : '📋'}
          </button>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="conversations-quick-filters">
        <button
          className={`quick-filter-pill ${filterParticipation === 'unread' ? 'quick-filter-pill--active' : ''}`}
          onClick={() => setFilterParticipation(filterParticipation === 'unread' ? 'all' : 'unread')}
        >
          <Inbox size={14} />
          Unread
          {totalUnread > 0 && <span className="quick-filter-count">{totalUnread}</span>}
        </button>
        <button
          className={`quick-filter-pill ${sortBy === 'replies' ? 'quick-filter-pill--active' : ''}`}
          onClick={() => setSortBy(sortBy === 'replies' ? 'recent' : 'replies')}
        >
          <Reply size={14} />
          Replies to me
          {threadsWithReplies > 0 && <span className="quick-filter-count">{threadsWithReplies}</span>}
        </button>
        <button
          className={`quick-filter-pill ${filterParticipation === 'participated' ? 'quick-filter-pill--active' : ''}`}
          onClick={() => setFilterParticipation(filterParticipation === 'participated' ? 'all' : 'participated')}
        >
          <User size={14} />
          My threads
        </button>
        <div className="quick-filter-divider" />
        <button
          className={`quick-filter-pill ${timeFilter === 'today' ? 'quick-filter-pill--active' : ''}`}
          onClick={() => setTimeFilter(timeFilter === 'today' ? undefined : 'today')}
        >
          <Clock size={14} />
          Today
        </button>
        <button
          className={`quick-filter-pill ${timeFilter === 'week' ? 'quick-filter-pill--active' : ''}`}
          onClick={() => setTimeFilter(timeFilter === 'week' ? undefined : 'week')}
        >
          This week
        </button>
        <button
          className={`quick-filter-pill ${timeFilter === 'month' ? 'quick-filter-pill--active' : ''}`}
          onClick={() => setTimeFilter(timeFilter === 'month' ? undefined : 'month')}
        >
          This month
        </button>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="conversations-active-filters">
          {filterParticipation !== 'all' && (
            <span className="active-filter-chip">
              {getParticipationLabel(filterParticipation)}
              <button onClick={() => setFilterParticipation('all')} className="chip-remove">
                <X size={12} />
              </button>
            </span>
          )}
          {filterType && (
            <span className="active-filter-chip">
              {getTypeLabel(filterType)}
              <button onClick={() => setFilterType(undefined)} className="chip-remove">
                <X size={12} />
              </button>
            </span>
          )}
          {timeFilter && (
            <span className="active-filter-chip">
              {getTimeFilterLabel(timeFilter)}
              <button onClick={() => setTimeFilter(undefined)} className="chip-remove">
                <X size={12} />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="active-filter-chip">
              Search: "{searchQuery}"
              <button onClick={clearSearch} className="chip-remove">
                <X size={12} />
              </button>
            </span>
          )}
          <button className="clear-all-filters" onClick={clearAllFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Search and Advanced Filters */}
      <div className="conversations-controls">
        <div className="conversations-search">
          <Search size={16} className="conversations-search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="conversations-search-input"
          />
          {searchInput && (
            <button className="conversations-search-clear" onClick={clearSearch}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="conversations-filters">
          <select
            value={filterType || 'all'}
            onChange={(e) =>
              setFilterType(
                e.target.value === 'all' ? undefined : (e.target.value as GetThreadsOptions['type'])
              )
            }
            className="conversations-filter-select"
          >
            <option value="all">All types</option>
            <option value="highlight">Highlights</option>
            <option value="journal_discussion">Discussions</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GetThreadsOptions['sort'])}
            className="conversations-sort-select"
          >
            <option value="recent">Recent</option>
            <option value="unread">Unread first</option>
            <option value="replies">Replies to you</option>
          </select>
        </div>
      </div>

      {/* Threads List */}
      {threads.length === 0 ? (
        <div className="conversations-empty">
          {/* Inbox Zero state - when unread filter is on and all caught up */}
          {filterParticipation === 'unread' && totalUnread === 0 ? (
            <>
              <div className="inbox-zero-icon">
                <Check size={32} />
              </div>
              <h3>Inbox Zero!</h3>
              <p>You're all caught up. No unread conversations.</p>
              <button className="conversations-empty-btn" onClick={() => setFilterParticipation('all')}>
                View all conversations
              </button>
            </>
          ) : hasActiveFilters ? (
            <>
              <Filter size={48} strokeWidth={1} />
              <h3>No matching conversations</h3>
              <p>Try adjusting your filters or search query.</p>
              <button className="conversations-empty-btn" onClick={clearAllFilters}>
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <MessageSquare size={48} strokeWidth={1} />
              <h3>No conversations yet</h3>
              <p>
                Start a conversation by highlighting text in a journal and adding a comment, or
                leave a comment at the bottom of any journal.
              </p>
              <button
                className="conversations-empty-btn"
                onClick={() => navigate(`/spaces/${spaceId}/journals`)}
              >
                Browse journals
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          {(searchQuery || filterType || filterParticipation !== 'all') && (
            <div className="conversations-results-count">
              {totalCount} {totalCount === 1 ? 'conversation' : 'conversations'} found
              {viewMode === 'grouped' && ` in ${groupedConversations.length} ${groupedConversations.length === 1 ? 'journal' : 'journals'}`}
            </div>
          )}

          {viewMode === 'grouped' ? (
            /* Grouped view - journals with sub-threads */
            <div className="conversations-grouped-list" ref={listRef}>
              {groupedConversations.map((group) => (
                <JournalConversationCard
                  key={group.journalId}
                  group={group}
                  onThreadClick={handleThreadClick}
                  onMarkThreadRead={handleMarkAsRead}
                />
              ))}

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="conversations-loading-more">
                  <div className="conversations-loading-spinner conversations-loading-spinner--small" />
                  <span>Loading more...</span>
                </div>
              )}

              {/* End of list */}
              {!hasMore && threads.length > PAGE_SIZE && (
                <div className="conversations-end">You've seen all conversations</div>
              )}
            </div>
          ) : (
            /* Flat view - original thread rows */
            <div className="conversations-list" ref={listRef}>
              {threads.map((thread) => {
                const isHighlight = thread.threadType === 'highlight';
                const participationText = getParticipationText(thread);

                return (
                  <div
                    key={thread.threadId}
                    className={`thread-row ${thread.isUnread ? 'thread-row--unread' : ''} ${
                      thread.hasReplyToUser ? 'thread-row--has-reply' : ''
                    }`}
                    onClick={() => handleThreadClick(thread)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleThreadClick(thread);
                      }
                    }}
                  >
                    {/* Left: Type icon with indicators */}
                    <div className="thread-row-icon-area">
                      <div
                        className={`thread-row-icon ${
                          isHighlight ? 'thread-row-icon--highlight' : 'thread-row-icon--discussion'
                        }`}
                      >
                        {isHighlight ? <Highlighter size={16} /> : <MessageSquare size={16} />}
                      </div>
                      {thread.isUnread && <span className="thread-unread-dot" />}
                      {thread.hasReplyToUser && (
                        <span className="thread-reply-indicator" title="Someone replied to you">
                          <Reply size={10} />
                        </span>
                      )}
                    </div>

                    {/* Middle: Content */}
                    <div className="thread-row-content">
                      {/* Top row: title and time */}
                      <div className="thread-row-top">
                        <div className="thread-row-title-area">
                          {/* Mobile unread dot - shown inline with title */}
                          {thread.isUnread && <span className="thread-row-mobile-unread-dot" />}
                          {isHighlight && thread.highlightText ? (
                            <span
                              className={`thread-row-title ${
                                thread.isUnread ? 'thread-row-title--unread' : ''
                              }`}
                            >
                              "{thread.highlightText}"
                            </span>
                          ) : (
                            <span
                              className={`thread-row-title ${
                                thread.isUnread ? 'thread-row-title--unread' : ''
                              }`}
                            >
                              Journal Discussion
                            </span>
                          )}
                        </div>
                        <span className="thread-row-time">{formatTimestamp(thread.lastActivity)}</span>
                      </div>

                      {/* Second row: journal info and participation */}
                      <div className="thread-row-context">
                        <span className="thread-row-journal">{thread.journalTitle}</span>
                        <span className="thread-row-author">by {thread.journalAuthorName}</span>
                        {participationText && (
                          <span className="thread-row-participation">
                            <User size={10} />
                            {participationText}
                          </span>
                        )}
                        {/* Mobile stats - shown inline on context row */}
                        <span
                          className={`thread-row-mobile-stats ${
                            thread.isUnread ? 'thread-row-mobile-stats--unread' : ''
                          }`}
                        >
                          {thread.commentCount} {thread.commentCount === 1 ? 'reply' : 'replies'}
                        </span>
                      </div>

                      {/* Third row: latest comment preview */}
                      {thread.latestCommentText && (
                        <div className="thread-row-preview">
                          <span className="thread-row-preview-author">
                            {thread.latestCommentAuthor}:
                          </span>
                          <span className="thread-row-preview-text">{thread.latestCommentText}</span>
                        </div>
                      )}

                      {/* Bottom row: participants and stats */}
                      <div className="thread-row-bottom">
                        <div className="thread-row-participants">
                          {thread.participants.slice(0, 4).map((name, index) => (
                            <div
                              key={index}
                              className="thread-avatar"
                              style={{ backgroundColor: getParticipantColor(name) }}
                              title={name}
                            >
                              {name.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {thread.participants.length > 4 && (
                            <div className="thread-avatar thread-avatar--more">
                              +{thread.participants.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="thread-row-stats">
                          <span className="thread-row-stat">
                            {thread.commentCount} {thread.commentCount === 1 ? 'comment' : 'comments'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Unread count and actions */}
                    <div className="thread-row-actions">
                      {thread.isUnread ? (
                        <>
                          <span className="thread-unread-count">{thread.unreadCount}</span>
                          <button
                            className="thread-mark-read-btn"
                            onClick={(e) => handleMarkAsRead(e, thread)}
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        </>
                      ) : (
                        <ChevronRight size={18} className="thread-row-chevron" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="conversations-loading-more">
                  <div className="conversations-loading-spinner conversations-loading-spinner--small" />
                  <span>Loading more...</span>
                </div>
              )}

              {/* End of list */}
              {!hasMore && threads.length > PAGE_SIZE && (
                <div className="conversations-end">You've seen all conversations</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConversationsTab;
