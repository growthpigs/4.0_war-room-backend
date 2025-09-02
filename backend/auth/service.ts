import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { warRoomDB } from "../core/db";
import { jwtSecret } from "../core/config";
import { User, UserWithPassword, RefreshTokenRecord } from "./types";
import { APIError } from "encore.dev/api";

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
  private readonly SALT_ROUNDS = 12;

  constructor() {
    this.jwtSecret = jwtSecret();
    this.jwtRefreshSecret = `${jwtSecret()}_refresh`; // Using same secret with suffix for refresh
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  generateAccessToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'war-room-auth'
    });
  }

  generateRefreshToken(): string {
    return jwt.sign(
      { type: 'refresh', timestamp: Date.now() },
      this.jwtRefreshSecret,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw APIError.unauthenticated("Token expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw APIError.unauthenticated("Invalid token");
      }
      throw APIError.unauthenticated("Token verification failed");
    }
  }

  verifyRefreshToken(token: string): boolean {
    try {
      jwt.verify(token, this.jwtRefreshSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const user = await warRoomDB.queryRow<UserWithPassword>`
      SELECT 
        id,
        email,
        name,
        role,
        password_hash as "passwordHash",
        created_at as "createdAt"
      FROM users 
      WHERE email = ${email}
    `;
    return user;
  }

  async findUserById(id: number): Promise<User | null> {
    const user = await warRoomDB.queryRow<User>`
      SELECT 
        id,
        email,
        name,
        role,
        created_at as "createdAt"
      FROM users 
      WHERE id = ${id}
    `;
    return user;
  }

  async createUser(email: string, password: string, name: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw APIError.invalidArgument("Invalid email format");
    }

    // Validate password strength
    if (password.length < 8) {
      throw APIError.invalidArgument("Password must be at least 8 characters long");
    }

    const passwordHash = await this.hashPassword(password);

    const user = await warRoomDB.queryRow<User>`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email}, ${passwordHash}, ${name}, 'user')
      RETURNING 
        id,
        email,
        name,
        role,
        created_at as "createdAt"
    `;

    if (!user) {
      throw APIError.internal("Failed to create user");
    }

    return user;
  }

  async storeRefreshToken(userId: number, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000);
    
    await warRoomDB.exec`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
    `;
  }

  async validateRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const record = await warRoomDB.queryRow<RefreshTokenRecord>`
      SELECT 
        id,
        user_id as "userId",
        token,
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM refresh_tokens 
      WHERE token = ${token} 
        AND expires_at > NOW()
    `;
    return record;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await warRoomDB.exec`
      DELETE FROM refresh_tokens 
      WHERE token = ${token}
    `;
  }

  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await warRoomDB.exec`
      DELETE FROM refresh_tokens 
      WHERE user_id = ${userId}
    `;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await warRoomDB.exec`
      DELETE FROM refresh_tokens 
      WHERE expires_at <= NOW()
    `;
  }

  extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

export const authService = new AuthService();
