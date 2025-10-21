/**
 * Custom hook for managing journal highlights and comments
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

export const useHighlights = (spaceId: string, journalEntryId: string) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Create a new highlight
  const createHighlight = useCallback(
    async (selection: HighlightSelection, color: string = 'yellow') => {
      try {
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

        setHighlights((prev) => [...prev, response.data]);
        return response.data;
      } catch (err) {
        console.error('Error creating highlight:', err);
        setError('Failed to create highlight');
        return null;
      }
    },
    [spaceId, journalEntryId]
  );

  // Delete a highlight
  const deleteHighlight = useCallback(
    async (highlightId: string) => {
      try {
        const headers = await getAuthHeaders();
        await axios.delete(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/highlights/${highlightId}`,
          { headers }
        );

        setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
        setComments((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [highlightId]: _, ...rest } = prev;
          return rest;
        });
      } catch (err) {
        console.error('Error deleting highlight:', err);
        setError('Failed to delete highlight');
      }
    },
    [spaceId]
  );

  // Create a comment on a highlight
  const createComment = useCallback(
    async (highlightId: string, text: string, parentCommentId?: string) => {
      try {
        const headers = await getAuthHeaders();

        // Extract mentions from text
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }

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

        setComments((prev) => ({
          ...prev,
          [highlightId]: [...(prev[highlightId] || []), response.data],
        }));

        // Update highlight comment count
        setHighlights((prev) =>
          prev.map((h) =>
            h.id === highlightId ? { ...h, commentCount: h.commentCount + 1 } : h
          )
        );

        return response.data;
      } catch (err) {
        console.error('Error creating comment:', err);
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
        const headers = await getAuthHeaders();
        await axios.delete(
          `${API_BASE_URL}/api/highlights/spaces/${spaceId}/comments/${commentId}`,
          { headers }
        );

        setComments((prev) => ({
          ...prev,
          [highlightId]: (prev[highlightId] || []).filter((c) => c.id !== commentId),
        }));

        // Update highlight comment count
        setHighlights((prev) =>
          prev.map((h) =>
            h.id === highlightId ? { ...h, commentCount: Math.max(0, h.commentCount - 1) } : h
          )
        );
      } catch (err) {
        console.error('Error deleting comment:', err);
        setError('Failed to delete comment');
      }
    },
    [spaceId]
  );

  // Fetch highlights on mount
  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  return {
    highlights,
    comments,
    loading,
    error,
    createHighlight,
    deleteHighlight,
    createComment,
    deleteComment,
    fetchComments,
    refreshHighlights: fetchHighlights,
  };
};
