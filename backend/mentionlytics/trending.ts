import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, TrendingTopic } from "./types";
import { trendingQuerySchema } from "./validation";
import { generateMockTrending } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface TrendingQuery {
  keyword?: Query<string>;
  platform?: Query<string>;
  limit?: Query<number>;
  period?: Query<string>;
  min_mentions?: Query<number>;
}

// Retrieves trending topics from Mentionlytics API.
export const trending = api<TrendingQuery, MentionlyticsResponse<TrendingTopic[]>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/trending" },
  async (params) => {
    try {
      // Validate input parameters
      const { error, value } = trendingQuerySchema.validate(params);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('trending', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<TrendingTopic[]>(cacheKey);
      if (cachedData) {
        log.info("Returning cached trending data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockTrending(validatedParams.limit || 10);
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
            topic: string;
            keyword: string;
            mentions_count: number;
            growth_rate: number;
            avg_sentiment: number;
            trend: 'rising' | 'falling' | 'stable';
          }>;
        }>('trending', {
          q: validatedParams.keyword,
          source: validatedParams.platform,
          limit: validatedParams.limit,
          period: validatedParams.period,
          min_mentions: validatedParams.min_mentions
        });

        // Transform API response to our format
        const trendingData: TrendingTopic[] = apiResponse.data.map(item => ({
          topic: item.topic || item.keyword,
          mentions: item.mentions_count,
          growth_rate: item.growth_rate,
          sentiment: item.avg_sentiment
        }));

        // Cache the result
        cache.set(cacheKey, trendingData);

        log.info("Successfully retrieved trending data from Mentionlytics API", {
          topics: trendingData.length,
          keyword: validatedParams.keyword
        });

        return {
          data: trendingData,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockTrending(validatedParams.limit || 10);
        cache.set(cacheKey, mockData, 2 * 60 * 1000);

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in trending endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve trending data");
    }
  }
);
