import { api, APIError } from "encore.dev/api";
import { CrisisEvent } from "./crisis";
import { warRoomDB } from "../core/db";

interface AcknowledgeParams {
  id: string;
}

interface AcknowledgeRequest {
  acknowledgedBy?: string;
  notes?: string;
}

interface AcknowledgeRequestWithParams extends AcknowledgeRequest {
  id: string;
}

// Acknowledges a crisis event.
export const acknowledge = api<AcknowledgeRequestWithParams, CrisisEvent>(
  { expose: true, method: "POST", path: "/monitoring/crisis/acknowledge/:id" },
  async ({ id, acknowledgedBy, notes }) => {
    const metadata = notes ? { acknowledgedBy, notes } : { acknowledgedBy };

    const row = await warRoomDB.queryRow<CrisisEvent>`
      UPDATE crisis_events 
      SET 
        status = 'acknowledged',
        acknowledged_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
        updated_at = NOW()
      WHERE id = ${id} AND status = 'active'
      RETURNING 
        id, title, description, severity, status,
        detected_at as "detectedAt", acknowledged_at as "acknowledgedAt", 
        resolved_at as "resolvedAt", mention_count as "mentionCount",
        negative_sentiment_ratio as "negativeSentimentRatio", 
        estimated_reach as "estimatedReach", metadata,
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    if (!row) {
      throw APIError.notFound("crisis event not found or already acknowledged");
    }

    return row;
  }
);
