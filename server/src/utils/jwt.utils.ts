import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function getAccessSecret(): string {
  if (process.env.JWT_ACCESS_SECRET) {
    return process.env.JWT_ACCESS_SECRET;
  }
  if (process.env.JWT_SECRET) {
    // Split JWT_SECRET into two parts for access and refresh tokens
    const secret = process.env.JWT_SECRET;
    const mid = Math.floor(secret.length / 2);
    return secret.slice(0, mid);
  }
  // Fallback to robust internal secret
  return crypto.randomBytes(32).toString('base64');
}

function getRefreshSecret(): string {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }
  if (process.env.JWT_SECRET) {
    // Split JWT_SECRET into two parts for access and refresh tokens
    const secret = process.env.JWT_SECRET;
    const mid = Math.floor(secret.length / 2);
    return secret.slice(mid);
  }
  // Fallback to robust internal secret
  return crypto.randomBytes(32).toString('base64');
}

export interface AccessTokenPayload {
  userId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
}

export const REFRESH_COOKIE_NAME = 'avatarx_rt';

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};
