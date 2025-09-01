import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { AlertsSummary, SeverityStats, CrisisAlert } from "./types";

interface SummaryParams {
  campaignId?: Query<number>;
}

// Retrieves alerts summary statistics.
export const summary = api<SummaryParams, AlertsSummary>(
  { expose: true, method: "GET", path: "/alerts/summary" },
  async ({ campaignId }) => {
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    
    // Get overall stats
    const overallStats = await warRoomDB.rawQueryRow<{
      totalAlerts: number;
      activeAlerts: number;
      criticalAlerts: number;
    }>(`
      SELECT 
        COUNT(*)::INTEGER as "totalAlerts",
        COUNT(CASE WHEN status = 'active' THEN 1 END)::INTEGER as "activeAlerts",
        COUNT(CASE WHEN severity = 'critical' AND status = 'active' THEN 1 END)::INTEGER as "criticalAlerts"
      FROM crisis_alerts 
      ${whereClause}
    `, ...params);
    
    if (!overallStats) {
      throw new Error("Failed to retrieve alert statistics");
    }
    
    // Get severity breakdown
    const severityBreakdown: SeverityStats[] = [];
    for await (const row of warRoomDB.rawQuery<SeverityStats>(`
      SELECT 
        severity,
        COUNT(*)::INTEGER as count
      FROM crisis_alerts 
      ${whereClause}
      ${whereClause ? "AND" : "WHERE"} status = 'active'
      GROUP BY severity
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END
    `, ...params)) {
      severityBreakdown.push(row);
    }
    
    // Get recent alerts (last 10)
    const recentAlerts: CrisisAlert[] = [];
    for await (const row of warRoomDB.rawQuery<CrisisAlert>(`
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
      LIMIT 10
    `, ...params)) {
      recentAlerts.push(row);
    }
    
    return {
      ...overallStats,
      severityBreakdown,
      recentAlerts,
    };
  }
);
