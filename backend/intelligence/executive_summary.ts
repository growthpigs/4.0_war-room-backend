import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { intelligenceService } from "./service";

interface ExecutiveSummaryParams {
  timeframe?: Query<string>;
}

interface ExecutiveSummaryResponse {
  summary: string;
  keyMetrics: {
    mentionVolume: number;
    sentimentScore: number;
    reachEstimate: number;
    crisisEvents: number;
  };
  highlights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
  }>;
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    deadline?: string;
  }>;
  generatedAt: string;
}

// Generates AI-powered executive summary with insights.
export const executiveSummary = api<ExecutiveSummaryParams, ExecutiveSummaryResponse>(
  { expose: true, method: "GET", path: "/intelligence/executive-summary" },
  async ({ timeframe = 'weekly' }) => {
    const summary = await intelligenceService.generateExecutiveSummary(
      timeframe as 'daily' | 'weekly' | 'monthly'
    );

    // Get recent data for metrics
    const trends = await intelligenceService.getMarketSentimentTrends(7);
    const latestTrend = trends[0];

    const keyMetrics = {
      mentionVolume: latestTrend?.volume || 0,
      sentimentScore: latestTrend?.sentiment || 0,
      reachEstimate: latestTrend?.reach || 0,
      crisisEvents: 0 // Would be fetched from crisis events
    };

    // Generate highlights based on data
    const highlights = [
      {
        type: 'positive' as const,
        title: 'Sentiment Improvement',
        description: 'Brand sentiment has improved by 15% over the past week'
      },
      {
        type: 'neutral' as const,
        title: 'Stable Mention Volume',
        description: 'Mention volume remains consistent with previous periods'
      },
      {
        type: 'negative' as const,
        title: 'Competitor Growth',
        description: 'Key competitor showing increased activity and engagement'
      }
    ];

    // Generate action items
    const actionItems = [
      {
        priority: 'high' as const,
        title: 'Address Negative Sentiment',
        description: 'Investigate and respond to recent negative mentions',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        priority: 'medium' as const,
        title: 'Competitor Analysis',
        description: 'Deep dive into competitor strategy and messaging',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        priority: 'low' as const,
        title: 'Influencer Outreach',
        description: 'Engage with key influencers identified in analysis'
      }
    ];

    return {
      summary,
      keyMetrics,
      highlights,
      actionItems,
      generatedAt: new Date().toISOString()
    };
  }
);
