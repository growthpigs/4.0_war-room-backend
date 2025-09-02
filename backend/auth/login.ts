import { api, APIError } from "encore.dev/api";
import { authService } from "./service";
import { LoginRequest, AuthResponse } from "./types";
import { rateLimiter } from "./ratelimit";

// Authenticates user credentials and returns JWT tokens.
export const login = api<LoginRequest, AuthResponse>(
  { expose: true, method: "POST", path: "/api/v1/auth/login" },
  async (req) => {
    const ip = req.xForwardedFor?.split(',')[0].trim() || '127.0.0.1';
    rateLimiter(ip, { attempts: 5, windowMs: 60 * 1000 });

    const { email, password } = req;

    // Validate input
    if (!email || !password) {
      throw APIError.invalidArgument("Email and password are required");
    }

    // Find user by email
    const userWithPassword = await authService.findUserByEmail(email);
    if (!userWithPassword) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, userWithPassword.passwordHash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Extract user data without password and extra fields
    const user = {
      id: userWithPassword.id,
      email: userWithPassword.email,
      name: userWithPassword.name,
      role: userWithPassword.role
    };

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
