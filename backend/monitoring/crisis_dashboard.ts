import { api } from "encore.dev/api";
import { crisisEngine, CrisisEvent } from "./crisis";
import { warRoomDB } from "../core/db";

interface CrisisDashboardResponse {
  activeCrises: number;
  totalCrises: number;
  averageSeverity: number;
  recentEvents: CrisisEvent[];
  severityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  statusBreakdown: {
    active: number;
    acknowledged: number;
    resolved: number;
  };
  timeToResolution: {
    average: number;
    median: number;
  };
}

// Retrieves crisis dashboard overview.
export const dashboard = api<void, CrisisDashboardResponse>(
  { expose: true, method: "GET", path: "/monitoring/crisis/dashboard" },
  async () => {
    // Get overall statistics
    const stats = await warRoomDB.queryRow<{
      activeCrises: number;
      totalCrises: number;
      averageSeverity: number;
    }>`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END)::INTEGER as "activeCrises",
        COUNT(*)::INTEGER as "totalCrises",
        COALESCE(AVG(severity), 0) as "averageSeverity"
      FROM crisis_events
    `;

    if (!stats) {
      throw new Error("Failed to retrieve crisis statistics");
    }

    // Get recent events (last 10)
    const recentEvents: CrisisEvent[] = [];
    for await (const row of warRoomDB.query<CrisisEvent>`
      SELECT 
        id, title, description, severity, status,
        detected_at as "detectedAt", acknowledged_at as "acknowledgedAt", 
        resolved_at as "resolvedAt", mention_count as "mentionCount",
        negative_sentiment_ratio as "negativeSentimentRatio", 
        estimated_reach as "estimatedReach", metadata,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM crisis_events
      ORDER BY detected_at DESC
      LIMIT 10
    `) {
      recentEvents.push(row);
    }

    // Get severity distribution
    const severityDist = await warRoomDB.queryRow<{
      low: number;
      medium: number;
      high: number;
      critical: number;
    }>`
      SELECT 
        COUNT(CASE WHEN severity >= 1 AND severity <= 3 THEN 1 END)::INTEGER as low,
        COUNT(CASE WHEN severity >= 4 AND severity <= 6 THEN 1 END)::INTEGER as medium,
        COUNT(CASE WHEN severity >= 7 AND severity <= 8 THEN 1 END)::INTEGER as high,
        COUNT(CASE WHEN severity >= 9 AND severity <= 10 THEN 1 END)::INTEGER as critical
      FROM crisis_events
    `;

    // Get status breakdown
    const statusBreakdown = await warRoomDB.queryRow<{
      active: number;
      acknowledged: number;
      resolved: number;
    }>`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END)::INTEGER as active,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END)::INTEGER as acknowledged,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::INTEGER as resolved
      FROM crisis_events
    `;

    // Calculate time to resolution (mock data for now)
    const timeToResolution = {
      average: 4.2, // hours
      median: 3.1   // hours
    };

    return {
      ...stats,
      recentEvents,
      severityDistribution: severityDist || { low: 0, medium: 0, high: 0, critical: 0 },
      statusBreakdown: statusBreakdown || { active: 0, acknowledged: 0, resolved: 0 },
      timeToResolution
    };
  }
);
