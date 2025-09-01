import { api } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CreateAlertRequest, CrisisAlert } from "./types";

// Creates a new crisis alert and triggers notifications.
export const create = api<CreateAlertRequest, CrisisAlert>(
  { expose: true, method: "POST", path: "/alerts" },
  async (req) => {
    const row = await warRoomDB.queryRow<CrisisAlert>`
      INSERT INTO crisis_alerts (
        campaign_id, alert_type, severity, title, description, source_url
      )
      VALUES (
        ${req.campaignId}, ${req.alertType}, ${req.severity}, ${req.title}, ${req.description}, ${req.sourceUrl}
      )
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
      throw new Error("Failed to create crisis alert");
    }
    
    // TODO: Trigger notifications to staff members
    // This would integrate with notification service using Twilio, email, etc.
    
    return row;
  }
);
