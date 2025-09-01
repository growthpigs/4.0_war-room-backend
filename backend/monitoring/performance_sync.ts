import { api } from "encore.dev/api";
import { googleAdsToken, metaAccessToken } from "../core/config";
import { warRoomDB } from "../core/db";

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
  platformResults: Array<{
    platform: string;
    success: boolean;
    metricsCount: number;
    error?: string;
  }>;
}

interface GoogleAdsMetrics {
  metrics: {
    impressions: string;
    clicks: string;
    cost_micros: string;
    conversions: string;
  };
  segments: {
    date: string;
  };
}

interface MetaAdsInsights {
  data: Array<{
    impressions: string;
    clicks: string;
    spend: string;
    actions?: Array<{
      action_type: string;
      value: string;
    }>;
    date_start: string;
  }>;
}

// Syncs performance data from advertising platforms.
export const syncPerformance = api<SyncPerformanceRequest, PerformanceSyncResponse>(
  { expose: true, method: "POST", path: "/monitoring/sync-performance" },
  async (req) => {
    const googleToken = googleAdsToken();
    const metaToken = metaAccessToken();
    
    let totalMetricsImported = 0;
    const platformResults: Array<{
      platform: string;
      success: boolean;
      metricsCount: number;
      error?: string;
    }> = [];

    // 1. Sync Google Ads data
    if (req.platforms.includes('google_ads') || req.platforms.includes('all')) {
      try {
        const customerId = '1234567890'; // This would be your actual customer ID
        
        const googleAdsResponse = await fetch(
          `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:searchStream`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleToken}`,
              'developer-token': googleToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                SELECT 
                  campaign.id,
                  metrics.impressions,
                  metrics.clicks,
                  metrics.cost_micros,
                  metrics.conversions,
                  segments.date
                FROM campaign 
                WHERE segments.date BETWEEN '${req.startDate}' AND '${req.endDate}'
              `
            })
          }
        );

        if (googleAdsResponse.ok) {
          const responseData = await googleAdsResponse.json();
          let googleMetricsCount = 0;

          // Process Google Ads metrics
          for (const result of responseData.results || []) {
            const metrics = result as GoogleAdsMetrics;
            
            // Convert cost from micros to dollars
            const cost = parseInt(metrics.metrics.cost_micros) / 1000000;
            
            // Store metrics
            await warRoomDB.exec`
              INSERT INTO performance_metrics (campaign_id, platform, metric_type, metric_value, date)
              VALUES 
                (${req.campaignId}, 'google_ads', 'impressions', ${parseInt(metrics.metrics.impressions)}, ${metrics.segments.date}),
                (${req.campaignId}, 'google_ads', 'clicks', ${parseInt(metrics.metrics.clicks)}, ${metrics.segments.date}),
                (${req.campaignId}, 'google_ads', 'spent', ${cost}, ${metrics.segments.date}),
                (${req.campaignId}, 'google_ads', 'conversions', ${parseFloat(metrics.metrics.conversions)}, ${metrics.segments.date})
              ON CONFLICT DO NOTHING
            `;
            
            googleMetricsCount += 4; // 4 metrics per day
          }

          totalMetricsImported += googleMetricsCount;
          platformResults.push({
            platform: 'google_ads',
            success: true,
            metricsCount: googleMetricsCount
          });
        } else {
          throw new Error(`Google Ads API returned ${googleAdsResponse.status}`);
        }
      } catch (error) {
        console.error('Google Ads sync error:', error);
        platformResults.push({
          platform: 'google_ads',
          success: false,
          metricsCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 2. Sync Meta Ads data
    if (req.platforms.includes('meta_ads') || req.platforms.includes('facebook') || req.platforms.includes('instagram') || req.platforms.includes('all')) {
      try {
        const adAccountId = 'act_1234567890'; // This would be your actual ad account ID
        
        const metaAdsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=impressions,clicks,spend,actions&time_range={'since':'${req.startDate}','until':'${req.endDate}'}&access_token=${metaToken}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (metaAdsResponse.ok) {
          const insights: MetaAdsInsights = await metaAdsResponse.json();
          let metaMetricsCount = 0;

          // Process Meta Ads insights
          for (const insight of insights.data || []) {
            const conversions = insight.actions?.find(action => 
              action.action_type === 'offsite_conversion.fb_pixel_purchase'
            )?.value || '0';

            // Store metrics
            await warRoomDB.exec`
              INSERT INTO performance_metrics (campaign_id, platform, metric_type, metric_value, date)
              VALUES 
                (${req.campaignId}, 'meta_ads', 'impressions', ${parseInt(insight.impressions)}, ${insight.date_start}),
                (${req.campaignId}, 'meta_ads', 'clicks', ${parseInt(insight.clicks)}, ${insight.date_start}),
                (${req.campaignId}, 'meta_ads', 'spent', ${parseFloat(insight.spend)}, ${insight.date_start}),
                (${req.campaignId}, 'meta_ads', 'conversions', ${parseFloat(conversions)}, ${insight.date_start})
              ON CONFLICT DO NOTHING
            `;
            
            metaMetricsCount += 4; // 4 metrics per day
          }

          totalMetricsImported += metaMetricsCount;
          platformResults.push({
            platform: 'meta_ads',
            success: true,
            metricsCount: metaMetricsCount
          });
        } else {
          throw new Error(`Meta Ads API returned ${metaAdsResponse.status}`);
        }
      } catch (error) {
        console.error('Meta Ads sync error:', error);
        platformResults.push({
          platform: 'meta_ads',
          success: false,
          metricsCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulSyncs = platformResults.filter(r => r.success).length;
    const allSuccessful = successfulSyncs === platformResults.length;

    return {
      success: allSuccessful,
      message: allSuccessful 
        ? `Successfully synced performance data from ${successfulSyncs} platforms`
        : `Partial sync completed: ${successfulSyncs}/${platformResults.length} platforms successful`,
      metricsImported: totalMetricsImported,
      platformResults
    };
  }
);
