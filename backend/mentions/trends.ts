import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { mentionsService } from "./service";

interface TrendsParams {
  campaignId?: Query<number>;
  days?: Query<number>;
}

interface TrendsResponse {
  volumeTrends: Array<{
    date: string;
    mentions: number;
    reach: number;
    engagement: number;
  }>;
  sentimentTrends: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    averageScore: number;
  }>;
  peakDays: Array<{
    date: string;
    mentions: number;
    reason: string;
  }>;
}

// Retrieves mention volume trends over time.
export const trends = api<TrendsParams, TrendsResponse>(
  { expose: true, method: "GET", path: "/mentions/trends" },
  async ({ campaignId, days = 30 }) => {
    const sentimentTrends = await mentionsService.analyzeSentimentTrends(campaignId, days);

    // Mock volume trends - in real implementation, this would query the database
    const volumeTrends = sentimentTrends.map(trend => ({
      date: trend.date,
      mentions: trend.total,
      reach: Math.floor(trend.total * 1500), // Mock reach calculation
      engagement: Math.floor(trend.total * 120) // Mock engagement calculation
    }));

    // Identify peak days (top 3 days by mention volume)
    const peakDays = volumeTrends
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 3)
      .map(day => ({
        date: day.date,
        mentions: day.mentions,
        reason: day.mentions > 50 ? "High activity detected" : "Normal peak activity"
      }));

    return {
      volumeTrends,
      sentimentTrends,
      peakDays
    };
  }
);
