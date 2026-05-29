import type { NextFunction, Request, Response } from 'express';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { User } from '../models/user.model';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;       // activeRole (kept for backward compat)
  userRoles?: string[];    // all roles the user possesses
  auth?: {
    userId: string;
    sessionId: string;
    getToken: () => Promise<string>;
  };
}

// First, validate the Clerk token
const clerkAuth = clerkMiddleware();

export const authenticate = [
  clerkAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      const clerkId = auth?.userId;
      
      if (!clerkId) {
        res.status(401).json({ ok: false, error: { message: 'Unauthorized: No valid session token found' } });
        return;
      }

      // Fast lookup using sparse unique index - query for roles and activeRole
      const user = await User.findOne({ clerkId }).select('_id role roles activeRole');
      
      if (!user) {
        // If not found, it means they haven't synced yet.
        // We will reject it unless it's the sync route, but sync route shouldn't use this middleware.
        res.status(401).json({ ok: false, error: { message: 'User not synced with database.' } });
        return;
      }

      req.userId = user._id.toString();
      req.userRole = user.activeRole || user.role || 'buyer';
      req.userRoles = user.roles || (user.role ? [user.role] : ['buyer']);
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      res.status(500).json({ ok: false, error: { message: 'Internal server error during authentication.' } });
    }
  }
];

export function roleGuard(allowedRoles: string[]) {
  return [
    ...authenticate,
    (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.userRole || !allowedRoles.includes(req.userRole)) {
        res.status(403).json({
          ok: false,
          error: { message: `Forbidden: requires one of the following active roles: [${allowedRoles.join(', ')}]` }
        });
        return;
      }
      next();
    }
  ];
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const hasRole = req.userRoles?.some(r => roles.includes(r));
    if (!hasRole) {
      res.status(403).json({ ok: false, error: { message: 'Forbidden.' } });
      return;
    }
    next();
  };
}

export const sellerGuard = roleGuard(['seller', 'creator', 'admin', 'super_admin']);
