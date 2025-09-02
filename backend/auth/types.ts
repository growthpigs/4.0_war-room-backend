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
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenRecord {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  createdAt: string;
}
