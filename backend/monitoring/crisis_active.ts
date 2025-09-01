import { api } from "encore.dev/api";
import { CrisisEvent } from "./crisis";
import { warRoomDB } from "../core/db";

interface ActiveCrisesResponse {
  crises: CrisisEvent[];
  totalActive: number;
  criticalCount: number;
  estimatedTotalReach: number;
}

// Retrieves current active crisis events.
export const active = api<void, ActiveCrisesResponse>(
  { expose: true, method: "GET", path: "/monitoring/crisis/active" },
  async () => {
    const activeCrises: CrisisEvent[] = [];
    let totalActive = 0;
    let criticalCount = 0;
    let estimatedTotalReach = 0;

    for await (const row of warRoomDB.query<CrisisEvent>`
      SELECT 
        id, title, description, severity, status,
        detected_at as "detectedAt", acknowledged_at as "acknowledgedAt", 
        resolved_at as "resolvedAt", mention_count as "mentionCount",
        negative_sentiment_ratio as "negativeSentimentRatio", 
        estimated_reach as "estimatedReach", metadata,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM crisis_events
      WHERE status IN ('active', 'acknowledged')
      ORDER BY severity DESC, detected_at DESC
    `) {
      activeCrises.push(row);
      totalActive++;
      if (row.severity >= 9) criticalCount++;
      estimatedTotalReach += row.estimatedReach || 0;
    }

    return {
      crises: activeCrises,
      totalActive,
      criticalCount,
      estimatedTotalReach
    };
  }
);
