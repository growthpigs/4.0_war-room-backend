import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, FeedItem } from "./types";
import { feedQuerySchema } from "./validation";
import { generateMockFeed } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface FeedQuery {
  keyword?: Query<string>;
  types?: Query<string>;
  limit?: Query<number>;
  date_from?: Query<string>;
  date_to?: Query<string>;
}

// Retrieves activity feed from Mentionlytics API.
export const feed = api<FeedQuery, MentionlyticsResponse<FeedItem[]>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/feed" },
  async (params) => {
    try {
      // Parse types parameter (comma-separated string to array)
      const typesArray = params.types ? params.types.split(',').map(t => t.trim()) : ['mention'];
      const validationParams = { ...params, types: typesArray };

      // Validate input parameters
      const { error, value } = feedQuerySchema.validate(validationParams);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('feed', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<FeedItem[]>(cacheKey);
      if (cachedData) {
        log.info("Returning cached feed data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockFeed(validatedParams.limit || 20);
        cache.set(cacheKey, mockData, 2 * 60 * 1000);
        
        return {
          data: mockData,
          success: true,
          message: "Mock data returned (API token not configured)"
        };
      }

      try {
        // Make API request
        const apiResponse = await mentionlyticsClient.makeRequest<{
          data: Array<{
            id: string;
            type: 'mention' | 'trend' | 'influencer' | 'alert';
            content: string;
            description: string;
            timestamp: string;
            created_at: string;
            engagement_metrics: {
              likes: number;
              shares: number;
              comments: number;
              total: number;
            };
            metadata: any;
          }>;
        }>('feed', {
          q: validatedParams.keyword,
          types: validatedParams.types.join(','),
          limit: validatedParams.limit,
          from: validatedParams.date_from,
          to: validatedParams.date_to
        });

        // Transform API response to our format
        const feedData: FeedItem[] = apiResponse.data.map(item => ({
          type: item.type,
          content: item.content || item.description,
          timestamp: item.timestamp || item.created_at,
          engagement: item.engagement_metrics?.total || 0
        }));

        // Cache the result
        cache.set(cacheKey, feedData);

        log.info("Successfully retrieved feed data from Mentionlytics API", {
          items: feedData.length,
          keyword: validatedParams.keyword,
          types: validatedParams.types
        });

        return {
          data: feedData,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockFeed(validatedParams.limit || 20);
        cache.set(cacheKey, mockData, 2 * 60 * 1000);

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in feed endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve feed data");
    }
  }
);
