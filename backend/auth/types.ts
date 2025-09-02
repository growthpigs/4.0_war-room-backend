import { Header } from "encore.dev/api";

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  xForwardedFor?: Header<"X-Forwarded-For">;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
}

export interface RefreshRequest {
  refreshToken: string;
  xForwardedFor?: Header<"X-Forwarded-For">;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}
