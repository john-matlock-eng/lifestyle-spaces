/**
 * PresenceAvatars Component
 *
 * Displays active viewers with avatars and activity indicators
 */

import React from 'react';
import type { PresenceUser } from '../types/highlight.types';

interface PresenceAvatarsProps {
  activeUsers: PresenceUser[];
  maxVisible?: number;
  className?: string;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  activeUsers,
  maxVisible = 5,
  className = '',
}) => {
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  // Find users who are typing
  const typingUsers = activeUsers.filter(user => {
    // Check if user was active in the last 5 seconds
    const lastActivity = new Date(user.lastActivity);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastActivity.getTime()) / 1000;
    return diffSeconds < 5;
  });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar Stack */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: user.color }}
            title={user.userName}
          >
            <span className="text-xs font-semibold text-white">
              {user.userName.charAt(0).toUpperCase()}
            </span>

            {/* Active indicator (pulsing dot) */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            </span>
          </div>
        ))}

        {/* Hidden count badge */}
        {hiddenCount > 0 && (
          <div
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-xs font-semibold text-gray-600"
            title={`${hiddenCount} more viewer${hiddenCount > 1 ? 's' : ''}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <span className="text-xs">
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing...`
              : `${typingUsers.length} people are typing...`}
          </span>
        </div>
      )}

      {/* Viewer count */}
      {activeUsers.length > 0 && !typingUsers.length && (
        <span className="text-xs text-gray-500">
          {activeUsers.length} {activeUsers.length === 1 ? 'viewer' : 'viewers'}
        </span>
      )}
    </div>
  );
};
