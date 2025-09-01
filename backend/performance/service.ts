import { warRoomDB } from "../core/db";

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

    // Mock ROAS calculation (revenue / ad spend)
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

    // Define KPI targets and calculate status
    const kpis: KPIMetric[] = [
      {
        name: 'Click-Through Rate',
        value: overview.averageCtr,
        target: 2.5,
        trend: 'up',
        changePercent: 12.5,
        status: overview.averageCtr >= 2.0 ? 'good' : overview.averageCtr >= 1.0 ? 'warning' : 'critical'
      },
      {
        name: 'Cost Per Click',
        value: overview.averageCpc,
        target: 1.50,
        trend: 'down',
        changePercent: -8.3,
        status: overview.averageCpc <= 2.0 ? 'good' : overview.averageCpc <= 3.0 ? 'warning' : 'critical'
      },
      {
        name: 'Return on Ad Spend',
        value: overview.roas,
        target: 4.0,
        trend: 'up',
        changePercent: 15.2,
        status: overview.roas >= 3.0 ? 'good' : overview.roas >= 2.0 ? 'warning' : 'critical'
      },
      {
        name: 'Conversion Rate',
        value: overview.totalImpressions > 0 ? (overview.totalConversions / overview.totalClicks) * 100 : 0,
        target: 3.0,
        trend: 'stable',
        changePercent: 2.1,
        status: 'good'
      }
    ];

    return kpis;
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
}

export const performanceService = new PerformanceService();
