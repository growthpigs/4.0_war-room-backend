import { api, APIError } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { Campaign } from "./types";

interface GetCampaignParams {
  id: number;
}

// Retrieves a specific campaign by ID.
export const get = api<GetCampaignParams, Campaign>(
  { expose: true, method: "GET", path: "/campaigns/:id" },
  async ({ id }) => {
    const row = await warRoomDB.queryRow<Campaign>`
      SELECT 
        id,
        name,
        description,
        start_date as "startDate",
        end_date as "endDate",
        budget,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM campaigns 
      WHERE id = ${id}
    `;
    
    if (!row) {
      throw APIError.notFound("campaign not found");
    }
    
    return row;
  }
);
