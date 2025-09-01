import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { performanceService } from "./service";

interface HistoricalParams {
  period?: Query<'week' | 'month' | 'quarter'>;
  campaignId?: Query<number>;
}

interface HistoricalPerformanceResponse {
  data: Array<{
    date: string;
    spent: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
  }>;
  summary: {
    totalDays: number;
    averageSpent: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
  };
  trends: {
    spentTrend: number;
    ctrTrend: number;
    conversionTrend: number;
  };
}

// Retrieves historical performance data for specified period.
export const historical = api<HistoricalParams, HistoricalPerformanceResponse>(
  { expose: true, method: "GET", path: "/performance/historical" },
  async ({ period = 'month', campaignId }) => {
    const data = await performanceService.getHistoricalPerformance(campaignId, period);

    // Calculate summary metrics
    const summary = {
      totalDays: data.length,
      averageSpent: data.length > 0 ? data.reduce((sum, day) => sum + day.spent, 0) / data.length : 0,
      totalImpressions: data.reduce((sum, day) => sum + day.impressions, 0),
      totalClicks: data.reduce((sum, day) => sum + day.clicks, 0),
      totalConversions: data.reduce((sum, day) => sum + day.conversions, 0)
    };

    // Calculate trends (comparing first and second half of period)
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfAvgSpent = firstHalf.length > 0 
      ? firstHalf.reduce((sum, day) => sum + day.spent, 0) / firstHalf.length 
      : 0;
    const secondHalfAvgSpent = secondHalf.length > 0 
      ? secondHalf.reduce((sum, day) => sum + day.spent, 0) / secondHalf.length 
      : 0;

    const firstHalfAvgCtr = firstHalf.length > 0 
      ? firstHalf.reduce((sum, day) => sum + day.ctr, 0) / firstHalf.length 
      : 0;
    const secondHalfAvgCtr = secondHalf.length > 0 
      ? secondHalf.reduce((sum, day) => sum + day.ctr, 0) / secondHalf.length 
      : 0;

    const firstHalfConversions = firstHalf.reduce((sum, day) => sum + day.conversions, 0);
    const secondHalfConversions = secondHalf.reduce((sum, day) => sum + day.conversions, 0);

    const trends = {
      spentTrend: await performanceService.calculateTrendPercentage(secondHalfAvgSpent, firstHalfAvgSpent),
      ctrTrend: await performanceService.calculateTrendPercentage(secondHalfAvgCtr, firstHalfAvgCtr),
      conversionTrend: await performanceService.calculateTrendPercentage(secondHalfConversions, firstHalfConversions)
    };

    return {
      data,
      summary,
      trends
    };
  }
);
