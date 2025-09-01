import { api } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CreateStaffMemberRequest, StaffMember } from "../alerts/types";

// Creates a new staff member for a campaign.
export const create = api<CreateStaffMemberRequest, StaffMember>(
  { expose: true, method: "POST", path: "/staff" },
  async (req) => {
    const row = await warRoomDB.queryRow<StaffMember>`
      INSERT INTO staff_members (
        campaign_id, name, email, phone, role, alert_preferences
      )
      VALUES (
        ${req.campaignId}, ${req.name}, ${req.email}, ${req.phone}, ${req.role}, ${JSON.stringify(req.alertPreferences)}
      )
      RETURNING 
        id,
        campaign_id as "campaignId",
        name,
        email,
        phone,
        role,
        alert_preferences as "alertPreferences",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    if (!row) {
      throw new Error("Failed to create staff member");
    }
    
    return row;
  }
);
