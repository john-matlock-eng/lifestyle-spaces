/**
 * Activity service for fetching space activities.
 */

import { Activity, ActivityListResponse } from '../types/activity';
import apiClient from '../lib/api';

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

    const response = await apiClient.get<ActivityListResponse>(
      `/spaces/${spaceId}/activities?${params.toString()}`
    );

    return response.data;
  },
};
