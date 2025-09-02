import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, SentimentSummary } from "./types";
import { sentimentQuerySchema } from "./validation";
import { generateMockSentiment } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface SentimentQuery {
  keyword?: Query<string>;
  platform?: Query<string>;
  date_from?: Query<string>;
  date_to?: Query<string>;
  country?: Query<string>;
}

// Retrieves sentiment analysis summary from Mentionlytics API.
export const sentiment = api<SentimentQuery, MentionlyticsResponse<SentimentSummary>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/sentiment" },
  async (params) => {
    try {
      // Validate input parameters
      const { error, value } = sentimentQuerySchema.validate(params);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('sentiment', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<SentimentSummary>(cacheKey);
      if (cachedData) {
        log.info("Returning cached sentiment data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockSentiment();
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
            sentiment_distribution: {
              positive: number;
              negative: number;
              neutral: number;
              total: number;
            };
          };
        }>('sentiment', {
          q: validatedParams.keyword,
          source: validatedParams.platform,
          from: validatedParams.date_from,
          to: validatedParams.date_to,
          country: validatedParams.country
        });

        // Transform API response to our format
        const sentimentData: SentimentSummary = {
          positive: apiResponse.data.sentiment_distribution.positive,
          negative: apiResponse.data.sentiment_distribution.negative,
          neutral: apiResponse.data.sentiment_distribution.neutral,
          total: apiResponse.data.sentiment_distribution.total
        };

        // Cache the result
        cache.set(cacheKey, sentimentData);

        log.info("Successfully retrieved sentiment data from Mentionlytics API", {
          total: sentimentData.total,
          keyword: validatedParams.keyword
        });

        return {
          data: sentimentData,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockSentiment();
        cache.set(cacheKey, mockData, 2 * 60 * 1000);

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in sentiment endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve sentiment data");
    }
  }
);
