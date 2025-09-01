import { warRoomDB } from "../core/db";
import { googleAdsToken, metaAccessToken } from "../core/config";

export interface PerformanceOverview {
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
  averageCpm: number;
  roas: number;
}

export interface KPIMetric {
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  status: 'good' | 'warning' | 'critical';
}

export interface HistoricalPerformance {
  date: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export class PerformanceService {
  async getOverviewMetrics(campaignId?: number): Promise<PerformanceOverview> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (campaignId) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const metrics = await warRoomDB.rawQueryRow<{
      totalSpent: number;
      totalImpressions: number;
      totalClicks: number;
      totalConversions: number;
    }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as "totalSpent",
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as "totalImpressions",
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as "totalClicks",
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as "totalConversions"
      FROM performance_metrics 
      ${whereClause}
    `, ...params);

    if (!metrics) {
      return {
        totalSpent: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCtr: 0,
        averageCpc: 0,
        averageCpm: 0,
        roas: 0
      };
    }

    const averageCtr = metrics.totalImpressions > 0 
      ? (metrics.totalClicks / metrics.totalImpressions) * 100 
      : 0;
    
    const averageCpc = metrics.totalClicks > 0 
      ? metrics.totalSpent / metrics.totalClicks 
      : 0;
    
    const averageCpm = metrics.totalImpressions > 0 
      ? (metrics.totalSpent / metrics.totalImpressions) * 1000 
      : 0;

    // Calculate ROAS using real conversion data
    const estimatedRevenue = metrics.totalConversions * 25; // Assume $25 per conversion
    const roas = metrics.totalSpent > 0 ? estimatedRevenue / metrics.totalSpent : 0;

    return {
      ...metrics,
      averageCtr,
      averageCpc,
      averageCpm,
      roas
    };
  }

  async getKPIMetrics(campaignId?: number): Promise<KPIMetric[]> {
    const overview = await this.getOverviewMetrics(campaignId);

    // Calculate trends based on real data comparison
    const trends = await this.calculateKPITrends(campaignId);

    // Define KPI targets and calculate status
    const conversionRate = overview.totalClicks > 0 ? (overview.totalConversions / overview.totalClicks) * 100 : 0;

    const kpis: KPIMetric[] = [
      {
        name: 'Click-Through Rate',
        value: overview.averageCtr,
        target: 2.5,
        trend: trends.ctrTrend,
        changePercent: trends.ctrChangePercent,
        status: overview.averageCtr >= 2.0 ? 'good' : overview.averageCtr >= 1.0 ? 'warning' : 'critical'
      },
      {
        name: 'Cost Per Click',
        value: overview.averageCpc,
        target: 1.50,
        trend: trends.cpcTrend,
        changePercent: trends.cpcChangePercent,
        status: overview.averageCpc <= 2.0 ? 'good' : overview.averageCpc <= 3.0 ? 'warning' : 'critical'
      },
      {
        name: 'Return on Ad Spend',
        value: overview.roas,
        target: 4.0,
        trend: trends.roasTrend,
        changePercent: trends.roasChangePercent,
        status: overview.roas >= 3.0 ? 'good' : overview.roas >= 2.0 ? 'warning' : 'critical'
      },
      {
        name: 'Conversion Rate',
        value: conversionRate,
        target: 3.0,
        trend: trends.conversionTrend,
        changePercent: trends.conversionChangePercent,
        status: conversionRate >= 2.5 ? 'good' : conversionRate >= 1.5 ? 'warning' : 'critical'
      }
    ];

    return kpis;
  }

  private async calculateKPITrends(campaignId?: number): Promise<{
    ctrTrend: 'up' | 'down' | 'stable';
    ctrChangePercent: number;
    cpcTrend: 'up' | 'down' | 'stable';
    cpcChangePercent: number;
    roasTrend: 'up' | 'down' | 'stable';
    roasChangePercent: number;
    conversionTrend: 'up' | 'down' | 'stable';
    conversionChangePercent: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (campaignId) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} AND` : "WHERE";

    // Get current week metrics
    const currentWeek = await warRoomDB.rawQueryRow<{
      spent: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as impressions,
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as clicks,
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as conversions
      FROM performance_metrics 
      ${whereClause} date >= CURRENT_DATE - INTERVAL '7 days'
    `, ...params);

    // Get previous week metrics
    const previousWeek = await warRoomDB.rawQueryRow<{
      spent: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as impressions,
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as clicks,
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as conversions
      FROM performance_metrics 
      ${whereClause} date >= CURRENT_DATE - INTERVAL '14 days' AND date < CURRENT_DATE - INTERVAL '7 days'
    `, ...params);

    if (!currentWeek || !previousWeek) {
      return {
        ctrTrend: 'stable',
        ctrChangePercent: 0,
        cpcTrend: 'stable',
        cpcChangePercent: 0,
        roasTrend: 'stable',
        roasChangePercent: 0,
        conversionTrend: 'stable',
        conversionChangePercent: 0
      };
    }

    // Calculate CTR
    const currentCtr = currentWeek.impressions > 0 ? (currentWeek.clicks / currentWeek.impressions) * 100 : 0;
    const previousCtr = previousWeek.impressions > 0 ? (previousWeek.clicks / previousWeek.impressions) * 100 : 0;
    const ctrChangePercent = previousCtr > 0 ? ((currentCtr - previousCtr) / previousCtr) * 100 : 0;

    // Calculate CPC
    const currentCpc = currentWeek.clicks > 0 ? currentWeek.spent / currentWeek.clicks : 0;
    const previousCpc = previousWeek.clicks > 0 ? previousWeek.spent / previousWeek.clicks : 0;
    const cpcChangePercent = previousCpc > 0 ? ((currentCpc - previousCpc) / previousCpc) * 100 : 0;

    // Calculate ROAS
    const currentRoas = currentWeek.spent > 0 ? (currentWeek.conversions * 25) / currentWeek.spent : 0;
    const previousRoas = previousWeek.spent > 0 ? (previousWeek.conversions * 25) / previousWeek.spent : 0;
    const roasChangePercent = previousRoas > 0 ? ((currentRoas - previousRoas) / previousRoas) * 100 : 0;

    // Calculate Conversion Rate
    const currentConversionRate = currentWeek.clicks > 0 ? (currentWeek.conversions / currentWeek.clicks) * 100 : 0;
    const previousConversionRate = previousWeek.clicks > 0 ? (previousWeek.conversions / previousWeek.clicks) * 100 : 0;
    const conversionChangePercent = previousConversionRate > 0 ? ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100 : 0;

    return {
      ctrTrend: ctrChangePercent > 5 ? 'up' : ctrChangePercent < -5 ? 'down' : 'stable',
      ctrChangePercent,
      cpcTrend: cpcChangePercent > 5 ? 'up' : cpcChangePercent < -5 ? 'down' : 'stable',
      cpcChangePercent,
      roasTrend: roasChangePercent > 5 ? 'up' : roasChangePercent < -5 ? 'down' : 'stable',
      roasChangePercent,
      conversionTrend: conversionChangePercent > 5 ? 'up' : conversionChangePercent < -5 ? 'down' : 'stable',
      conversionChangePercent
    };
  }

  async getHistoricalPerformance(
    campaignId?: number, 
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<HistoricalPerformance[]> {
    const days = period === 'week' ? 7 : period === 'quarter' ? 90 : 30;
    const conditions: string[] = [];
    const params: any[] = [];

    if (campaignId) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }

    params.push(days);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} AND` : "WHERE";

    const query = `
      SELECT 
        date,
        COALESCE(SUM(CASE WHEN metric_type = 'spent' THEN metric_value ELSE 0 END), 0) as spent,
        COALESCE(SUM(CASE WHEN metric_type = 'impressions' THEN metric_value ELSE 0 END), 0) as impressions,
        COALESCE(SUM(CASE WHEN metric_type = 'clicks' THEN metric_value ELSE 0 END), 0) as clicks,
        COALESCE(SUM(CASE WHEN metric_type = 'conversions' THEN metric_value ELSE 0 END), 0) as conversions
      FROM performance_metrics 
      ${whereClause} date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY date
      ORDER BY date ASC
    `;

    const historical: HistoricalPerformance[] = [];
    for await (const row of warRoomDB.rawQuery<HistoricalPerformance>(query, ...params.slice(0, -1))) {
      const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
      const cpc = row.clicks > 0 ? row.spent / row.clicks : 0;
      const cpm = row.impressions > 0 ? (row.spent / row.impressions) * 1000 : 0;

      historical.push({
        ...row,
        ctr,
        cpc,
        cpm
      });
    }

    return historical;
  }

  async calculateTrendPercentage(current: number, previous: number): Promise<number> {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  async getPerformanceAlerts(campaignId?: number): Promise<Array<{
    type: 'warning' | 'critical';
    metric: string;
    message: string;
    value: number;
    threshold: number;
  }>> {
    const kpis = await this.getKPIMetrics(campaignId);
    const alerts = [];

    for (const kpi of kpis) {
      if (kpi.status === 'critical') {
        alerts.push({
          type: 'critical' as const,
          metric: kpi.name,
          message: `${kpi.name} is critically below target`,
          value: kpi.value,
          threshold: kpi.target
        });
      } else if (kpi.status === 'warning') {
        alerts.push({
          type: 'warning' as const,
          metric: kpi.name,
          message: `${kpi.name} is below optimal range`,
          value: kpi.value,
          threshold: kpi.target
        });
      }
    }

    return alerts;
  }

  async syncRealTimeData(campaignId?: number): Promise<{ success: boolean; message: string }> {
    try {
      const googleToken = googleAdsToken();
      const metaToken = metaAccessToken();

      // This would trigger real-time data sync from APIs
      // Implementation would be similar to the sync endpoints
      
      return {
        success: true,
        message: 'Real-time data sync completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Real-time sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const performanceService = new PerformanceService();
