import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { warRoomDB } from "../core/db";
import { MentionsListResponse, Mention } from "./types";

interface ListMentionsParams {
  campaignId?: Query<number>;
  platform?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

// Retrieves mentions with optional filtering by campaign and platform.
export const list = api<ListMentionsParams, MentionsListResponse>(
  { expose: true, method: "GET", path: "/mentions" },
  async ({ campaignId, platform, limit = 50, offset = 0 }) => {
    const mentions: Mention[] = [];
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (campaignId !== undefined) {
      conditions.push(`campaign_id = $${params.length + 1}`);
      params.push(campaignId);
    }
    
    if (platform !== undefined) {
      conditions.push(`platform = $${params.length + 1}`);
      params.push(platform);
    }
    
    params.push(limit, offset);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    
    const query = `
      SELECT 
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
      FROM mentions 
      ${whereClause}
      ORDER BY mentioned_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    for await (const row of warRoomDB.rawQuery<Mention>(query, ...params)) {
      mentions.push(row);
    }
    
    return { mentions };
  }
);
