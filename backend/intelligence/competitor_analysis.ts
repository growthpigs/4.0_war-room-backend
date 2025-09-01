import { api } from "encore.dev/api";
import { intelligenceService } from "./service";

interface CompetitorAnalysisResponse {
  competitors: Array<{
    name: string;
    mentions: number;
    sentiment: number;
    reach: number;
    growth: number;
    shareOfVoice: number;
    sentimentTrend: 'up' | 'down' | 'stable';
  }>;
  marketShare: {
    totalMentions: number;
    ourShare: number;
    leaderShare: number;
    ourRanking: number;
  };
  insights: Array<{
    type: 'opportunity' | 'threat' | 'neutral';
    message: string;
    competitor?: string;
  }>;
  recommendations: string[];
}

// Retrieves competitor mention comparison and analysis.
export const competitorAnalysis = api<void, CompetitorAnalysisResponse>(
  { expose: true, method: "GET", path: "/intelligence/competitor-analysis" },
  async () => {
    const competitorData = await intelligenceService.getCompetitorAnalysis();

    // Add sentiment trends (mock data)
    const competitors = competitorData.map(comp => ({
      ...comp,
      sentimentTrend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable' as 'up' | 'down' | 'stable'
    }));

    // Calculate market share
    const totalMentions = competitors.reduce((sum, comp) => sum + comp.mentions, 0);
    const ourBrand = competitors.find(comp => comp.competitor === 'Our Brand');
    const leader = competitors.reduce((prev, current) => 
      current.mentions > prev.mentions ? current : prev
    );

    const marketShare = {
      totalMentions,
      ourShare: ourBrand ? (ourBrand.mentions / totalMentions) * 100 : 0,
      leaderShare: (leader.mentions / totalMentions) * 100,
      ourRanking: competitors
        .sort((a, b) => b.mentions - a.mentions)
        .findIndex(comp => comp.competitor === 'Our Brand') + 1
    };

    // Generate insights
    const insights = [
      {
        type: 'opportunity' as const,
        message: 'Competitor B showing negative sentiment - opportunity to capture mindshare',
        competitor: 'Competitor B'
      },
      {
        type: 'threat' as const,
        message: 'Competitor A gaining momentum with 15% growth',
        competitor: 'Competitor A'
      },
      {
        type: 'neutral' as const,
        message: 'Market conversation volume remains stable across all players'
      }
    ];

    // Generate recommendations
    const recommendations = [
      'Focus on positive messaging to contrast with Competitor B\'s negative sentiment',
      'Monitor Competitor A\'s growth strategy and messaging themes',
      'Leverage current sentiment advantage to increase share of voice',
      'Engage with audiences discussing competitor topics to capture attention'
    ];

    return {
      competitors: competitors.filter(comp => comp.competitor !== 'Our Brand'),
      marketShare,
      insights,
      recommendations
    };
  }
);
