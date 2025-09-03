import { api } from "encore.dev/api";

interface CatchAllRequest {
  path: string;
}

interface CatchAllResponse {
  error: string;
  status: number;
  timestamp: string;
  service: string;
}

// Catch-all handler to ensure pure JSON API responses - MUST be last handler registered
export const catchAll = api<CatchAllRequest, CatchAllResponse>(
  { expose: true, method: "*", path: "/*path" },
  async (req) => {
    const requestPath = req.path || '/';

    // Allow health endpoints to work
    if (requestPath === "health" || requestPath === "api/v1/health") {
      return {
        error: "Handled by health endpoint",
        status: 200,
        timestamp: new Date().toISOString(),
        service: "backend-api"
      };
    }

    // All other routes return structured JSON 404
    return {
      error: `API endpoint not found: ${requestPath}`,
      status: 404,
      timestamp: new Date().toISOString(),
      service: "backend-api"
    };
  }
);
