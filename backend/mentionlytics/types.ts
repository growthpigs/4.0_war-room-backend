export interface MentionItem {
  id: string;
  text: string;
  platform: string;
  author: string;
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  reach: number;
}

export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export interface GeoLocation {
  location: string;
  mentions: number;
  sentiment: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Influencer {
  name: string;
  followers: number;
  engagement_rate: number;
  platform: string;
  influence_score: number;
}

export interface ShareOfVoice {
  brand: string;
  percentage: number;
  mentions: number;
  sentiment: number;
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  growth_rate: number;
  sentiment: number;
}

export interface FeedItem {
  type: 'mention' | 'trend' | 'influencer' | 'alert';
  content: string;
  timestamp: string;
  engagement: number;
}

export interface MentionlyticsResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface APIResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  status: string;
}
