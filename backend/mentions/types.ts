export interface Mention {
  id: number;
  campaignId: number;
  platform: string;
  content: string;
  author?: string;
  url?: string;
  sentiment?: number;
  reach?: number;
  engagement?: number;
  mentionedAt: string;
  createdAt: string;
}

export interface CreateMentionRequest {
  campaignId: number;
  platform: string;
  content: string;
  author?: string;
  url?: string;
  sentiment?: number;
  reach?: number;
  engagement?: number;
  mentionedAt: string;
}

export interface MentionsListResponse {
  mentions: Mention[];
}

export interface MentionAnalytics {
  totalMentions: number;
  averageSentiment: number;
  totalReach: number;
  totalEngagement: number;
  platformBreakdown: PlatformStats[];
  sentimentTrend: SentimentTrendPoint[];
}

export interface PlatformStats {
  platform: string;
  count: number;
  averageSentiment: number;
}

export interface SentimentTrendPoint {
  date: string;
  sentiment: number;
  count: number;
}
