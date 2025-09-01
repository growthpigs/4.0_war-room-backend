import { api } from "encore.dev/api";
import { googleAdsToken, metaAccessToken } from "../core/config";

interface SyncPerformanceRequest {
  campaignId: number;
  platforms: string[];
  startDate: string;
  endDate: string;
}

interface PerformanceSyncResponse {
  success: boolean;
  message: string;
  metricsImported: number;
}

// Syncs performance data from advertising platforms.
export const syncPerformance = api<SyncPerformanceRequest, PerformanceSyncResponse>(
  { expose: true, method: "POST", path: "/monitoring/sync-performance" },
  async (req) => {
    const googleToken = googleAdsToken();
    const metaToken = metaAccessToken();
    
    // TODO: Implement actual performance data sync
    // 1. Query Google Ads API for campaign performance
    // 2. Query Meta Ads API for Facebook/Instagram performance
    // 3. Store metrics in performance_metrics table
    
    // For now, return a mock response
    return {
      success: true,
      message: `Synced performance data from ${req.platforms.join(", ")} for date range ${req.startDate} to ${req.endDate}`,
      metricsImported: 0,
    };
  }
);
