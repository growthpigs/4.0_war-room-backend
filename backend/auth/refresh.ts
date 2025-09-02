import { api, APIError } from "encore.dev/api";
import { authService } from "./service";
import { RefreshRequest } from "./types";
import { rateLimiter } from "./ratelimit";

interface RefreshResponse {
  token: string;
  refreshToken: string;
}

// Refreshes an access token using a valid refresh token.
export const refresh = api<RefreshRequest, RefreshResponse>(
  { expose: true, method: "POST", path: "/api/v1/auth/refresh" },
  async (req) => {
    const ip = req.xForwardedFor?.split(',')[0].trim() || '127.0.0.1';
    rateLimiter(ip, { attempts: 10, windowMs: 60 * 1000 });

    const { refreshToken } = req;

    if (!refreshToken) {
      throw APIError.invalidArgument("Refresh token is required");
    }

    // Validate refresh token format
    if (!authService.verifyRefreshToken(refreshToken)) {
      throw APIError.unauthenticated("Invalid refresh token");
    }

    // Check if refresh token exists in database and is not expired
    const tokenRecord = await authService.validateRefreshToken(refreshToken);
    if (!tokenRecord) {
      throw APIError.unauthenticated("Invalid or expired refresh token");
    }

    // Get user data
    const user = await authService.findUserById(tokenRecord.userId);
    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Generate new tokens
    const newAccessToken = authService.generateAccessToken(user);
    const newRefreshToken = authService.generateRefreshToken();

    // Replace old refresh token with new one
    await authService.revokeRefreshToken(refreshToken);
    await authService.storeRefreshToken(user.id, newRefreshToken);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
);
