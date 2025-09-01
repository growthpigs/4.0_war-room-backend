import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { AlertsListResponse, CrisisAlert } from "./types";

interface ListAlertsParams {
  campaignId?: Query<number>;
  status?: Query<string>;
  severity?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

// Retrieves crisis alerts with optional filtering.
export const list = api<ListAlertsParams, AlertsListResponse>(
  { expose: true, method: "GET", path: "/alerts" },
  async ({ campaignId, status, severity, limit = 50, offset = 0 }) => {
    const alerts: CrisisAlert[] = [];
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }
    
    if (status !== undefined) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (severity !== undefined) {
      conditions.push(`severity = $${params.length + 1}`);
      params.push(severity);
    }
    
    params.push(limit, offset);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    
    const query = `
      SELECT 
        id,
        campaign_id as "campaignId",
        alert_type as "alertType",
        severity,
        title,
        description,
        source_url as "sourceUrl",
        triggered_at as "triggeredAt",
        resolved_at as "resolvedAt",
        status
      FROM crisis_alerts 
      ${whereClause}
      ORDER BY triggered_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    for await (const row of warRoomDB.rawQuery<CrisisAlert>(query, ...params)) {
      alerts.push(row);
    }
    
    return { alerts };
  }
);
