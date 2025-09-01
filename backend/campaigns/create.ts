import { api } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CreateCampaignRequest, Campaign } from "./types";

// Creates a new campaign.
export const create = api<CreateCampaignRequest, Campaign>(
  { expose: true, method: "POST", path: "/campaigns" },
  async (req) => {
    const row = await warRoomDB.queryRow<Campaign>`
      INSERT INTO campaigns (name, description, start_date, end_date, budget)
      VALUES (${req.name}, ${req.description}, ${req.startDate}, ${req.endDate}, ${req.budget})
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
    
    if (!row) {
      throw new Error("Failed to create campaign");
    }
    
    return row;
  }
);
