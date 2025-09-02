import { api, Header } from "encore.dev/api";
import { withAuth } from "./middleware";
import { User } from "./types";

interface MeRequest {
  authorization?: Header<"Authorization">;
}

// Retrieves the current authenticated user's profile.
export const me = api<MeRequest, { user: User }>(
  { expose: true, method: "GET", path: "/api/v1/auth/me" },
  withAuth(async (req, ctx) => {
    // Get full user data from database
    const user = await ctx.user.id ? 
      (await import("./service")).authService.findUserById(ctx.user.id) : null;
    
    if (!user) {
      throw new (await import("encore.dev/api")).APIError.notFound("User not found");
    }

    return { user };
  })
);
