/**
 * Activity Feed Component
 *
 * Displays recent activities in a space including:
 * - Journal entries created/updated/deleted
 * - Highlights created/deleted
 * - Comments created
 * - Member joins
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { Activity, ActivityType } from '../types/activity';
import { activityService } from '../services/activityService';
import './ActivityFeed.css';

interface ActivityFeedProps {
  spaceId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ spaceId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityService.getSpaceActivities(spaceId, 50);
      setActivities(response.activities);
      setNextToken(response.nextToken);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const loadMore = async () => {
    if (!nextToken) return;

    try {
      const response = await activityService.getSpaceActivities(
        spaceId,
        50,
        nextToken
      );
      setActivities([...activities, ...response.activities]);
      setNextToken(response.nextToken);
    } catch (err) {
      console.error('Failed to load more activities:', err);
    }
  };

  const getActivityIcon = (type: ActivityType): string => {
    switch (type) {
      case 'journal_created':
        return '📝';
      case 'journal_updated':
        return '✏️';
      case 'journal_deleted':
        return '🗑️';
      case 'highlight_created':
        return '✨';
      case 'highlight_deleted':
        return '💨';
      case 'comment_created':
        return '💬';
      case 'member_joined':
        return '👋';
      default:
        return '📌';
    }
  };

  const getActivityMessage = (activity: Activity): string => {
    const { activityType, userName, metadata } = activity;

    switch (activityType) {
      case 'journal_created':
        return `${userName} created journal "${metadata.journal_title}"`;
      case 'journal_updated':
        return `${userName} updated journal "${metadata.journal_title}"`;
      case 'journal_deleted':
        return `${userName} deleted journal "${metadata.journal_title}"`;
      case 'highlight_created':
        return `${userName} highlighted text in "${metadata.journal_title}"`;
      case 'highlight_deleted':
        return `${userName} removed a highlight from "${metadata.journal_title}"`;
      case 'comment_created':
        return `${userName} commented on "${metadata.journal_title}"`;
      case 'member_joined':
        return `${metadata.member_name || userName} joined the space`;
      default:
        return `${userName} performed an action`;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const groupActivitiesByDate = (
    activities: Activity[]
  ): Map<string, Activity[]> => {
    const grouped = new Map<string, Activity[]>();
    const now = new Date();

    activities.forEach((activity) => {
      const date = new Date(activity.timestamp);
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / 86400000
      );

      let dateKey: string;
      if (diffDays === 0) {
        dateKey = 'Today';
      } else if (diffDays === 1) {
        dateKey = 'Yesterday';
      } else if (diffDays < 7) {
        dateKey = 'This Week';
      } else {
        dateKey = date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      }

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(activity);
    });

    return grouped;
  };

  if (loading && activities.length === 0) {
    return (
      <div className="activity-feed">
        <div className="activity-feed__loading">
          <div className="spinner"></div>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-feed">
        <div className="activity-feed__error">
          <p>{error}</p>
          <button onClick={loadActivities} className="btn btn--secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-feed">
        <div className="activity-feed__empty">
          <div className="activity-feed__empty-icon">📋</div>
          <h3>No Activity Yet</h3>
          <p>
            When members create journals, add highlights, or post comments,
            you'll see them here.
          </p>
        </div>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className="activity-feed">
      <div className="activity-feed__header">
        <h2>Recent Activity</h2>
        <button
          onClick={loadActivities}
          className="activity-feed__refresh"
          title="Refresh activities"
        >
          ↻
        </button>
      </div>

      <div className="activity-feed__content">
        {Array.from(groupedActivities.entries()).map(([dateKey, items]) => (
          <div key={dateKey} className="activity-feed__date-group">
            <h3 className="activity-feed__date-header">{dateKey}</h3>
            <div className="activity-feed__items">
              {items.map((activity) => (
                <div key={activity.activityId} className="activity-feed__item">
                  <div className="activity-feed__icon">
                    {getActivityIcon(activity.activityType)}
                  </div>
                  <div className="activity-feed__details">
                    <p className="activity-feed__message">
                      {getActivityMessage(activity)}
                    </p>
                    {activity.metadata.content_preview && (
                      <p className="activity-feed__preview">
                        {activity.metadata.content_preview}
                      </p>
                    )}
                    {activity.metadata.highlighted_text && (
                      <p className="activity-feed__preview activity-feed__preview--highlight">
                        "{activity.metadata.highlighted_text}"
                      </p>
                    )}
                    {activity.metadata.comment_text && (
                      <p className="activity-feed__preview">
                        "{activity.metadata.comment_text}"
                      </p>
                    )}
                    <span className="activity-feed__timestamp">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {nextToken && (
        <div className="activity-feed__footer">
          <button
            onClick={loadMore}
            className="btn btn--secondary activity-feed__load-more"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
