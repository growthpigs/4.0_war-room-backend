import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { intelligenceService } from "./service";

interface SentimentTrendsParams {
  period?: Query<string>;
  granularity?: Query<string>;
}

interface SentimentTrendsResponse {
  trends: Array<{
    date: string;
    sentiment: number;
    volume: number;
    reach: number;
    engagement: number;
  }>;
  summary: {
    averageSentiment: number;
    totalVolume: number;
    sentimentChange: number;
    volumeChange: number;
  };
  insights: string[];
}

// Retrieves sentiment trends over time periods.
export const sentimentTrends = api<SentimentTrendsParams, SentimentTrendsResponse>(
  { expose: true, method: "GET", path: "/intelligence/sentiment-trends" },
  async ({ period = '30d', granularity = 'daily' }) => {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const trends = await intelligenceService.getMarketSentimentTrends(days);

    // Calculate summary metrics
    const totalVolume = trends.reduce((sum, trend) => sum + trend.volume, 0);
    const averageSentiment = trends.length > 0 
      ? trends.reduce((sum, trend) => sum + trend.sentiment, 0) / trends.length 
      : 0;

    // Calculate changes (current vs previous period)
    const currentPeriod = trends.slice(0, Math.floor(trends.length / 2));
    const previousPeriod = trends.slice(Math.floor(trends.length / 2));

    const currentAvgSentiment = currentPeriod.length > 0 
      ? currentPeriod.reduce((sum, trend) => sum + trend.sentiment, 0) / currentPeriod.length 
      : 0;
    const previousAvgSentiment = previousPeriod.length > 0 
      ? previousPeriod.reduce((sum, trend) => sum + trend.sentiment, 0) / previousPeriod.length 
      : 0;

    const currentVolume = currentPeriod.reduce((sum, trend) => sum + trend.volume, 0);
    const previousVolume = previousPeriod.reduce((sum, trend) => sum + trend.volume, 0);

    const sentimentChange = currentAvgSentiment - previousAvgSentiment;
    const volumeChange = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;

    // Generate insights
    const insights: string[] = [];
    
    if (sentimentChange > 0.1) {
      insights.push("Sentiment has improved significantly in recent period");
    } else if (sentimentChange < -0.1) {
      insights.push("Sentiment has declined, requiring attention");
    }

    if (volumeChange > 20) {
      insights.push("Mention volume is trending upward");
    } else if (volumeChange < -20) {
      insights.push("Mention volume has decreased");
    }

    if (averageSentiment > 0.3) {
      insights.push("Overall brand sentiment remains positive");
    } else if (averageSentiment < -0.3) {
      insights.push("Brand sentiment shows concerning negative trend");
    }

    if (insights.length === 0) {
      insights.push("Sentiment trends remain stable");
    }

    return {
      trends,
      summary: {
        averageSentiment,
        totalVolume,
        sentimentChange,
        volumeChange
      },
      insights
    };
  }
);
