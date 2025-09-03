import { api } from "encore.dev/api";

interface CatchAllRequest {
  path: string;
}

// Health endpoint
export const health = api(
  { expose: true, method: "GET", path: "/api/v1/health" },
  async (): Promise<{ status: string; timestamp: string; service: string }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "admin"
    };
  }
);

// CRITICAL: Catch-all MUST be last
export const catchAll = api<CatchAllRequest, { error: string; status: number; timestamp: string }>(
  { expose: true, method: "*", path: "/*path" },
  async (req): Promise<{ error: string; status: number; timestamp: string }> => {
    return {
      error: `API endpoint not found: ${req.path}`,
      status: 404,
      timestamp: new Date().toISOString()
    };
  }
);
