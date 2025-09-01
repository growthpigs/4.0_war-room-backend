import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { performanceService } from "./service";

interface KPITrackingParams {
  campaignId?: Query<number>;
  period?: Query<string>;
}

interface KPITrackingResponse {
  kpis: Array<{
    name: string;
    value: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
    status: 'good' | 'warning' | 'critical';
    history: Array<{
      date: string;
      value: number;
    }>;
  }>;
  summary: {
    kpisOnTarget: number;
    kpisNeedingAttention: number;
    overallHealth: 'good' | 'warning' | 'critical';
  };
  recommendations: Array<{
    kpi: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Retrieves core KPI monitoring and tracking data.
export const kpiTracking = api<KPITrackingParams, KPITrackingResponse>(
  { expose: true, method: "GET", path: "/performance/kpi-tracking" },
  async ({ campaignId, period = 'month' }) => {
    const kpis = await performanceService.getKPIMetrics(campaignId);

    // Add mock historical data for each KPI
    const enrichedKPIs = kpis.map(kpi => ({
      ...kpi,
      history: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: kpi.value * (0.8 + Math.random() * 0.4) // Mock variation
      }))
    }));

    // Calculate summary
    const kpisOnTarget = kpis.filter(kpi => kpi.status === 'good').length;
    const kpisNeedingAttention = kpis.filter(kpi => kpi.status !== 'good').length;
    const criticalKPIs = kpis.filter(kpi => kpi.status === 'critical').length;

    const overallHealth = criticalKPIs > 0 ? 'critical' as const : 
                         kpisNeedingAttention > kpisOnTarget ? 'warning' as const : 
                         'good' as const;

    // Generate recommendations
    const recommendations = [];
    for (const kpi of kpis) {
      if (kpi.status === 'critical') {
        recommendations.push({
          kpi: kpi.name,
          recommendation: `Immediate attention required: ${kpi.name} is significantly below target`,
          priority: 'high' as const
        });
      } else if (kpi.status === 'warning') {
        recommendations.push({
          kpi: kpi.name,
          recommendation: `Monitor and optimize: ${kpi.name} needs improvement`,
          priority: 'medium' as const
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        kpi: 'Overall',
        recommendation: 'All KPIs are performing well - continue current strategy',
        priority: 'low' as const
      });
    }

    return {
      kpis: enrichedKPIs,
      summary: {
        kpisOnTarget,
        kpisNeedingAttention,
        overallHealth
      },
      recommendations
    };
  }
);
