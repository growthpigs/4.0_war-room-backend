import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { performanceService } from "./service";

interface OverviewParams {
  campaignId?: Query<number>;
}

interface PerformanceOverviewResponse {
  overview: {
    totalSpent: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    averageCtr: number;
    averageCpc: number;
    averageCpm: number;
    roas: number;
  };
  kpis: Array<{
    name: string;
    value: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
    status: 'good' | 'warning' | 'critical';
  }>;
  alerts: Array<{
    type: 'warning' | 'critical';
    metric: string;
    message: string;
    value: number;
    threshold: number;
  }>;
  lastUpdated: string;
}

// Retrieves high-level performance metrics overview.
export const overview = api<OverviewParams, PerformanceOverviewResponse>(
  { expose: true, method: "GET", path: "/performance/overview" },
  async ({ campaignId }) => {
    const overviewMetrics = await performanceService.getOverviewMetrics(campaignId);
    const kpis = await performanceService.getKPIMetrics(campaignId);
    const alerts = await performanceService.getPerformanceAlerts(campaignId);

    return {
      overview: overviewMetrics,
      kpis,
      alerts,
      lastUpdated: new Date().toISOString()
    };
  }
);
