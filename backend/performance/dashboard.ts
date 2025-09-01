import { api, APIError } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { PerformanceDashboard, PlatformMetrics, TimeSeriesPoint } from "./types";

interface DashboardParams {
  campaignId: number;
}

// Retrieves performance dashboard data for a specific campaign.
export const dashboard = api<DashboardParams, PerformanceDashboard>(
  { expose: true, method: "GET", path: "/performance/:campaignId/dashboard" },
  async ({ campaignId }) => {
    // Verify campaign exists
    const campaignExists = await warRoomDB.queryRow`
      SELECT id FROM campaigns WHERE id = ${campaignId}
    `;
    
    if (!campaignExists) {
      throw APIError.notFound("campaign not found");
    }
    
    // Calculate aggregated metrics
    const aggregatedMetrics = await warRoomDB.queryRow<{
      totalSpent: number;
      totalImpressions: number;
      totalClicks: number;
      totalConversions: number;
    }>`
      SELECT 
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as "totalSpent",
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as "totalImpressions",
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as "totalClicks",
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as "totalConversions"
      FROM performance_metrics 
      WHERE campaign_id = ${campaignId}
    `;
    
    if (!aggregatedMetrics) {
      throw new Error("Failed to retrieve aggregated metrics");
    }
    
    const averageCtr = aggregatedMetrics.totalImpressions > 0 
      ? (aggregatedMetrics.totalClicks / aggregatedMetrics.totalImpressions) * 100 
      : 0;
    
    const averageCpc = aggregatedMetrics.totalClicks > 0 
      ? aggregatedMetrics.totalSpent / aggregatedMetrics.totalClicks 
      : 0;
    
    const averageCpm = aggregatedMetrics.totalImpressions > 0 
      ? (aggregatedMetrics.totalSpent / aggregatedMetrics.totalImpressions) * 1000 
      : 0;
    
    // Get platform-specific metrics
    const platformMetrics: PlatformMetrics[] = [];
    for await (const row of warRoomDB.query<{
      platform: string;
      spent: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>`
      SELECT 
        platform,
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as impressions,
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as clicks,
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as conversions
      FROM performance_metrics 
      WHERE campaign_id = ${campaignId}
      GROUP BY platform
      ORDER BY spent DESC
    `) {
      const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
      const cpc = row.clicks > 0 ? row.spent / row.clicks : 0;
      const cpm = row.impressions > 0 ? (row.spent / row.impressions) * 1000 : 0;
      
      platformMetrics.push({
        platform: row.platform,
        spent: row.spent,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.conversions,
        ctr,
        cpc,
        cpm,
      });
    }
    
    // Get time series data (last 30 days)
    const timeSeriesData: TimeSeriesPoint[] = [];
    for await (const row of warRoomDB.query<TimeSeriesPoint>`
      SELECT 
        date,
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as impressions,
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as clicks,
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as conversions
      FROM performance_metrics 
      WHERE campaign_id = ${campaignId}
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `) {
      timeSeriesData.push(row);
    }
    
    return {
      campaignId,
      totalSpent: aggregatedMetrics.totalSpent,
      totalImpressions: aggregatedMetrics.totalImpressions,
      totalClicks: aggregatedMetrics.totalClicks,
      totalConversions: aggregatedMetrics.totalConversions,
      averageCtr,
      averageCpc,
      averageCpm,
      platformMetrics,
      timeSeriesData,
    };
  }
);
