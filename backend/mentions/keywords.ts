import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { mentionsService } from "./service";

interface KeywordsParams {
  campaignId?: Query<number>;
  limit?: Query<number>;
}

interface KeywordsResponse {
  topKeywords: Array<{
    keyword: string;
    count: number;
    sentiment: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  hashtags: Array<{
    hashtag: string;
    count: number;
    platforms: string[];
  }>;
  emergingTerms: Array<{
    term: string;
    count: number;
    growth: number;
  }>;
}

// Retrieves top keywords and hashtags analysis.
export const keywords = api<KeywordsParams, KeywordsResponse>(
  { expose: true, method: "GET", path: "/mentions/keywords" },
  async ({ campaignId, limit = 20 }) => {
    const topKeywords = await mentionsService.getTopKeywords(campaignId, limit);

    // Mock data for hashtags and emerging terms
    const hashtags = [
      { hashtag: '#campaign2024', count: 25, platforms: ['twitter', 'instagram'] },
      { hashtag: '#brandlove', count: 18, platforms: ['instagram', 'facebook'] },
      { hashtag: '#marketing', count: 15, platforms: ['twitter', 'linkedin'] }
    ];

    const emergingTerms = [
      { term: 'sustainability', count: 12, growth: 150 },
      { term: 'innovation', count: 8, growth: 200 },
      { term: 'community', count: 10, growth: 75 }
    ];

    // Add mock sentiment and trend data to keywords
    const enrichedKeywords = topKeywords.map(keyword => ({
      ...keyword,
      sentiment: Math.random() * 2 - 1, // Random sentiment between -1 and 1
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
    }));

    return {
      topKeywords: enrichedKeywords,
      hashtags,
      emergingTerms
    };
  }
);
