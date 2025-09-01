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

export class MentionsService {
  private mentionlyticsApiKey: string;
  private openaiApiKey: string;

  constructor() {
    this.mentionlyticsApiKey = mentionlyticsToken();
    this.openaiApiKey = openaiApiKey();
  }

  async fetchRecentMentions(limit: number = 100): Promise<MentionData[]> {
    // TODO: Replace with actual Mentionlytics API call
    // This is a mock implementation
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
    // This would typically use a proper text analysis library
    // For now, return mock data
    const mockKeywords = [
      { keyword: 'campaign', count: 45 },
      { keyword: 'brand', count: 32 },
      { keyword: 'marketing', count: 28 },
      { keyword: 'social', count: 24 },
      { keyword: 'engagement', count: 19 }
    ];

    return mockKeywords.slice(0, limit);
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

  categorizesentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }
}

export const mentionsService = new MentionsService();
