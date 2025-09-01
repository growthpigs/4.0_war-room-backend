import { api } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CreateMetricRequest, PerformanceMetric } from "./types";

// Creates a new performance metric record.
export const create = api<CreateMetricRequest, PerformanceMetric>(
  { expose: true, method: "POST", path: "/performance/metrics" },
  async (req) => {
    const row = await warRoomDB.queryRow<PerformanceMetric>`
      INSERT INTO performance_metrics (
        campaign_id, platform, metric_type, metric_value, date
      )
      VALUES (
        ${req.campaignId}, ${req.platform}, ${req.metricType}, ${req.metricValue}, ${req.date}
      )
      RETURNING 
        id,
        campaign_id as "campaignId",
        platform,
        metric_type as "metricType",
        metric_value as "metricValue",
        date,
        created_at as "createdAt"
    `;
    
    if (!row) {
      throw new Error("Failed to create performance metric");
    }
    
    return row;
  }
);
