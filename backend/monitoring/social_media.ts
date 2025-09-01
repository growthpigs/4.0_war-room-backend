import { api } from "encore.dev/api";
import { mentionlyticsToken, metaAccessToken, openaiApiKey } from "../core/config";
import { warRoomDB } from "../core/db";

interface MonitorSocialMediaRequest {
  campaignId: number;
  keywords: string[];
  platforms: string[];
}

interface SocialMediaMonitoringResponse {
  success: boolean;
  message: string;
  mentionsFound: number;
  pageInsights?: {
    reach: number;
    engagement: number;
    impressions: number;
  };
}

interface MetaPageInsights {
  data: Array<{
    name: string;
    values: Array<{
      value: number;
      end_time: string;
    }>;
  }>;
}

// Initiates social media monitoring for specified keywords and platforms.
export const monitorSocialMedia = api<MonitorSocialMediaRequest, SocialMediaMonitoringResponse>(
  { expose: true, method: "POST", path: "/monitoring/social-media" },
  async (req) => {
    const mentionlyticsApiKey = mentionlyticsToken();
    const metaToken = metaAccessToken();
    const aiToken = openaiApiKey();
    
    let mentionsFound = 0;
    let pageInsights;

    try {
      // 1. Fetch mentions from Mentionlytics
      if (req.platforms.includes('mentionlytics') || req.platforms.includes('all')) {
        try {
          const mentionlyticsResponse = await fetch('https://app.mentionlytics.com/api/mentions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${mentionlyticsApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              keywords: req.keywords,
              platforms: req.platforms.filter(p => p !== 'mentionlytics' && p !== 'all'),
              limit: 100
            })
          });

          if (mentionlyticsResponse.ok) {
            const mentionData = await mentionlyticsResponse.json();
            
            // Store mentions in database
            for (const mention of mentionData.data || []) {
              await warRoomDB.exec`
                INSERT INTO mentions (
                  campaign_id, platform, content, author, url, 
                  sentiment, reach, engagement, mentioned_at,
                  sentiment_score, reach_estimate, engagement_count, influence_score
                )
                VALUES (
                  ${req.campaignId}, ${mention.platform}, ${mention.content}, 
                  ${mention.author?.name || 'Unknown'}, ${mention.link || ''},
                  ${mention.sentiment?.score || 0}, ${mention.reach || 0}, 
                  ${mention.engagement || 0}, ${mention.published_at},
                  ${mention.sentiment?.score || 0}, ${mention.reach || 0}, 
                  ${mention.engagement || 0}, ${mention.author?.influence_score || 0}
                )
                ON CONFLICT DO NOTHING
              `;
              mentionsFound++;
            }
          }
        } catch (error) {
          console.error('Mentionlytics API error:', error);
        }
      }

      // 2. Fetch Meta (Facebook/Instagram) insights
      if (req.platforms.includes('facebook') || req.platforms.includes('instagram') || req.platforms.includes('all')) {
        try {
          const appId = '917316510623086';
          const pageId = `${appId}_page`; // This would be your actual page ID
          
          const metaResponse = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_reach,page_engaged_users&access_token=${metaToken}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );

          if (metaResponse.ok) {
            const insights: MetaPageInsights = await metaResponse.json();
            
            // Process insights data
            const reach = insights.data.find(d => d.name === 'page_reach')?.values[0]?.value || 0;
            const engagement = insights.data.find(d => d.name === 'page_engaged_users')?.values[0]?.value || 0;
            const impressions = insights.data.find(d => d.name === 'page_impressions')?.values[0]?.value || 0;
            
            pageInsights = { reach, engagement, impressions };

            // Store as performance metrics
            await warRoomDB.exec`
              INSERT INTO performance_metrics (campaign_id, platform, metric_type, metric_value, date)
              VALUES 
                (${req.campaignId}, 'facebook', 'reach', ${reach}, CURRENT_DATE),
                (${req.campaignId}, 'facebook', 'engagement', ${engagement}, CURRENT_DATE),
                (${req.campaignId}, 'facebook', 'impressions', ${impressions}, CURRENT_DATE)
              ON CONFLICT DO NOTHING
            `;
          }
        } catch (error) {
          console.error('Meta API error:', error);
        }
      }

      // 3. Additional platform monitoring could be added here

      return {
        success: true,
        message: `Started monitoring ${req.platforms.join(", ")} for ${req.keywords.length} keywords`,
        mentionsFound,
        pageInsights
      };
      
    } catch (error) {
      console.error('Social media monitoring error:', error);
      return {
        success: false,
        message: `Monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        mentionsFound: 0
      };
    }
  }
);
