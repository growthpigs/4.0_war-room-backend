import { api, APIError } from "encore.dev/api";
import { CrisisEvent } from "./crisis";
import { warRoomDB } from "../core/db";

interface ResolveParams {
  id: string;
}

interface ResolveRequest {
  resolvedBy?: string;
  resolution?: string;
  preventiveMeasures?: string;
}

interface ResolveRequestWithParams extends ResolveRequest {
  id: string;
}

// Marks a crisis event as resolved.
export const resolve = api<ResolveRequestWithParams, CrisisEvent>(
  { expose: true, method: "PUT", path: "/monitoring/crisis/resolve/:id" },
  async ({ id, resolvedBy, resolution, preventiveMeasures }) => {
    const metadata = { resolvedBy, resolution, preventiveMeasures };

    const row = await warRoomDB.queryRow<CrisisEvent>`
      UPDATE crisis_events 
      SET 
        status = 'resolved',
        resolved_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
        updated_at = NOW()
      WHERE id = ${id} AND status IN ('active', 'acknowledged')
      RETURNING 
        id, title, description, severity, status,
        detected_at as "detectedAt", acknowledged_at as "acknowledgedAt", 
        resolved_at as "resolvedAt", mention_count as "mentionCount",
        negative_sentiment_ratio as "negativeSentimentRatio", 
        estimated_reach as "estimatedReach", metadata,
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    if (!row) {
      throw APIError.notFound("crisis event not found or already resolved");
    }

    return row;
  }
);
