import { api } from "encore.dev/api";
import { mentionsService } from "./service";

interface SyncRequest {
  campaignId: number;
  limit?: number;
  forceRefresh?: boolean;
}

interface SyncResponse {
  success: boolean;
  mentionsProcessed: number;
  newMentions: number;
  errors: string[];
  lastSyncAt: string;
}

// Manually syncs mentions with Mentionlytics API.
export const sync = api<SyncRequest, SyncResponse>(
  { expose: true, method: "POST", path: "/mentions/sync" },
  async (req) => {
    const errors: string[] = [];
    let mentionsProcessed = 0;
    let newMentions = 0;

    try {
      // Fetch mentions from Mentionlytics API
      const mentions = await mentionsService.fetchRecentMentions(req.limit || 100);
      mentionsProcessed = mentions.length;

      if (mentions.length > 0) {
        // Store mentions in database
        await mentionsService.storeMentions(mentions, req.campaignId);
        newMentions = mentions.length; // In real implementation, check for duplicates
      }

    } catch (error) {
      errors.push(`Failed to sync mentions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      mentionsProcessed,
      newMentions,
      errors,
      lastSyncAt: new Date().toISOString()
    };
  }
);
