import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { mentionsService } from "./service";

interface SourcesParams {
  campaignId?: Query<number>;
  limit?: Query<number>;
}

interface SourcesResponse {
  platforms: Array<{
    platform: string;
    mentions: number;
    reach: number;
    sentiment: number;
    growth: number;
  }>;
  influencers: Array<{
    name: string;
    platform: string;
    mentions: number;
    followers: number;
    influence: number;
    sentiment: number;
  }>;
  domains: Array<{
    domain: string;
    mentions: number;
    type: 'news' | 'blog' | 'forum' | 'social';
    sentiment: number;
  }>;
}

// Retrieves top mention sources and platforms.
export const sources = api<SourcesParams, SourcesResponse>(
  { expose: true, method: "GET", path: "/mentions/sources" },
  async ({ campaignId, limit = 10 }) => {
    const topSources = await mentionsService.getTopSources(campaignId, limit);

    // Transform sources to platforms with additional data
    const platforms = topSources.map(source => ({
      platform: source.source,
      mentions: source.count,
      reach: source.count * 1200, // Mock reach calculation
      sentiment: source.avgSentiment,
      growth: Math.floor(Math.random() * 50) - 25 // Mock growth percentage
    }));

    // Mock influencers data
    const influencers = [
      {
        name: 'TechInfluencer123',
        platform: 'twitter',
        mentions: 8,
        followers: 50000,
        influence: 85,
        sentiment: 0.6
      },
      {
        name: 'MarketingGuru',
        platform: 'linkedin',
        mentions: 5,
        followers: 25000,
        influence: 72,
        sentiment: 0.8
      },
      {
        name: 'BrandWatcher',
        platform: 'instagram',
        mentions: 12,
        followers: 75000,
        influence: 90,
        sentiment: 0.4
      }
    ];

    // Mock domains data
    const domains = [
      {
        domain: 'techcrunch.com',
        mentions: 3,
        type: 'news' as const,
        sentiment: 0.5
      },
      {
        domain: 'reddit.com',
        mentions: 15,
        type: 'forum' as const,
        sentiment: -0.2
      },
      {
        domain: 'marketingblog.com',
        mentions: 2,
        type: 'blog' as const,
        sentiment: 0.7
      }
    ];

    return {
      platforms,
      influencers,
      domains
    };
  }
);
