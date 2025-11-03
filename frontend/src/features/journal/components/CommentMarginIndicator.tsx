/**
 * CommentMarginIndicator Component
 *
 * Displays comment count indicators in the margin next to highlighted text.
 * Shows a clickable bubble with the number of comments for each highlight.
 */

import React from 'react';

interface CommentMarginIndicatorProps {
  commentCount: number;
  position: number; // Top position in pixels
  isActive: boolean;
  onClick: () => void;
}

export const CommentMarginIndicator: React.FC<CommentMarginIndicatorProps> = ({
  commentCount,
  position,
  isActive,
  onClick,
}) => {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: `${position}px`,
        right: '-40px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: isActive
          ? (isDarkMode ? '#3b82f6' : '#3b82f6')
          : (isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'),
        color: isActive ? '#ffffff' : (isDarkMode ? '#60a5fa' : '#1e40af'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: `2px solid ${
          isActive
            ? (isDarkMode ? '#2563eb' : '#2563eb')
            : (isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)')
        }`,
        boxShadow: isActive
          ? '0 4px 12px rgba(59, 130, 246, 0.4)'
          : '0 2px 6px rgba(59, 130, 246, 0.2)',
        zIndex: 100,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}
    >
      {commentCount}
    </div>
  );
};
