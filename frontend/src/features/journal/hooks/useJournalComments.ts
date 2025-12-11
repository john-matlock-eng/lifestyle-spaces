/**
 * Custom hook for managing journal-level comments (Conversations feature)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api';
import type {
  JournalComment,
  JournalCommentListResponse,
  CreateJournalCommentRequest,
  UpdateJournalCommentRequest,
} from '../types/journalComment.types';

export interface UseJournalCommentsReturn {
  comments: JournalComment[];
  loading: boolean;
  error: string | null;
  commentCount: number;
  createComment: (text: string, parentCommentId?: string) => Promise<JournalComment | null>;
  updateComment: (commentId: string, text: string, mentions?: string[]) => Promise<JournalComment | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const useJournalComments = (
  spaceId: string,
  journalId: string
): UseJournalCommentsReturn => {
  const [comments, setComments] = useState<JournalComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments for journal
  const fetchComments = useCallback(async () => {
    if (!spaceId || !journalId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get<JournalCommentListResponse>(
        `/api/spaces/${spaceId}/journals/${journalId}/comments`
      );

      setComments(response.comments);
    } catch (err) {
      console.error('Error fetching journal comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [spaceId, journalId]);

  // Create a new comment
  const createComment = useCallback(
    async (text: string, parentCommentId?: string): Promise<JournalComment | null> => {
      try {
        setError(null);

        // Extract mentions from text
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }

        const request: CreateJournalCommentRequest = {
          text,
          parentCommentId,
          mentions,
        };

        const response = await apiService.post<JournalComment>(
          `/api/spaces/${spaceId}/journals/${journalId}/comments`,
          request
        );

        setComments((prev) => [...prev, response]);
        return response;
      } catch (err) {
        console.error('Error creating journal comment:', err);
        setError('Failed to create comment');
        return null;
      }
    },
    [spaceId, journalId]
  );

  // Update a comment
  const updateComment = useCallback(
    async (
      commentId: string,
      text: string,
      mentions?: string[]
    ): Promise<JournalComment | null> => {
      try {
        setError(null);

        const request: UpdateJournalCommentRequest = {
          text,
          mentions: mentions || [],
        };

        const response = await apiService.put<JournalComment>(
          `/api/spaces/${spaceId}/journal-comments/${commentId}`,
          request
        );

        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? response : c))
        );

        return response;
      } catch (err) {
        console.error('Error updating journal comment:', err);
        setError('Failed to update comment');
        return null;
      }
    },
    [spaceId]
  );

  // Delete a comment
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        setError(null);

        await apiService.delete(
          `/api/spaces/${spaceId}/journal-comments/${commentId}`
        );

        setComments((prev) => prev.filter((c) => c.id !== commentId));
        return true;
      } catch (err) {
        console.error('Error deleting journal comment:', err);
        setError('Failed to delete comment');
        return false;
      }
    },
    [spaceId]
  );

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    commentCount: comments.length,
    createComment,
    updateComment,
    deleteComment,
    refresh: fetchComments,
  };
};

export default useJournalComments;
