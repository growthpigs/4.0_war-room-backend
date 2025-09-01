import { openaiApiKey } from "../core/config";
import { warRoomDB } from "../core/db";

export interface IntelligenceSnapshot {
  id: string;
  snapshotDate: string;
  totalMentions: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  averageSentiment: number;
  topKeywords: Array<{ keyword: string; count: number }>;
  competitorMentions: Array<{ competitor: string; mentions: number; sentiment: number }>;
  crisisCount: number;
  createdAt: string;
}

export interface MarketSentimentTrend {
  date: string;
  sentiment: number;
  volume: number;
  reach: number;
  engagement: number;
}

export interface CompetitorAnalysis {
  competitor: string;
  mentions: number;
  sentiment: number;
  reach: number;
  growth: number;
  shareOfVoice: number;
}

export interface InfluencerProfile {
  name: string;
  platform: string;
  followers: number;
  mentions: number;
  averageSentiment: number;
  influence: number;
  lastMentionDate: string;
}

export class IntelligenceService {
  private openaiKey: string;

  constructor() {
    this.openaiKey = openaiApiKey();
  }

  async createDailySnapshot(date: string = new Date().toISOString().split('T')[0]): Promise<IntelligenceSnapshot> {
    // Aggregate daily metrics
    const mentionStats = await warRoomDB.queryRow<{
      totalMentions: number;
      positiveCount: number;
      negativeCount: number;
      neutralCount: number;
      averageSentiment: number;
    }>`
      SELECT 
        COUNT(*)::INTEGER as "totalMentions",
        COUNT(CASE WHEN sentiment_score > 0.1 THEN 1 END)::INTEGER as "positiveCount",
        COUNT(CASE WHEN sentiment_score < -0.1 THEN 1 END)::INTEGER as "negativeCount",
        COUNT(CASE WHEN sentiment_score >= -0.1 AND sentiment_score <= 0.1 THEN 1 END)::INTEGER as "neutralCount",
        COALESCE(AVG(sentiment_score), 0) as "averageSentiment"
      FROM mentions 
      WHERE DATE(mentioned_at) = ${date}
    `;

    if (!mentionStats) {
      throw new Error("Failed to retrieve mention statistics");
    }

    // Get crisis count for the day
    const crisisCount = await warRoomDB.queryRow<{ count: number }>`
      SELECT COUNT(*)::INTEGER as count
      FROM crisis_events
      WHERE DATE(detected_at) = ${date}
    `;

    // Mock data for top keywords and competitors
    const topKeywords = [
      { keyword: 'campaign', count: 45 },
      { keyword: 'brand', count: 32 },
      { keyword: 'marketing', count: 28 }
    ];

    const competitorMentions = [
      { competitor: 'Competitor A', mentions: 25, sentiment: 0.3 },
      { competitor: 'Competitor B', mentions: 18, sentiment: -0.1 },
      { competitor: 'Competitor C', mentions: 12, sentiment: 0.6 }
    ];

    // Store snapshot
    const row = await warRoomDB.queryRow<IntelligenceSnapshot>`
      INSERT INTO intelligence_snapshots (
        snapshot_date, total_mentions, positive_count, negative_count, 
        neutral_count, average_sentiment, top_keywords, competitor_mentions, crisis_count
      )
      VALUES (
        ${date}, ${mentionStats.totalMentions}, ${mentionStats.positiveCount}, 
        ${mentionStats.negativeCount}, ${mentionStats.neutralCount}, ${mentionStats.averageSentiment},
        ${JSON.stringify(topKeywords)}, ${JSON.stringify(competitorMentions)}, ${crisisCount?.count || 0}
      )
      ON CONFLICT (snapshot_date) DO UPDATE SET
        total_mentions = EXCLUDED.total_mentions,
        positive_count = EXCLUDED.positive_count,
        negative_count = EXCLUDED.negative_count,
        neutral_count = EXCLUDED.neutral_count,
        average_sentiment = EXCLUDED.average_sentiment,
        top_keywords = EXCLUDED.top_keywords,
        competitor_mentions = EXCLUDED.competitor_mentions,
        crisis_count = EXCLUDED.crisis_count
      RETURNING 
        id, snapshot_date as "snapshotDate", total_mentions as "totalMentions",
        positive_count as "positiveCount", negative_count as "negativeCount",
        neutral_count as "neutralCount", average_sentiment as "averageSentiment",
        top_keywords as "topKeywords", competitor_mentions as "competitorMentions",
        crisis_count as "crisisCount", created_at as "createdAt"
    `;

    if (!row) {
      throw new Error("Failed to create intelligence snapshot");
    }

    return row;
  }

  async getMarketSentimentTrends(days: number = 30): Promise<MarketSentimentTrend[]> {
    const trends: MarketSentimentTrend[] = [];

    for await (const row of warRoomDB.query<MarketSentimentTrend>`
      SELECT 
        snapshot_date as date,
        average_sentiment as sentiment,
        total_mentions as volume,
        total_mentions * 1500 as reach,
        total_mentions * 120 as engagement
      FROM intelligence_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY snapshot_date DESC
    `) {
      trends.push(row);
    }

    return trends;
  }

  async getCompetitorAnalysis(): Promise<CompetitorAnalysis[]> {
    // Mock competitor analysis data
    const competitors: CompetitorAnalysis[] = [
      {
        competitor: 'Competitor A',
        mentions: 156,
        sentiment: 0.3,
        reach: 234000,
        growth: 15,
        shareOfVoice: 25.4
      },
      {
        competitor: 'Competitor B',
        mentions: 98,
        sentiment: -0.1,
        reach: 147000,
        growth: -8,
        shareOfVoice: 16.2
      },
      {
        competitor: 'Our Brand',
        mentions: 189,
        sentiment: 0.6,
        reach: 284000,
        growth: 22,
        shareOfVoice: 31.0
      }
    ];

    return competitors;
  }

  async identifyKeyInfluencers(limit: number = 10): Promise<InfluencerProfile[]> {
    // Mock influencer data - in real implementation, this would analyze mention authors
    const influencers: InfluencerProfile[] = [
      {
        name: 'TechInfluencer123',
        platform: 'twitter',
        followers: 125000,
        mentions: 8,
        averageSentiment: 0.7,
        influence: 85,
        lastMentionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'MarketingGuru',
        platform: 'linkedin',
        followers: 89000,
        mentions: 5,
        averageSentiment: 0.8,
        influence: 78,
        lastMentionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'BrandWatcher',
        platform: 'instagram',
        followers: 156000,
        mentions: 12,
        averageSentiment: 0.4,
        influence: 92,
        lastMentionDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    return influencers.slice(0, limit);
  }

  async generateExecutiveSummary(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<string> {
    // In real implementation, this would use OpenAI API to generate insights
    // For now, return a structured summary based on recent data

    const recentSnapshot = await warRoomDB.queryRow<IntelligenceSnapshot>`
      SELECT 
        id, snapshot_date as "snapshotDate", total_mentions as "totalMentions",
        positive_count as "positiveCount", negative_count as "negativeCount",
        neutral_count as "neutralCount", average_sentiment as "averageSentiment",
        top_keywords as "topKeywords", competitor_mentions as "competitorMentions",
        crisis_count as "crisisCount", created_at as "createdAt"
      FROM intelligence_snapshots
      ORDER BY snapshot_date DESC
      LIMIT 1
    `;

    if (!recentSnapshot) {
      return "No recent data available for executive summary.";
    }

    const sentimentStatus = recentSnapshot.averageSentiment > 0.2 ? 'positive' : 
                           recentSnapshot.averageSentiment < -0.2 ? 'concerning' : 'neutral';

    return `
**Executive Summary - ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Intelligence Report**

**Key Metrics:**
- Total Mentions: ${recentSnapshot.totalMentions}
- Sentiment Distribution: ${recentSnapshot.positiveCount} positive, ${recentSnapshot.negativeCount} negative, ${recentSnapshot.neutralCount} neutral
- Overall Sentiment: ${sentimentStatus} (${recentSnapshot.averageSentiment.toFixed(2)})
- Crisis Events: ${recentSnapshot.crisisCount}

**Key Insights:**
- Brand sentiment is trending ${sentimentStatus}
- Mention volume shows ${recentSnapshot.totalMentions > 100 ? 'high' : 'moderate'} activity
- ${recentSnapshot.crisisCount > 0 ? `${recentSnapshot.crisisCount} crisis events require attention` : 'No active crisis events detected'}

**Recommendations:**
- ${sentimentStatus === 'positive' ? 'Continue current engagement strategy' : 'Review recent messaging and address negative sentiment'}
- Monitor competitor activity and maintain market position
- ${recentSnapshot.crisisCount > 0 ? 'Prioritize crisis resolution efforts' : 'Maintain proactive monitoring'}
    `.trim();
  }

  async generateIntelligenceReport(format: 'summary' | 'detailed' = 'summary'): Promise<{
    title: string;
    generatedAt: string;
    timeframe: string;
    sections: Array<{
      title: string;
      content: string;
      charts?: Array<{ type: string; data: any }>;
    }>;
  }> {
    const report = {
      title: 'Intelligence Report',
      generatedAt: new Date().toISOString(),
      timeframe: 'Last 30 days',
      sections: [
        {
          title: 'Executive Summary',
          content: await this.generateExecutiveSummary('monthly')
        },
        {
          title: 'Sentiment Analysis',
          content: 'Overall brand sentiment remains stable with positive trending in key demographics.',
          charts: [
            {
              type: 'pie',
              data: {
                labels: ['Positive', 'Negative', 'Neutral'],
                values: [45, 25, 30]
              }
            }
          ]
        },
        {
          title: 'Competitor Analysis',
          content: 'Market share analysis shows competitive positioning against key rivals.',
          charts: [
            {
              type: 'bar',
              data: {
                competitors: ['Our Brand', 'Competitor A', 'Competitor B'],
                shareOfVoice: [31.0, 25.4, 16.2]
              }
            }
          ]
        }
      ]
    };

    if (format === 'detailed') {
      report.sections.push(
        {
          title: 'Key Influencers',
          content: 'Analysis of influential voices in brand conversations and their impact.'
        },
        {
          title: 'Crisis Events',
          content: 'Summary of crisis events and their resolution status.'
        },
        {
          title: 'Recommendations',
          content: 'Strategic recommendations based on intelligence analysis.'
        }
      );
    }

    return report;
  }
}

export const intelligenceService = new IntelligenceService();
