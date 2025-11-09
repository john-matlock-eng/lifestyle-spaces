/**
 * ScheduleLoadingSkeleton component for loading states
 */

import React from 'react';

/**
 * Animated skeleton loader for schedule components
 * Shows placeholder UI while data is loading
 */
export const ScheduleLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Week Grid Skeleton */}
      <div className="border rounded-lg overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b bg-gray-50">
          <div className="p-2 border-r">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-2 border-r last:border-r-0">
              <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {Array.from({ length: 12 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-8 border-b last:border-b-0">
            {/* Time Column */}
            <div className="p-2 border-r bg-gray-50">
              <div className="h-3 bg-gray-200 rounded w-10"></div>
            </div>

            {/* Day Columns */}
            {Array.from({ length: 7 }).map((_, colIndex) => (
              <div key={colIndex} className="p-2 border-r last:border-r-0 min-h-[60px]">
                {/* Randomly show some block skeletons */}
                {(rowIndex + colIndex) % 3 === 0 && (
                  <div className="h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Notes Skeleton */}
      <div className="bg-white rounded-lg border p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  );
};

/**
 * Compact skeleton loader for list items
 */
export const ScheduleListItemSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-40"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
};

/**
 * Minimal skeleton for inline loading
 */
export const ScheduleInlineSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 animate-pulse py-2">
      <div className="h-4 w-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded flex-1"></div>
    </div>
  );
};
