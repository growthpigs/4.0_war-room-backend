import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { warRoomDB } from "../core/db";

export interface CrisisEvent {
  id: string;
  title: string;
  description?: string;
  severity: number;
  status: 'active' | 'acknowledged' | 'resolved';
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  mentionCount: number;
  negativeSentimentRatio: number;
  estimatedReach: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CrisisAlert {
  id: string;
  title: string;
  severity: number;
  triggerType: string;
  metrics: {
    mentionSpike: number;
    sentimentDrop: number;
    reachIncrease: number;
  };
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
}

export class CrisisDetectionEngine {
  async detectCrisisPatterns(): Promise<CrisisAlert[]> {
    const alerts: CrisisAlert[] = [];

    // Check for mention volume spikes (last 24h vs previous 24h)
    const mentionSpike = await this.detectMentionSpike();
    if (mentionSpike.severity > 5) {
      alerts.push(mentionSpike);
    }

    // Check for sentiment drops
    const sentimentDrop = await this.detectSentimentDrop();
    if (sentimentDrop.severity > 5) {
      alerts.push(sentimentDrop);
    }

    // Check for keyword alerts
    const keywordAlerts = await this.detectKeywordAlerts();
    alerts.push(...keywordAlerts);

    return alerts;
  }

  private async detectMentionSpike(): Promise<CrisisAlert> {
    const today = await warRoomDB.queryRow<{ count: number }>`
      SELECT COUNT(*)::INTEGER as count 
      FROM mentions 
      WHERE mentioned_at >= CURRENT_DATE - INTERVAL '1 day'
    `;

    const yesterday = await warRoomDB.queryRow<{ count: number }>`
      SELECT COUNT(*)::INTEGER as count 
      FROM mentions 
      WHERE mentioned_at >= CURRENT_DATE - INTERVAL '2 days'
        AND mentioned_at < CURRENT_DATE - INTERVAL '1 day'
    `;

    const todayCount = today?.count || 0;
    const yesterdayCount = yesterday?.count || 1;
    const spikeRatio = todayCount / yesterdayCount;

    const severity = Math.min(10, Math.max(1, Math.floor(spikeRatio * 2)));

    return {
      id: `spike_${Date.now()}`,
      title: 'Mention Volume Spike Detected',
      severity,
      triggerType: 'volume_spike',
      metrics: {
        mentionSpike: spikeRatio,
        sentimentDrop: 0,
        reachIncrease: 0
      },
      estimatedImpact: severity > 8 ? 'critical' : severity > 6 ? 'high' : severity > 4 ? 'medium' : 'low'
    };
  }

  private async detectSentimentDrop(): Promise<CrisisAlert> {
    const recentSentiment = await warRoomDB.queryRow<{ avg: number }>`
      SELECT COALESCE(AVG(sentiment_score), 0) as avg 
      FROM mentions 
      WHERE mentioned_at >= CURRENT_DATE - INTERVAL '6 hours'
    `;

    const baselineSentiment = await warRoomDB.queryRow<{ avg: number }>`
      SELECT COALESCE(AVG(sentiment_score), 0) as avg 
      FROM mentions 
      WHERE mentioned_at >= CURRENT_DATE - INTERVAL '7 days'
        AND mentioned_at < CURRENT_DATE - INTERVAL '1 day'
    `;

    const recentAvg = recentSentiment?.avg || 0;
    const baselineAvg = baselineSentiment?.avg || 0;
    const sentimentDrop = baselineAvg - recentAvg;

    const severity = Math.min(10, Math.max(1, Math.floor(sentimentDrop * 10)));

    return {
      id: `sentiment_${Date.now()}`,
      title: 'Negative Sentiment Spike Detected',
      severity,
      triggerType: 'sentiment_drop',
      metrics: {
        mentionSpike: 0,
        sentimentDrop,
        reachIncrease: 0
      },
      estimatedImpact: severity > 8 ? 'critical' : severity > 6 ? 'high' : severity > 4 ? 'medium' : 'low'
    };
  }

  private async detectKeywordAlerts(): Promise<CrisisAlert[]> {
    // Mock keyword alert detection
    const crisisKeywords = ['scandal', 'boycott', 'lawsuit', 'controversy', 'fraud', 'scam'];
    const alerts: CrisisAlert[] = [];

    // In real implementation, this would search for crisis keywords in recent mentions
    for (const keyword of crisisKeywords) {
      const keywordMentions = await warRoomDB.queryRow<{ count: number }>`
        SELECT COUNT(*)::INTEGER as count 
        FROM mentions 
        WHERE LOWER(content) LIKE LOWER(${'%' + keyword + '%'})
          AND mentioned_at >= CURRENT_DATE - INTERVAL '2 hours'
      `;

      const count = keywordMentions?.count || 0;
      if (count > 0) {
        alerts.push({
          id: `keyword_${keyword}_${Date.now()}`,
          title: `Crisis Keyword Detected: "${keyword}"`,
          severity: 8,
          triggerType: 'keyword_alert',
          metrics: {
            mentionSpike: count,
            sentimentDrop: 0,
            reachIncrease: 0
          },
          estimatedImpact: 'high'
        });
      }
    }

    return alerts;
  }

  async createCrisisEvent(alert: CrisisAlert): Promise<CrisisEvent> {
    const row = await warRoomDB.queryRow<CrisisEvent>`
      INSERT INTO crisis_events (
        title, description, severity, mention_count, 
        negative_sentiment_ratio, estimated_reach, metadata
      )
      VALUES (
        ${alert.title}, 
        ${'Crisis detected by automated monitoring system'}, 
        ${alert.severity}, 
        ${alert.metrics.mentionSpike}, 
        ${Math.abs(alert.metrics.sentimentDrop)}, 
        ${1000}, 
        ${JSON.stringify(alert.metrics)}
      )
      RETURNING 
        id, title, description, severity, status,
        detected_at as "detectedAt", acknowledged_at as "acknowledgedAt", 
        resolved_at as "resolvedAt", mention_count as "mentionCount",
        negative_sentiment_ratio as "negativeSentimentRatio", 
        estimated_reach as "estimatedReach", metadata,
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    if (!row) {
      throw new Error("Failed to create crisis event");
    }

    return row;
  }

  calculateImpactScore(mentionCount: number, reach: number, sentimentRatio: number): number {
    return Math.min(100, (mentionCount * 0.3) + (reach / 1000 * 0.4) + (sentimentRatio * 30));
  }
}

export const crisisEngine = new CrisisDetectionEngine();
