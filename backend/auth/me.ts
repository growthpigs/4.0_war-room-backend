import { api, Header } from "encore.dev/api";
import { withAuth } from "./middleware";

interface MeRequest {
  authorization?: Header<"Authorization">;
}

interface MeResponse {
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
    created_at: string;
  };
}

// Retrieves the current authenticated user's profile.
export const me = api<MeRequest, MeResponse>(
  { expose: true, method: "GET", path: "/api/v1/auth/me" },
  withAuth(async (req, ctx) => {
    // Get full user data from database
    const user = await ctx.user.id ? 
      (await import("./service")).authService.findUserById(ctx.user.id) : null;
    
    if (!user) {
      throw new (await import("encore.dev/api")).APIError.notFound("User not found");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        created_at: user.createdAt
      }
    };
  })
);
