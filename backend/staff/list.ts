import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { StaffListResponse, StaffMember } from "../alerts/types";

interface ListStaffParams {
  campaignId?: Query<number>;
  role?: Query<string>;
}

// Retrieves staff members with optional filtering.
export const list = api<ListStaffParams, StaffListResponse>(
  { expose: true, method: "GET", path: "/staff" },
  async ({ campaignId, role }) => {
    const staff: StaffMember[] = [];
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }
    
    if (role !== undefined) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    
    const query = `
      SELECT 
        id,
        campaign_id as "campaignId",
        name,
        email,
        phone,
        role,
        alert_preferences as "alertPreferences",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM staff_members 
      ${whereClause}
      ORDER BY created_at ASC
    `;
    
    for await (const row of warRoomDB.rawQuery<StaffMember>(query, ...params)) {
      staff.push(row);
    }
    
    return { staff };
  }
);
