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

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { conversationService } from '../services/conversationService';
import type { ConversationThread, GetThreadsOptions } from '../types/conversation';
import './ConversationsTab.css';

interface ConversationsTabProps {
  spaceId: string;
  onUnreadCountChange?: (count: number, repliesCount: number) => void;
}

const POLL_INTERVAL = 30000; // 30 seconds
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

export const ConversationsTab: React.FC<ConversationsTabProps> = ({
  spaceId,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [threadsWithReplies, setThreadsWithReplies] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<GetThreadsOptions['sort']>('recent');
  const [filterType, setFilterType] = useState<GetThreadsOptions['type']>(undefined);
  const [filterParticipation, setFilterParticipation] = useState<'all' | 'participated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const listRef = useRef<HTMLDivElement>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Notify parent of unread count changes
  useEffect(() => {
    onUnreadCountChange?.(totalUnread, threadsWithReplies);
  }, [totalUnread, threadsWithReplies, onUnreadCountChange]);

  // Fetch threads
  const fetchThreads = useCallback(
    async (append = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const offset = append ? threads.length : 0;
        const response = await conversationService.getThreads(spaceId, {
          sort: sortBy,
          type: filterType,
          filter: filterParticipation,
          search: searchQuery || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        if (append) {
          setThreads((prev) => [...prev, ...response.threads]);
        } else {
          setThreads(response.threads);
        }
        setTotalUnread(response.totalUnread);
        setThreadsWithReplies(response.threadsWithReplies);
        setTotalCount(response.totalCount ?? response.threads.length);
        setHasMore(response.hasMore ?? false);
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Error fetching threads:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [spaceId, sortBy, filterType, filterParticipation, searchQuery, threads.length]
  );

  // Initial fetch and refetch on filter/sort changes
  useEffect(() => {
    fetchThreads(false);
  }, [spaceId, sortBy, filterType, filterParticipation, searchQuery]);

  // Polling for updates
  useEffect(() => {
    const poll = () => {
      pollTimeoutRef.current = setTimeout(async () => {
        try {
          // Just fetch unread counts for polling, not full threads
          const response = await conversationService.getUnreadCount(spaceId);
          if (response.totalUnread !== totalUnread || response.threadsWithReplies !== threadsWithReplies) {
            // If counts changed, do a full refresh
            fetchThreads(false);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
        poll(); // Schedule next poll
      }, POLL_INTERVAL);
    };

    poll();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [spaceId, totalUnread, threadsWithReplies]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || loadingMore || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchThreads(true);
      }
    };

    const listElement = listRef.current;
    listElement?.addEventListener('scroll', handleScroll);
    return () => listElement?.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, fetchThreads]);

  // Search debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleThreadClick = async (thread: ConversationThread) => {
    // Auto-mark as read (thread-level)
    if (thread.isUnread) {
      setThreads((prev) =>
        prev.map((t) =>
          t.threadId === thread.threadId
            ? { ...t, isUnread: false, unreadCount: 0, hasReplyToUser: false }
            : t
        )
      );
      setTotalUnread((prev) => Math.max(0, prev - thread.unreadCount));
      if (thread.hasReplyToUser) {
        setThreadsWithReplies((prev) => Math.max(0, prev - 1));
      }

      // Use thread-level mark-as-read
      conversationService
        .markThreadAsRead(spaceId, thread.threadId, thread.threadType)
        .catch((err) => {
          console.error('Error marking thread as read:', err);
        });
    }

    // Navigate to the appropriate location
    const baseUrl = `/spaces/${spaceId}/journals/${thread.journalId}`;

    if (thread.threadType === 'highlight') {
      navigate(`${baseUrl}?highlightId=${thread.threadId}`);
    } else {
      navigate(`${baseUrl}?openJournalComments=true`);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, thread: ConversationThread) => {
    e.stopPropagation();
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === thread.threadId
          ? { ...t, isUnread: false, unreadCount: 0, hasReplyToUser: false }
          : t
      )
    );
    setTotalUnread((prev) => Math.max(0, prev - thread.unreadCount));
    if (thread.hasReplyToUser) {
      setThreadsWithReplies((prev) => Math.max(0, prev - 1));
    }

    try {
      await conversationService.markThreadAsRead(spaceId, thread.threadId, thread.threadType);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead || totalUnread === 0) return;

    setIsMarkingAllRead(true);
    try {
      await conversationService.markAllAsRead(spaceId);
      setThreads((prev) =>
        prev.map((t) => ({ ...t, isUnread: false, unreadCount: 0, hasReplyToUser: false }))
      );
      setTotalUnread(0);
      setThreadsWithReplies(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleRefresh = () => {
    fetchThreads(false);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
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
              disabled={isMarkingAllRead}
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
        </div>
      </div>

      {/* Search and Filters */}
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
            value={filterParticipation}
            onChange={(e) => setFilterParticipation(e.target.value as 'all' | 'participated')}
            className="conversations-filter-select"
          >
            <option value="all">All threads</option>
            <option value="participated">My threads</option>
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
          <MessageSquare size={48} strokeWidth={1} />
          {searchQuery || filterType || filterParticipation !== 'all' ? (
            <>
              <h3>No matching conversations</h3>
              <p>Try adjusting your filters or search query.</p>
              <button className="conversations-empty-btn" onClick={clearSearch}>
                Clear filters
              </button>
            </>
          ) : (
            <>
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
            </div>
          )}

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
        </>
      )}
    </div>
  );
};

export default ConversationsTab;
