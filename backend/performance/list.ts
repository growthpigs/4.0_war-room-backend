import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { MetricsListResponse, PerformanceMetric } from "./types";

interface ListMetricsParams {
  campaignId?: Query<number>;
  platform?: Query<string>;
  metricType?: Query<string>;
  startDate?: Query<string>;
  endDate?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

// Retrieves performance metrics with optional filtering.
export const list = api<ListMetricsParams, MetricsListResponse>(
  { expose: true, method: "GET", path: "/performance/metrics" },
  async ({ campaignId, platform, metricType, startDate, endDate, limit = 100, offset = 0 }) => {
    const metrics: PerformanceMetric[] = [];
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }
    
    if (platform !== undefined) {
      conditions.push(`platform = $${params.length + 1}`);
      params.push(platform);
    }
    
    if (metricType !== undefined) {
      conditions.push(`metric_type = $${params.length + 1}`);
      params.push(metricType);
    }
    
    if (startDate !== undefined) {
      conditions.push(`date >= $${params.length + 1}`);
      params.push(startDate);
    }
    
    if (endDate !== undefined) {
      conditions.push(`date <= $${params.length + 1}`);
      params.push(endDate);
    }
    
    params.push(limit, offset);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    
    const query = `
      SELECT 
        id,
        campaign_id as "campaignId",
        platform,
        metric_type as "metricType",
        metric_value as "metricValue",
        date,
        created_at as "createdAt"
      FROM performance_metrics 
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    for await (const row of warRoomDB.rawQuery<PerformanceMetric>(query, ...params)) {
      metrics.push(row);
    }
    
    return { metrics };
  }
);
