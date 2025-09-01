import { api } from "encore.dev/api";
import { intelligenceService } from "./service";

interface IntelligenceDashboardResponse {
  overview: {
    totalMentions: number;
    averageSentiment: number;
    sentimentTrend: 'up' | 'down' | 'stable';
    crisisCount: number;
  };
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topKeywords: Array<{
    keyword: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  competitorComparison: Array<{
    name: string;
    mentions: number;
    sentiment: number;
    shareOfVoice: number;
  }>;
  influencers: Array<{
    name: string;
    platform: string;
    influence: number;
    mentions: number;
    sentiment: number;
  }>;
  recentTrends: Array<{
    date: string;
    sentiment: number;
    volume: number;
  }>;
}

// Retrieves main intelligence dashboard data.
export const dashboard = api<void, IntelligenceDashboardResponse>(
  { expose: true, method: "GET", path: "/intelligence/dashboard" },
  async () => {
    // Get recent trends for overview
    const trends = await intelligenceService.getMarketSentimentTrends(7);
    const latestTrend = trends[0];
    const previousTrend = trends[1];

    const sentimentTrend = latestTrend && previousTrend 
      ? latestTrend.sentiment > previousTrend.sentiment ? 'up' 
        : latestTrend.sentiment < previousTrend.sentiment ? 'down' 
        : 'stable'
      : 'stable';

    // Get competitor analysis
    const competitors = await intelligenceService.getCompetitorAnalysis();

    // Get key influencers
    const influencers = await intelligenceService.identifyKeyInfluencers(5);

    // Calculate sentiment distribution from recent trends
    const totalVolume = trends.reduce((sum, trend) => sum + trend.volume, 0);
    const sentimentDistribution = {
      positive: 45, // Mock percentages
      negative: 25,
      neutral: 30
    };

    const topKeywords = [
      { keyword: 'campaign', count: 156, trend: 'up' as const },
      { keyword: 'brand', count: 132, trend: 'stable' as const },
      { keyword: 'marketing', count: 98, trend: 'down' as const },
      { keyword: 'launch', count: 87, trend: 'up' as const },
      { keyword: 'product', count: 76, trend: 'stable' as const }
    ];

    return {
      overview: {
        totalMentions: latestTrend?.volume || 0,
        averageSentiment: latestTrend?.sentiment || 0,
        sentimentTrend,
        crisisCount: 0 // Would be calculated from crisis events
      },
      sentimentDistribution,
      topKeywords,
      competitorComparison: competitors.map(comp => ({
        name: comp.competitor,
        mentions: comp.mentions,
        sentiment: comp.sentiment,
        shareOfVoice: comp.shareOfVoice
      })),
      influencers: influencers.map(inf => ({
        name: inf.name,
        platform: inf.platform,
        influence: inf.influence,
        mentions: inf.mentions,
        sentiment: inf.averageSentiment
      })),
      recentTrends: trends.slice(0, 7).map(trend => ({
        date: trend.date,
        sentiment: trend.sentiment,
        volume: trend.volume
      }))
    };
  }
);
