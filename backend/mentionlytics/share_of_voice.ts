import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, ShareOfVoice } from "./types";
import { shareOfVoiceQuerySchema } from "./validation";
import { generateMockShareOfVoice } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface ShareOfVoiceQuery {
  brands?: Query<string>;
  platform?: Query<string>;
  date_from?: Query<string>;
  date_to?: Query<string>;
  country?: Query<string>;
}

// Retrieves share of voice analysis from Mentionlytics API.
export const shareOfVoice = api<ShareOfVoiceQuery, MentionlyticsResponse<ShareOfVoice[]>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/share-of-voice" },
  async (params) => {
    try {
      // Parse brands parameter (comma-separated string to array)
      const brandsArray = params.brands ? params.brands.split(',').map(b => b.trim()) : ['YourBrand'];
      const validationParams = { ...params, brands: brandsArray };

      // Validate input parameters
      const { error, value } = shareOfVoiceQuerySchema.validate(validationParams);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('share-of-voice', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<ShareOfVoice[]>(cacheKey);
      if (cachedData) {
        log.info("Returning cached share of voice data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockShareOfVoice(validatedParams.brands);
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
          data: {
            share_of_voice: Array<{
              brand: string;
              percentage: number;
              mentions_count: number;
              avg_sentiment: number;
              total_reach: number;
            }>;
            total_mentions: number;
          };
        }>('share-of-voice', {
          brands: validatedParams.brands.join(','),
          source: validatedParams.platform,
          from: validatedParams.date_from,
          to: validatedParams.date_to,
          country: validatedParams.country
        });

        // Transform API response to our format
        const shareOfVoiceData: ShareOfVoice[] = apiResponse.data.share_of_voice.map(item => ({
          brand: item.brand,
          percentage: item.percentage,
          mentions: item.mentions_count,
          sentiment: item.avg_sentiment
        }));

        // Cache the result
        cache.set(cacheKey, shareOfVoiceData);

        log.info("Successfully retrieved share of voice data from Mentionlytics API", {
          brands: shareOfVoiceData.length,
          brandsAnalyzed: validatedParams.brands
        });

        return {
          data: shareOfVoiceData,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockShareOfVoice(validatedParams.brands);
        cache.set(cacheKey, mockData, 2 * 60 * 1000);

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in share of voice endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve share of voice data");
    }
  }
);
