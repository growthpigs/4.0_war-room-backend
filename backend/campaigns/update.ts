import { api, APIError } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { UpdateCampaignRequest, Campaign } from "./types";

interface UpdateCampaignParams {
  id: number;
}

interface UpdateCampaignRequestWithParams extends UpdateCampaignRequest {
  id: number;
}

// Updates an existing campaign.
export const update = api<UpdateCampaignRequestWithParams, Campaign>(
  { expose: true, method: "PUT", path: "/campaigns/:id" },
  async ({ id, ...updates }) => {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (updates.name !== undefined) {
      updateFields.push(`name = $${updateFields.length + 1}`);
      updateValues.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push(`description = $${updateFields.length + 1}`);
      updateValues.push(updates.description);
    }
    
    if (updates.startDate !== undefined) {
      updateFields.push(`start_date = $${updateFields.length + 1}`);
      updateValues.push(updates.startDate);
    }
    
    if (updates.endDate !== undefined) {
      updateFields.push(`end_date = $${updateFields.length + 1}`);
      updateValues.push(updates.endDate);
    }
    
    if (updates.budget !== undefined) {
      updateFields.push(`budget = $${updateFields.length + 1}`);
      updateValues.push(updates.budget);
    }
    
    if (updates.status !== undefined) {
      updateFields.push(`status = $${updateFields.length + 1}`);
      updateValues.push(updates.status);
    }
    
    if (updateFields.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    const query = `
      UPDATE campaigns 
      SET ${updateFields.join(", ")}
      WHERE id = $${updateValues.length}
      RETURNING 
        id,
        name,
        description,
        start_date as "startDate",
        end_date as "endDate",
        budget,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const row = await warRoomDB.rawQueryRow<Campaign>(query, ...updateValues);
    
    if (!row) {
      throw APIError.notFound("campaign not found");
    }
    
    return row;
  }
);
