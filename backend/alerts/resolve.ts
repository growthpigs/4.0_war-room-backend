import { api, APIError } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CrisisAlert } from "./types";

interface ResolveAlertParams {
  id: number;
}

// Marks a crisis alert as resolved.
export const resolve = api<ResolveAlertParams, CrisisAlert>(
  { expose: true, method: "POST", path: "/alerts/:id/resolve" },
  async ({ id }) => {
    const row = await warRoomDB.queryRow<CrisisAlert>`
      UPDATE crisis_alerts 
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = ${id} AND status = 'active'
      RETURNING 
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
    `;
    
    if (!row) {
      throw APIError.notFound("alert not found or already resolved");
    }
    
    return row;
  }
);
