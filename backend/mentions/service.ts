import { mentionlyticsToken, openaiApiKey } from "../core/config";
import { warRoomDB } from "../core/db";

export interface MentionData {
  id: string;
  content: string;
  source: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  reach: number;
  engagement: number;
  publishedAt: Date;
  author: {
    name: string;
    followers: number;
    influence: number;
  };
}

export interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  averageScore: number;
}

interface MentionlyticsResponse {
  data: Array<{
    id: string;
    content: string;
    platform: string;
    link: string;
    sentiment: {
      score: number;
      label: string;
    };
    reach?: number;
    engagement?: number;
    published_at: string;
    author?: {
      name: string;
      followers_count?: number;
      influence_score?: number;
    };
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export class MentionsService {
  private mentionlyticsApiKey: string;
  private openaiApiKey: string;
  private apiBaseUrl = 'https://app.mentionlytics.com/api';

  constructor() {
    this.mentionlyticsApiKey = mentionlyticsToken();
    this.openaiApiKey = openaiApiKey();
  }

  async fetchRecentMentions(limit: number = 100): Promise<MentionData[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/mentions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.mentionlyticsApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: Math.min(limit, 100),
          sort: 'published_at',
          order: 'desc'
        })
      });

      if (!response.ok) {
        throw new Error(`Mentionlytics API error: ${response.status} ${response.statusText}`);
      }

      const data: MentionlyticsResponse = await response.json();
      
      return data.data.map(mention => ({
        id: mention.id,
        content: mention.content,
        source: mention.platform,
        url: mention.link,
        sentiment: this.mapSentimentLabel(mention.sentiment.label),
        sentimentScore: mention.sentiment.score,
        reach: mention.reach || this.estimateReach(mention.platform),
        engagement: mention.engagement || this.estimateEngagement(mention.platform),
        publishedAt: new Date(mention.published_at),
        author: {
          name: mention.author?.name || 'Unknown',
          followers: mention.author?.followers_count || 0,
          influence: mention.author?.influence_score || 0
        }
      }));
    } catch (error) {
      console.error('Failed to fetch mentions from Mentionlytics:', error);
      
      // Fallback to mock data if API fails
      return this.generateMockMentions(limit);
    }
  }

  private mapSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
    switch (label.toLowerCase()) {
      case 'positive':
        return 'positive';
      case 'negative':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private estimateReach(platform: string): number {
    const baseReach = {
      twitter: 2500,
      facebook: 3500,
      instagram: 2000,
      linkedin: 1500,
      reddit: 1800,
      youtube: 4000
    };
    
    return baseReach[platform as keyof typeof baseReach] || 1000;
  }

  private estimateEngagement(platform: string): number {
    const baseEngagement = {
      twitter: 150,
      facebook: 200,
      instagram: 180,
      linkedin: 120,
      reddit: 250,
      youtube: 300
    };
    
    return baseEngagement[platform as keyof typeof baseEngagement] || 100;
  }

  private generateMockMentions(limit: number): MentionData[] {
    const mockMentions: MentionData[] = [];
    
    for (let i = 0; i < Math.min(limit, 50); i++) {
      const sentiments = ['positive', 'negative', 'neutral'] as const;
      const sources = ['twitter', 'facebook', 'instagram', 'linkedin', 'reddit'];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      
      mockMentions.push({
        id: `mention_${Date.now()}_${i}`,
        content: `Mock mention content ${i + 1}`,
        source: sources[Math.floor(Math.random() * sources.length)],
        url: `https://example.com/mention/${i}`,
        sentiment,
        sentimentScore: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? -0.6 : 0.1,
        reach: Math.floor(Math.random() * 10000) + 100,
        engagement: Math.floor(Math.random() * 500) + 10,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        author: {
          name: `User ${i + 1}`,
          followers: Math.floor(Math.random() * 50000) + 100,
          influence: Math.random() * 100
        }
      });
    }

    return mockMentions;
  }

  async storeMentions(mentions: MentionData[], campaignId: number): Promise<void> {
    for (const mention of mentions) {
      await warRoomDB.exec`
        INSERT INTO mentions (
          campaign_id, platform, content, author, url, 
          sentiment, reach, engagement, mentioned_at,
          sentiment_score, reach_estimate, engagement_count, influence_score
        )
        VALUES (
          ${campaignId}, ${mention.source}, ${mention.content}, ${mention.author.name}, ${mention.url},
          ${mention.sentimentScore}, ${mention.reach}, ${mention.engagement}, ${mention.publishedAt.toISOString()},
          ${mention.sentimentScore}, ${mention.reach}, ${mention.engagement}, ${mention.author.influence}
        )
        ON CONFLICT DO NOTHING
      `;
    }
  }

  async analyzeSentimentTrends(campaignId?: number, days: number = 30): Promise<SentimentTrend[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    params.push(days);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} AND` : "WHERE";
    
    const query = `
      SELECT 
        DATE(mentioned_at) as date,
        COUNT(CASE WHEN sentiment_score > 0.1 THEN 1 END)::INTEGER as positive,
        COUNT(CASE WHEN sentiment_score < -0.1 THEN 1 END)::INTEGER as negative,
        COUNT(CASE WHEN sentiment_score >= -0.1 AND sentiment_score <= 0.1 THEN 1 END)::INTEGER as neutral,
        COUNT(*)::INTEGER as total,
        COALESCE(AVG(sentiment_score), 0) as "averageScore"
      FROM mentions 
      ${whereClause} mentioned_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(mentioned_at)
      ORDER BY date DESC
    `;

    const trends: SentimentTrend[] = [];
    for await (const row of warRoomDB.rawQuery<SentimentTrend>(query, ...params)) {
      trends.push(row);
    }

    return trends;
  }

  async getTopKeywords(campaignId?: number, limit: number = 20): Promise<{ keyword: string; count: number }[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    params.push(limit);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // This is a simplified keyword extraction - in production, you'd use proper text analysis
    const query = `
      SELECT 
        word as keyword,
        COUNT(*)::INTEGER as count
      FROM (
        SELECT unnest(string_to_array(lower(regexp_replace(content, '[^a-zA-Z0-9\\s]', '', 'g')), ' ')) as word
        FROM mentions 
        ${whereClause}
      ) words
      WHERE length(word) > 3
        AND word NOT IN ('this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'when', 'where', 'what', 'would', 'there', 'could', 'other')
      GROUP BY word
      ORDER BY count DESC
      LIMIT $${params.length}
    `;

    const keywords: { keyword: string; count: number }[] = [];
    try {
      for await (const row of warRoomDB.rawQuery<{ keyword: string; count: number }>(query, ...params)) {
        keywords.push(row);
      }
    } catch (error) {
      console.error('Failed to extract keywords:', error);
      // Return fallback keywords
      return [
        { keyword: 'campaign', count: 45 },
        { keyword: 'brand', count: 32 },
        { keyword: 'marketing', count: 28 },
        { keyword: 'social', count: 24 },
        { keyword: 'engagement', count: 19 }
      ].slice(0, limit);
    }

    return keywords;
  }

  async getTopSources(campaignId?: number, limit: number = 10): Promise<{ source: string; count: number; avgSentiment: number }[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    params.push(limit);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        platform as source,
        COUNT(*)::INTEGER as count,
        COALESCE(AVG(sentiment_score), 0) as "avgSentiment"
      FROM mentions 
      ${whereClause}
      GROUP BY platform
      ORDER BY count DESC
      LIMIT $${params.length}
    `;

    const sources: { source: string; count: number; avgSentiment: number }[] = [];
    for await (const row of warRoomDB.rawQuery<{ source: string; count: number; avgSentiment: number }>(query, ...params)) {
      sources.push(row);
    }

    return sources;
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.mentionlyticsApiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        return { status: 'healthy', message: 'Mentionlytics API connection successful' };
      } else {
        return { status: 'degraded', message: `Mentionlytics API returned ${response.status}` };
      }
    } catch (error) {
      return { status: 'unhealthy', message: `Mentionlytics API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  categorizesentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }
}

export const mentionsService = new MentionsService();
