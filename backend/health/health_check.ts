import { api } from "encore.dev/api";
import { mentionsService } from "../mentions/service";
import { metaAccessToken, googleAdsToken } from "../core/config";

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    responseTime?: number;
  }>;
  timestamp: string;
}

// Checks health status of all external API integrations.
export const healthCheck = api<void, HealthCheckResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    const services = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check Mentionlytics API
    const startTime = Date.now();
    const mentionlyticsHealth = await mentionsService.healthCheck();
    const mentionlyticsResponseTime = Date.now() - startTime;
    
    services.push({
      name: 'Mentionlytics API',
      status: mentionlyticsHealth.status as 'healthy' | 'degraded' | 'unhealthy',
      message: mentionlyticsHealth.message,
      responseTime: mentionlyticsResponseTime
    });

    // Check Meta API
    const metaStartTime = Date.now();
    const metaHealth = await checkMetaAPI();
    const metaResponseTime = Date.now() - metaStartTime;
    
    services.push({
      name: 'Meta Business API',
      status: metaHealth.status,
      message: metaHealth.message,
      responseTime: metaResponseTime
    });

    // Check Google Ads API
    const googleStartTime = Date.now();
    const googleHealth = await checkGoogleAdsAPI();
    const googleResponseTime = Date.now() - googleStartTime;
    
    services.push({
      name: 'Google Ads API',
      status: googleHealth.status,
      message: googleHealth.message,
      responseTime: googleResponseTime
    });

    // Determine overall status
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');

    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString()
    };
  }
);

async function checkMetaAPI(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message: string }> {
  try {
    const metaToken = metaAccessToken();
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${metaToken}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (response.ok) {
      return { status: 'healthy', message: 'Meta API connection successful' };
    } else if (response.status === 429) {
      return { status: 'degraded', message: 'Meta API rate limited' };
    } else {
      return { status: 'unhealthy', message: `Meta API returned ${response.status}` };
    }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: `Meta API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

async function checkGoogleAdsAPI(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message: string }> {
  try {
    const googleToken = googleAdsToken();
    // Google Ads API requires customer ID for most endpoints, so we'll check the accessible customers endpoint
    const response = await fetch(
      'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'developer-token': googleToken,
          'Content-Type': 'application/json',
        }
      }
    );

    if (response.ok) {
      return { status: 'healthy', message: 'Google Ads API connection successful' };
    } else if (response.status === 429) {
      return { status: 'degraded', message: 'Google Ads API rate limited' };
    } else {
      return { status: 'unhealthy', message: `Google Ads API returned ${response.status}` };
    }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: `Google Ads API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
