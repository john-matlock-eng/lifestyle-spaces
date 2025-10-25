/**
 * Activity service for fetching space activities.
 */

import { ActivityListResponse } from '../types/activity';
import { apiService } from './api';

export const activityService = {
  /**
   * Get activities for a space.
   */
  async getSpaceActivities(
    spaceId: string,
    limit: number = 50,
    nextToken?: string
  ): Promise<ActivityListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(nextToken && { next_token: nextToken }),
    });

    return apiService.get<ActivityListResponse>(
      `/spaces/${spaceId}/activities?${params.toString()}`
    );
  },
};
