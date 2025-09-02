import { api, Header } from "encore.dev/api";
import { withAuth } from "./middleware";
import { authService } from "./service";
import { LogoutResponse } from "./types";

interface LogoutRequest {
  authorization?: Header<"Authorization">;
}

// Logs out the user by invalidating their refresh tokens.
export const logout = api<LogoutRequest, LogoutResponse>(
  { expose: true, method: "POST", path: "/api/v1/auth/logout" },
  withAuth(async (req, ctx) => {
    // Revoke all refresh tokens for the user
    await authService.revokeAllUserRefreshTokens(ctx.user.id);

    return {
      success: true,
      message: "Logged out successfully"
    };
  })
);
