import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, Influencer } from "./types";
import { influencersQuerySchema } from "./validation";
import { generateMockInfluencers } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface InfluencersQuery {
  keyword?: Query<string>;
  platform?: Query<string>;
  min_followers?: Query<number>;
  limit?: Query<number>;
  date_from?: Query<string>;
  date_to?: Query<string>;
}

// Retrieves influencer data from Mentionlytics API.
export const influencers = api<InfluencersQuery, MentionlyticsResponse<Influencer[]>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/influencers" },
  async (params) => {
    try {
      // Validate input parameters
      const { error, value } = influencersQuerySchema.validate(params);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('influencers', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<Influencer[]>(cacheKey);
      if (cachedData) {
        log.info("Returning cached influencers data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockInfluencers(validatedParams.limit || 10);
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
            name: string;
            username: string;
            followers_count: number;
            engagement_rate: number;
            platform: string;
            influence_score: number;
            verified: boolean;
          }>;
        }>('influencers', {
          q: validatedParams.keyword,
          source: validatedParams.platform,
          min_followers: validatedParams.min_followers,
          limit: validatedParams.limit,
          from: validatedParams.date_from,
          to: validatedParams.date_to
        });

        // Transform API response to our format
        const influencersData: Influencer[] = apiResponse.data.map(item => ({
          name: item.name || item.username,
          followers: item.followers_count,
          engagement_rate: item.engagement_rate,
          platform: item.platform.toLowerCase(),
          influence_score: item.influence_score
        }));

        // Cache the result
        cache.set(cacheKey, influencersData);

        log.info("Successfully retrieved influencers data from Mentionlytics API", {
          count: influencersData.length,
          keyword: validatedParams.keyword
        });

        return {
          data: influencersData,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockInfluencers(validatedParams.limit || 10);
        cache.set(cacheKey, mockData, 2 * 60 * 1000);

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in influencers endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve influencers data");
    }
  }
);
