import { api } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CampaignsListResponse, Campaign } from "./types";

// Retrieves all campaigns, ordered by creation date (latest first).
export const list = api<void, CampaignsListResponse>(
  { expose: true, method: "GET", path: "/campaigns" },
  async () => {
    const campaigns: Campaign[] = [];
    
    for await (const row of warRoomDB.query<Campaign>`
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
      ORDER BY created_at DESC
    `) {
      campaigns.push(row);
    }
    
    return { campaigns };
  }
);
