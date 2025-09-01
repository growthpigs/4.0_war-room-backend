import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { mentionsService } from "./service";

interface SentimentAnalysisParams {
  campaignId?: Query<number>;
  days?: Query<number>;
}

interface SentimentAnalysisResponse {
  overview: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
  };
  trends: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    averageScore: number;
  }>;
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

// Retrieves sentiment analysis breakdown and trends.
export const sentimentAnalysis = api<SentimentAnalysisParams, SentimentAnalysisResponse>(
  { expose: true, method: "GET", path: "/mentions/sentiment-analysis" },
  async ({ campaignId, days = 30 }) => {
    const trends = await mentionsService.analyzeSentimentTrends(campaignId, days);
    
    // Calculate overview from trends
    const overview = trends.reduce(
      (acc, trend) => ({
        total: acc.total + trend.total,
        positive: acc.positive + trend.positive,
        negative: acc.negative + trend.negative,
        neutral: acc.neutral + trend.neutral,
        averageScore: acc.averageScore + (trend.averageScore * trend.total)
      }),
      { total: 0, positive: 0, negative: 0, neutral: 0, averageScore: 0 }
    );

    if (overview.total > 0) {
      overview.averageScore = overview.averageScore / overview.total;
    }

    const distribution = {
      positive: overview.total > 0 ? (overview.positive / overview.total) * 100 : 0,
      negative: overview.total > 0 ? (overview.negative / overview.total) * 100 : 0,
      neutral: overview.total > 0 ? (overview.neutral / overview.total) * 100 : 0
    };

    return {
      overview,
      trends,
      distribution
    };
  }
);
