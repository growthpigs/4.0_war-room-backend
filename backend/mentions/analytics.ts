import { api, APIError } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { MentionAnalytics, PlatformStats, SentimentTrendPoint } from "./types";

interface AnalyticsParams {
  campaignId: number;
}

// Retrieves analytics data for mentions of a specific campaign.
export const analytics = api<AnalyticsParams, MentionAnalytics>(
  { expose: true, method: "GET", path: "/mentions/:campaignId/analytics" },
  async ({ campaignId }) => {
    // Get overall stats
    const overallStats = await warRoomDB.queryRow<{
      totalMentions: number;
      averageSentiment: number;
      totalReach: number;
      totalEngagement: number;
    }>`
      SELECT 
        COUNT(*)::INTEGER as "totalMentions",
        COALESCE(AVG(sentiment), 0) as "averageSentiment",
        COALESCE(SUM(reach), 0)::INTEGER as "totalReach",
        COALESCE(SUM(engagement), 0)::INTEGER as "totalEngagement"
      FROM mentions 
      WHERE campaign_id = ${campaignId}
    `;
    
    if (!overallStats) {
      throw APIError.notFound("campaign not found");
    }
    
    // Get platform breakdown
    const platformBreakdown: PlatformStats[] = [];
    for await (const row of warRoomDB.query<PlatformStats>`
      SELECT 
        platform,
        COUNT(*)::INTEGER as count,
        COALESCE(AVG(sentiment), 0) as "averageSentiment"
      FROM mentions 
      WHERE campaign_id = ${campaignId}
      GROUP BY platform
      ORDER BY count DESC
    `) {
      platformBreakdown.push(row);
    }
    
    // Get sentiment trend (last 30 days)
    const sentimentTrend: SentimentTrendPoint[] = [];
    for await (const row of warRoomDB.query<SentimentTrendPoint>`
      SELECT 
        DATE(mentioned_at) as date,
        COALESCE(AVG(sentiment), 0) as sentiment,
        COUNT(*)::INTEGER as count
      FROM mentions 
      WHERE campaign_id = ${campaignId}
        AND mentioned_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(mentioned_at)
      ORDER BY date DESC
    `) {
      sentimentTrend.push(row);
    }
    
    return {
      ...overallStats,
      platformBreakdown,
      sentimentTrend,
    };
  }
);
