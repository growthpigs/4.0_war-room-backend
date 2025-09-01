import { api } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { CreateMentionRequest, Mention } from "./types";

// Creates a new mention record.
export const create = api<CreateMentionRequest, Mention>(
  { expose: true, method: "POST", path: "/mentions" },
  async (req) => {
    const row = await warRoomDB.queryRow<Mention>`
      INSERT INTO mentions (
        campaign_id, platform, content, author, url, 
        sentiment, reach, engagement, mentioned_at
      )
      VALUES (
        ${req.campaignId}, ${req.platform}, ${req.content}, ${req.author}, ${req.url},
        ${req.sentiment}, ${req.reach}, ${req.engagement}, ${req.mentionedAt}
      )
      RETURNING 
        id,
        campaign_id as "campaignId",
        platform,
        content,
        author,
        url,
        sentiment,
        reach,
        engagement,
        mentioned_at as "mentionedAt",
        created_at as "createdAt"
    `;
    
    if (!row) {
      throw new Error("Failed to create mention");
    }
    
    return row;
  }
);
