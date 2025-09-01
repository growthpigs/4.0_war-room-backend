import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { CrisisEvent } from "./crisis";
import { warRoomDB } from "../core/db";

interface HistoryParams {
  status?: Query<string>;
  severity?: Query<number>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface HistoryResponse {
  events: CrisisEvent[];
  total: number;
  statistics: {
    averageResolutionTime: number;
    mostCommonSeverity: number;
    totalReach: number;
  };
}

// Retrieves historical crisis events.
export const history = api<HistoryParams, HistoryResponse>(
  { expose: true, method: "GET", path: "/monitoring/crisis/history" },
  async ({ status, severity, limit = 50, offset = 0 }) => {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (severity) {
      conditions.push(`severity = $${params.length + 1}`);
      params.push(severity);
    }

    params.push(limit, offset);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get events
    const events: CrisisEvent[] = [];
    const query = `
      SELECT 
        id, title, description, severity, status,
        detected_at as "detectedAt", acknowledged_at as "acknowledgedAt", 
        resolved_at as "resolvedAt", mention_count as "mentionCount",
        negative_sentiment_ratio as "negativeSentimentRatio", 
        estimated_reach as "estimatedReach", metadata,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM crisis_events
      ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    for await (const row of warRoomDB.rawQuery<CrisisEvent>(query, ...params)) {
      events.push(row);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::INTEGER as total
      FROM crisis_events
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalResult = await warRoomDB.rawQueryRow<{ total: number }>(countQuery, ...countParams);
    const total = totalResult?.total || 0;

    // Calculate statistics
    const stats = await warRoomDB.queryRow<{
      averageResolutionTime: number;
      mostCommonSeverity: number;
      totalReach: number;
    }>`
      SELECT 
        COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))/3600), 0) as "averageResolutionTime",
        COALESCE(MODE() WITHIN GROUP (ORDER BY severity), 1) as "mostCommonSeverity",
        COALESCE(SUM(estimated_reach), 0) as "totalReach"
      FROM crisis_events
      WHERE status = 'resolved'
    `;

    const statistics = stats || {
      averageResolutionTime: 0,
      mostCommonSeverity: 1,
      totalReach: 0
    };

    return {
      events,
      total,
      statistics
    };
  }
);
