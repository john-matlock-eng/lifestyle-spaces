/**
 * PublicScheduleView component for viewing shared schedules without authentication
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import type { Schedule } from '../types/schedule.types';
import * as scheduleApi from '../services/scheduleApi';
import { WeekView } from './WeekView';
import { ScheduleLoadingSkeleton } from './ScheduleLoadingSkeleton';

/**
 * Public view for shared schedules
 * - No authentication required
 * - Read-only view
 * - CTA for creating own schedule
 */
export const PublicScheduleView: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) {
      loadSharedSchedule(shareToken);
    } else {
      setError('Invalid share link');
      setLoading(false);
    }
  }, [shareToken]);

  const loadSharedSchedule = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await scheduleApi.getSharedSchedule(token);
      setSchedule(data);
    } catch (err) {
      if (err instanceof Error) {
        // Check for 404 or expired link
        setError('Schedule not found or link has expired');
      } else {
        setError('Failed to load shared schedule');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOwn = () => {
    navigate('/signup');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <ScheduleLoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This schedule may have been deleted or the link may have expired.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {schedule.templateName || 'Shared Schedule'}
                </h1>
                <p className="text-sm text-gray-600">
                  Week of {formatDate(schedule.weekStarting)}
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateOwn}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Create Your Own
            </button>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium mb-1">Viewing a shared schedule</p>
              <p className="text-blue-100">
                This is a read-only view. Create your own account to build custom schedules.
              </p>
            </div>
            {schedule.sharingSettings && schedule.sharingSettings.viewCount > 0 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm font-medium">Views</p>
                <p className="text-2xl font-bold">{schedule.sharingSettings.viewCount}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {schedule.notes && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <WeekView
            scheduleData={schedule.scheduleData}
            readOnly={true}
          />
        </div>

        {/* CTA Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Want to create your own schedule?
          </h2>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Sign up for Lifestyle Spaces to create, customize, and share your own schedules with
            friends, family, or roommates. It's free to get started!
          </p>
          <button
            onClick={handleCreateOwn}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>
            Powered by Lifestyle Spaces - Your personal space management platform
          </p>
        </div>
      </div>
    </div>
  );
};
