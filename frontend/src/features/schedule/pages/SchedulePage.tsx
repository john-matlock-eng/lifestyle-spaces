/**
 * SchedulePage - Main page for schedule feature
 * Wraps ScheduleTemplate component with error boundary
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../stores/authStore';
import { ScheduleTemplate } from '../components/ScheduleTemplate';
import { ScheduleErrorBoundary } from '../components/ScheduleErrorBoundary';

export const SchedulePage: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { user } = useAuth();

  if (!spaceId) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">No space selected</p>
      </div>
    );
  }

  if (!user?.userId) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">You must be logged in to view schedules</p>
      </div>
    );
  }

  return (
    <ScheduleErrorBoundary>
      <ScheduleTemplate
        spaceId={spaceId}
        userId={user.userId}
        onScheduleCreated={(scheduleId) => {
          console.log('Schedule created:', scheduleId);
        }}
        onScheduleUpdated={(scheduleId) => {
          console.log('Schedule updated:', scheduleId);
        }}
      />
    </ScheduleErrorBoundary>
  );
};
