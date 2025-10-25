/**
 * Activity tracking types for space activity feed.
 */

export type ActivityType =
  | 'journal_created'
  | 'journal_updated'
  | 'journal_deleted'
  | 'highlight_created'
  | 'highlight_deleted'
  | 'comment_created'
  | 'member_joined';

export interface Activity {
  activityId: string;
  spaceId: string;
  activityType: ActivityType;
  userId: string;
  userName: string;
  timestamp: string;
  metadata: {
    journal_id?: string;
    journal_title?: string;
    content_preview?: string;
    template_id?: string;
    highlight_id?: string;
    highlighted_text?: string;
    comment_id?: string;
    comment_text?: string;
    member_id?: string;
    member_name?: string;
  };
}

export interface ActivityListResponse {
  activities: Activity[];
  nextToken?: string;
}
