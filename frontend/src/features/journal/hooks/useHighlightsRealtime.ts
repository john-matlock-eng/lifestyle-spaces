/**
 * Enhanced highlights hook with real-time WebSocket updates and optimistic UI
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { fetchAuthSession } from '@aws-amplify/auth';
import type {
  Highlight,
  Comment,
  CreateHighlightRequest,
  CreateCommentRequest,
  HighlightSelection,
  PresenceUser,
} from '../types/highlight.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Get authentication headers from AWS Amplify session
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    if (accessToken) {
      return {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };
    }
  } catch (error) {
    console.error('Failed to get auth session:', error);
  }

  return {
    'Content-Type': 'application/json',
  };
};

interface PendingAction {
  id: string;
  type: 'CREATE_HIGHLIGHT' | 'UPDATE_HIGHLIGHT' | 'DELETE_HIGHLIGHT' | 'CREATE_COMMENT' | 'DELETE_COMMENT';
  timestamp: number;
}

export const useHighlightsRealtime = (spaceId: string, journalEntryId: string) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [activeUsers] = useState<PresenceUser[]>([]); // Empty - no real-time presence
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  // WebSocket disabled for now - real-time updates not needed
  // Users can refresh to see new highlights/comments from others
  const isConnected = false;
  const isConnecting = false;
  const wsError: string | null = null;
  const reconnect = useCallback(() => {
    // No-op - WebSocket not enabled
  }, []);

  // Fetch highlights for journal entry
  const fetchHighlights = useCallback(async () => {
    if (!spaceId || !journalEntryId) return;

    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await axios.get<Highlight[]>(
        `${API_BASE_URL}/api/highlights/spaces/${spaceId}/journals/${journalEntryId}/highlights`,
        { headers }
      );

      setHighlights(response.data);
    } catch (err) {
      console.error('Error fetching highlights:', err);
      setError('Failed to load highlights');
    } finally {
      setLoading(false);
    }
  }, [spaceId, journalEntryId]);

  // Fetch comments for a specific highlight
  const fetchComments = useCallback(
    async (highlightId: string) => {
      try {
        const headers = await getAuthHeaders();
        const response = await axios.get<Comment[]>(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/highlights/${highlightId}/comments`,
          { headers }
        );

        setComments((prev) => ({
          ...prev,
          [highlightId]: response.data,
        }));
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
      }
    },
    [spaceId]
  );

  // Create a new highlight with optimistic update
  const createHighlight = useCallback(
    async (selection: HighlightSelection, color: string = 'yellow') => {
      const tempId = `temp-${Date.now()}`;

      try {
        // Optimistic update
        const optimisticHighlight: Highlight = {
          id: tempId,
          journalEntryId,
          spaceId,
          highlightedText: selection.text,
          textRange: selection.range,
          color,
          createdBy: 'me', // Will be replaced by server response
          createdByName: 'Me',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          commentCount: 0,
        };

        setHighlights((prev) => [...prev, optimisticHighlight]);
        setPendingActions((prev) => [
          ...prev,
          { id: tempId, type: 'CREATE_HIGHLIGHT', timestamp: Date.now() },
        ]);

        const headers = await getAuthHeaders();
        const request: CreateHighlightRequest = {
          highlightedText: selection.text,
          textRange: selection.range,
          color,
        };

        const response = await axios.post<Highlight>(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/journals/${journalEntryId}/highlights`,
          request,
          { headers }
        );

        // Replace optimistic with real data
        setHighlights((prev) =>
          prev.map((h) => (h.id === tempId ? response.data : h))
        );

        return response.data;
      } catch (err) {
        console.error('Error creating highlight:', err);
        // Rollback optimistic update
        setHighlights((prev) => prev.filter((h) => h.id !== tempId));
        setPendingActions((prev) =>
          prev.filter((a) => !(a.type === 'CREATE_HIGHLIGHT' && a.id === tempId))
        );
        setError('Failed to create highlight');
        return null;
      }
    },
    [spaceId, journalEntryId]
  );

  // Delete a highlight with optimistic update
  const deleteHighlight = useCallback(
    async (highlightId: string) => {
      try {
        // Optimistic update
        setHighlights((prev) => prev.map((h) =>
          h.id === highlightId ? { ...h, _isDeleting: true } as Highlight & { _isDeleting?: boolean } : h
        ));
        setPendingActions((prev) => [
          ...prev,
          { id: highlightId, type: 'DELETE_HIGHLIGHT', timestamp: Date.now() },
        ]);

        const headers = await getAuthHeaders();
        await axios.delete(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/highlights/${highlightId}`,
          { headers }
        );

        // Remove from state
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
        setComments((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [highlightId]: _, ...rest } = prev;
          return rest;
        });
      } catch (err) {
        console.error('Error deleting highlight:', err);
        // Rollback optimistic update
        setHighlights((prev) => prev.map((h) =>
          h.id === highlightId ? { ...h, _isDeleting: undefined } as Highlight & { _isDeleting?: boolean } : h
        ));
        setPendingActions((prev) =>
          prev.filter((a) => !(a.type === 'DELETE_HIGHLIGHT' && a.id === highlightId))
        );
        setError('Failed to delete highlight');
      }
    },
    [spaceId]
  );

  // Update a highlight's text selection with optimistic update
  const updateHighlight = useCallback(
    async (highlightId: string, selection: HighlightSelection) => {
      // Store original highlight for rollback
      let originalHighlight: Highlight | null = null;

      try {
        // Optimistic update
        setHighlights((prev) => prev.map((h) => {
          if (h.id === highlightId) {
            originalHighlight = h;
            return {
              ...h,
              highlightedText: selection.text,
              textRange: selection.range,
              updatedAt: new Date().toISOString(),
            };
          }
          return h;
        }));
        setPendingActions((prev) => [
          ...prev,
          { id: highlightId, type: 'UPDATE_HIGHLIGHT', timestamp: Date.now() },
        ]);

        const headers = await getAuthHeaders();
        const request = {
          highlightedText: selection.text,
          textRange: selection.range,
        };

        const response = await axios.put<Highlight>(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/highlights/${highlightId}`,
          request,
          { headers }
        );

        // Replace optimistic with real data from server
        setHighlights((prev) =>
          prev.map((h) => (h.id === highlightId ? response.data : h))
        );
        setPendingActions((prev) =>
          prev.filter((a) => !(a.type === 'UPDATE_HIGHLIGHT' && a.id === highlightId))
        );

        return response.data;
      } catch (err) {
        console.error('Error updating highlight:', err);
        // Rollback optimistic update
        if (originalHighlight) {
          setHighlights((prev) =>
            prev.map((h) => (h.id === highlightId ? originalHighlight : h))
          );
        }
        setPendingActions((prev) =>
          prev.filter((a) => !(a.type === 'UPDATE_HIGHLIGHT' && a.id === highlightId))
        );
        setError('Failed to update highlight');
        return null;
      }
    },
    [spaceId]
  );

  // Create a comment on a highlight
  const createComment = useCallback(
    async (highlightId: string, text: string, parentCommentId?: string) => {
      const tempId = `temp-${Date.now()}`;

      try {
        // Extract mentions from text
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }

        // Optimistic update
        const optimisticComment: Comment = {
          id: tempId,
          highlightId,
          spaceId,
          text,
          author: 'me',
          authorName: 'Me',
          parentCommentId,
          mentions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: false,
        };

        setComments((prev) => ({
          ...prev,
          [highlightId]: [...(prev[highlightId] || []), optimisticComment],
        }));
        setPendingActions((prev) => [
          ...prev,
          { id: tempId, type: 'CREATE_COMMENT', timestamp: Date.now() },
        ]);

        const headers = await getAuthHeaders();
        const request: CreateCommentRequest = {
          text,
          parentCommentId,
          mentions,
        };

        const response = await axios.post<Comment>(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/highlights/${highlightId}/comments`,
          request,
          { headers }
        );

        // Replace optimistic with real data
        setComments((prev) => ({
          ...prev,
          [highlightId]: (prev[highlightId] || []).map((c) =>
            c.id === tempId ? response.data : c
          ),
        }));

        return response.data;
      } catch (err) {
        console.error('Error creating comment:', err);
        // Rollback optimistic update
        setComments((prev) => ({
          ...prev,
          [highlightId]: (prev[highlightId] || []).filter((c) => c.id !== tempId),
        }));
        setPendingActions((prev) =>
          prev.filter((a) => !(a.type === 'CREATE_COMMENT' && a.id === tempId))
        );
        setError('Failed to create comment');
        return null;
      }
    },
    [spaceId]
  );

  // Delete a comment
  const deleteComment = useCallback(
    async (highlightId: string, commentId: string) => {
      try {
        // Optimistic update
        setPendingActions((prev) => [
          ...prev,
          { id: commentId, type: 'DELETE_COMMENT', timestamp: Date.now() },
        ]);

        const headers = await getAuthHeaders();
        await axios.delete(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/comments/${commentId}`,
          { headers }
        );

        // Remove from state
        setComments((prev) => ({
          ...prev,
          [highlightId]: (prev[highlightId] || []).filter((c) => c.id !== commentId),
        }));
      } catch (err) {
        console.error('Error deleting comment:', err);
        setPendingActions((prev) =>
          prev.filter((a) => !(a.type === 'DELETE_COMMENT' && a.id === commentId))
        );
        setError('Failed to delete comment');
      }
    },
    [spaceId]
  );

  // Notify typing status (no-op without WebSocket)
  const notifyTyping = useCallback(() => {
    // No-op - WebSocket not enabled
  }, []);

  // Fetch highlights on mount
  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  return {
    highlights,
    comments,
    activeUsers,
    loading,
    error: error || wsError,
    isConnected,
    isConnecting,
    pendingActions,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    createComment,
    deleteComment,
    fetchComments,
    refreshHighlights: fetchHighlights,
    notifyTyping,
    reconnect,
  };
};
