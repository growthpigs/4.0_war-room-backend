import { secret } from "encore.dev/config";

export const mentionlyticsToken = secret("MENTIONLYTICS_TOKEN");
export const metaAccessToken = secret("META_ACCESS_TOKEN");
export const googleAdsToken = secret("GOOGLE_ADS_DEVELOPER_TOKEN");
export const twilioSid = secret("TWILIO_SID");
export const jwtSecret = secret("JWT_SECRET");
export const jwtRefreshSecret = secret("JWT_REFRESH_SECRET");
export const openaiApiKey = secret("OPENAI_API_KEY");
