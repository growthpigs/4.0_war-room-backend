import { api } from "encore.dev/api";
import { authService } from "./service";
import { RegisterRequest, AuthResponse } from "./types";

// Registers a new user account and returns JWT tokens.
export const register = api<RegisterRequest, AuthResponse>(
  { expose: true, method: "POST", path: "/api/v1/auth/register" },
  async (req) => {
    const { email, password, name } = req;

    // Create user (validation happens in authService.createUser)
    const user = await authService.createUser(email, password, name);

    // Generate tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken();

    // Store refresh token
    await authService.storeRefreshToken(user.id, refreshToken);

    return {
      token: accessToken,
      refreshToken,
      user
    };
  }
);
