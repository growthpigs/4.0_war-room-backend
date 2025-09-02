import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, MentionItem } from "./types";
import { mentionsQuerySchema } from "./validation";
import { generateMockMentions } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface MentionsQuery {
  keyword?: Query<string>;
  platform?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
  date_from?: Query<string>;
  date_to?: Query<string>;
  sentiment?: Query<string>;
  country?: Query<string>;
}

// Retrieves mentions from Mentionlytics API with filtering options.
export const mentions = api<MentionsQuery, MentionlyticsResponse<MentionItem[]>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/mentions" },
  async (params) => {
    try {
      // Validate input parameters
      const { error, value } = mentionsQuerySchema.validate(params);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('mentions', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<MentionItem[]>(cacheKey);
      if (cachedData) {
        log.info("Returning cached mentions data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockMentions(validatedParams.limit || 20);
        cache.set(cacheKey, mockData, 2 * 60 * 1000); // Cache for 2 minutes
        
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
            text: string;
            source: { name: string };
            author: { name: string };
            published_at: string;
            sentiment: { label: string };
            reach: number;
          }>;
          pagination: {
            total: number;
            page: number;
            per_page: number;
          };
        }>('mentions', {
          q: validatedParams.keyword,
          source: validatedParams.platform,
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          from: validatedParams.date_from,
          to: validatedParams.date_to,
          sentiment: validatedParams.sentiment,
          country: validatedParams.country
        });

        // Transform API response to our format
        const mentions: MentionItem[] = apiResponse.data.map(item => ({
          id: item.id,
          text: item.text,
          platform: item.source.name.toLowerCase(),
          author: item.author.name,
          timestamp: item.published_at,
          sentiment: mapSentiment(item.sentiment.label),
          reach: item.reach || 0
        }));

        // Cache the result
        cache.set(cacheKey, mentions);

        log.info("Successfully retrieved mentions from Mentionlytics API", {
          count: mentions.length,
          keyword: validatedParams.keyword
        });

        return {
          data: mentions,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockMentions(validatedParams.limit || 20);
        cache.set(cacheKey, mockData, 2 * 60 * 1000); // Cache for 2 minutes

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in mentions endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve mentions data");
    }
  }
);

function mapSentiment(label: string): 'positive' | 'negative' | 'neutral' {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes('positive')) return 'positive';
  if (normalizedLabel.includes('negative')) return 'negative';
  return 'neutral';
}
