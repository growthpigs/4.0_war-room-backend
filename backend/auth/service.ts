import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { warRoomDB } from "../core/db";
import { jwtSecret, jwtRefreshSecret } from "../core/config";
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
    this.jwtRefreshSecret = jwtRefreshSecret();
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  validatePasswordPolicy(password: string): void {
    if (password.length < 8) {
      throw APIError.invalidArgument("Password must be at least 8 characters long");
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      throw APIError.invalidArgument(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }
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
      { type: 'refresh', timestamp: Date.now(), random: crypto.randomBytes(16).toString('hex') },
      this.jwtRefreshSecret,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw APIError.invalidArgument("Invalid email format");
    }

    // Validate password policy
    this.validatePasswordPolicy(password);

    const passwordHash = await this.hashPassword(password);

    try {
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
    } catch (error: any) {
      // Handle unique constraint violation for email
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw APIError.invalidArgument("Email already in use");
      }
      throw APIError.internal("Failed to create user");
    }
  }

  async storeRefreshToken(userId: number, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000);
    const tokenHash = this.hashRefreshToken(token);
    
    await warRoomDB.exec`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    `;
  }

  async validateRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    const tokenHash = this.hashRefreshToken(token);
    
    const record = await warRoomDB.queryRow<RefreshTokenRecord>`
      SELECT 
        id,
        user_id as "userId",
        token_hash as "tokenHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM refresh_tokens 
      WHERE token_hash = ${tokenHash} 
        AND expires_at > NOW()
    `;
    return record;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(token);
    
    await warRoomDB.exec`
      DELETE FROM refresh_tokens 
      WHERE token_hash = ${tokenHash}
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
