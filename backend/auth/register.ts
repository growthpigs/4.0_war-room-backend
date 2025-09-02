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

    // Extract user data without extra fields
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    // Generate tokens
    const accessToken = authService.generateAccessToken(userData);
    const refreshToken = authService.generateRefreshToken();

    // Store refresh token
    await authService.storeRefreshToken(userData.id, refreshToken);

    return {
      token: accessToken,
      refreshToken,
      user: userData
    };
  }
);
