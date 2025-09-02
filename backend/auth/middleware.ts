import { Header, APIError } from "encore.dev/api";
import { authService } from "./service";

export interface AuthContext {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export function withAuth<T extends { authorization?: Header<"Authorization"> }>(
  handler: (req: T, ctx: AuthContext) => Promise<any>
) {
  return async (req: T) => {
    const authHeader = req.authorization;
    const token = authService.extractBearerToken(authHeader);
    
    if (!token) {
      throw APIError.unauthenticated("Missing authorization token");
    }

    const payload = authService.verifyAccessToken(token);
    
    const ctx: AuthContext = {
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role
      }
    };

    return handler(req, ctx);
  };
}
