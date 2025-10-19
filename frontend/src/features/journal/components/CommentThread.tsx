/**
 * CommentThread Component
 *
 * Displays a highlight with its associated comment thread.
 * Supports nested replies and @mentions.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Highlight, Comment } from '../types/highlight.types';
import { HIGHLIGHT_COLORS } from '../types/highlight.types';

interface CommentThreadProps {
  highlight: Highlight;
  comments: Comment[];
  spaceMembers: Array<{ id: string; name: string }>;
  currentUserId: string;
  onAddComment: (text: string, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  highlight,
  comments,
  spaceMembers,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onClose,
}) => {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [commentText]);

  // Handle @mention detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCommentText(text);

    // Check for @ symbol at cursor position
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
    setMentionSearch('');
  };

  // Handle mention selection
  const handleMentionSelect = (memberName: string) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = commentText.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = commentText.substring(cursorPos);

    const newText =
      commentText.substring(0, lastAtIndex) +
      `@${memberName} ` +
      textAfterCursor;

    setCommentText(newText);
    setShowMentions(false);
    setMentionSearch('');
    textareaRef.current.focus();
  };

  // Submit comment
  const handleSubmit = () => {
    if (!commentText.trim()) return;

    onAddComment(commentText, replyToId || undefined);
    setCommentText('');
    setReplyToId(null);
  };

  // Filter members for mention autocomplete
  const filteredMembers = spaceMembers.filter((member) =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Organize comments by parent/child relationship
  const rootComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId);

  // Render a single comment
  const renderComment = (comment: Comment, depth: number = 0) => {
    const isAuthor = comment.author === currentUserId;
    const replies = getReplies(comment.id);

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Comment content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {comment.authorName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                  {new Date(comment.createdAt).toLocaleTimeString()}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-gray-400 italic">(edited)</span>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.text}
              </p>
            </div>

            {/* Comment actions */}
            <div className="flex gap-4 mt-1 ml-1">
              <button
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => setReplyToId(comment.id)}
              >
                Reply
              </button>
              {isAuthor && (
                <button
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={() => onDeleteComment(comment.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col z-40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Comments</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Highlighted text preview */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-xs text-gray-500 mb-1">Highlighted text:</p>
        <p
          className="text-sm p-2 rounded"
          style={{ backgroundColor: highlight.color || HIGHLIGHT_COLORS.yellow }}
        >
          {highlight.highlightedText}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          By {highlight.createdByName} on{' '}
          {new Date(highlight.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div>{rootComments.map((comment) => renderComment(comment))}</div>
        )}
      </div>

      {/* Comment input */}
      <div className="border-t border-gray-200 p-4 relative">
        {replyToId && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <span>Replying to comment</span>
            <button
              onClick={() => setReplyToId(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Mention autocomplete */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={() => handleMentionSelect(member.name)}
              >
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                {member.name}
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={commentText}
          onChange={handleTextChange}
          placeholder="Add a comment... (use @ to mention)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => {
              setCommentText('');
              setReplyToId(null);
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={!commentText.trim()}
            className="px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
};
