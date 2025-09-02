import { api, APIError, Query } from "encore.dev/api";
import { mentionlyticsClient } from "./client";
import { MentionlyticsResponse, GeoLocation } from "./types";
import { geoQuerySchema } from "./validation";
import { generateMockGeoData } from "./mock_data";
import { cache } from "./cache";
import log from "encore.dev/log";

interface GeoQuery {
  keyword?: Query<string>;
  platform?: Query<string>;
  date_from?: Query<string>;
  date_to?: Query<string>;
  limit?: Query<number>;
}

// Retrieves geographical mention distribution from Mentionlytics API.
export const geo = api<GeoQuery, MentionlyticsResponse<GeoLocation[]>>(
  { expose: true, method: "GET", path: "/api/v1/mentionlytics/mentions/geo" },
  async (params) => {
    try {
      // Validate input parameters
      const { error, value } = geoQuerySchema.validate(params);
      if (error) {
        throw APIError.invalidArgument(`Invalid parameters: ${error.message}`);
      }

      const validatedParams = value;
      const cacheKey = cache.generateKey('geo', validatedParams);
      
      // Check cache first
      const cachedData = cache.get<GeoLocation[]>(cacheKey);
      if (cachedData) {
        log.info("Returning cached geographical data");
        return {
          data: cachedData,
          success: true,
          message: "Data retrieved from cache"
        };
      }

      // Check if client is configured
      if (!mentionlyticsClient.isConfigured()) {
        log.warn("Mentionlytics API token not configured, using mock data");
        const mockData = generateMockGeoData(validatedParams.limit || 10);
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
            location: string;
            mentions_count: number;
            avg_sentiment: number;
            coordinates?: {
              latitude: number;
              longitude: number;
            };
          }>;
        }>('mentions/geography', {
          q: validatedParams.keyword,
          source: validatedParams.platform,
          from: validatedParams.date_from,
          to: validatedParams.date_to,
          limit: validatedParams.limit
        });

        // Transform API response to our format
        const geoData: GeoLocation[] = apiResponse.data.map(item => ({
          location: item.location,
          mentions: item.mentions_count,
          sentiment: item.avg_sentiment,
          coordinates: item.coordinates ? {
            lat: item.coordinates.latitude,
            lng: item.coordinates.longitude
          } : undefined
        }));

        // Cache the result
        cache.set(cacheKey, geoData);

        log.info("Successfully retrieved geographical data from Mentionlytics API", {
          locations: geoData.length,
          keyword: validatedParams.keyword
        });

        return {
          data: geoData,
          success: true
        };

      } catch (apiError) {
        log.error("Mentionlytics API request failed", {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          params: validatedParams
        });

        // Return mock data as fallback
        const mockData = generateMockGeoData(validatedParams.limit || 10);
        cache.set(cacheKey, mockData, 2 * 60 * 1000);

        return {
          data: mockData,
          success: false,
          message: "API unavailable, returning mock data"
        };
      }

    } catch (error) {
      log.error("Error in geo endpoint", {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to retrieve geographical data");
    }
  }
);
