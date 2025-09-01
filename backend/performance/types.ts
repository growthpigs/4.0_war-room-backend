export interface PerformanceMetric {
  id: number;
  campaignId: number;
  platform: string;
  metricType: string;
  metricValue: number;
  date: string;
  createdAt: string;
}

export interface CreateMetricRequest {
  campaignId: number;
  platform: string;
  metricType: string;
  metricValue: number;
  date: string;
}

export interface MetricsListResponse {
  metrics: PerformanceMetric[];
}

export interface PerformanceDashboard {
  campaignId: number;
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
  averageCpm: number;
  platformMetrics: PlatformMetrics[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface PlatformMetrics {
  platform: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface TimeSeriesPoint {
  date: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
}
