import { cron } from "encore.dev/cron";
import { authService } from "./service";
import log from "encore.dev/log";

// Cleanup expired refresh tokens daily at 2 AM UTC.
export const cleanupTokens = cron("cleanup-tokens", {
  schedule: "0 2 * * *", // Daily at 2 AM UTC
  handler: async () => {
    log.info("Running daily refresh token cleanup job...");
    try {
      await authService.cleanupExpiredTokens();
      log.info("Successfully cleaned up expired refresh tokens.");
    } catch (error) {
      log.error("Error during refresh token cleanup job:", { error });
    }
  },
});
