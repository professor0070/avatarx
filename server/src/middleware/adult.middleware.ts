import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth.middleware';
import { User } from '../models/user.model';

interface AdultContentCheckResult {
  allowed: boolean;
  error?: { message: string; action?: string };
}

export async function checkAdultContentAccess(userId: string): Promise<AdultContentCheckResult> {
  try {
    const user = await User.findById(userId).select('isAgeVerified badges').lean();

    if (!user) {
      return { allowed: false, error: { message: 'User not found.' } };
    }

    if (!user.isAgeVerified) {
      return {
        allowed: false,
        error: { message: 'Age verification required to access adult content.', action: 'verify_age' },
      };
    }

    const adultBadges = ['AP', 'VIP', 'Marriage Pack'];
    const hasAdultBadge = user.badges.some((b) => adultBadges.includes(b));

    if (!hasAdultBadge) {
      return {
        allowed: false,
        error: { message: 'An adult badge (AP / VIP / Marriage Pack) is required.', action: 'acquire_badge' },
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: false, error: { message: 'Internal server error.' } };
  }
}

/**
 * Blocks access to adult content unless the user is:
 *  1. Authenticated
 *  2. Age verified (isAgeVerified === true)
 *  3. Holds at least one of the required badges (AP / VIP / Marriage Pack)
 */
export async function adultContentGate(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ ok: false, error: { message: 'Login required to access adult content.' } });
    return;
  }

  const result = await checkAdultContentAccess(req.userId);
  if (!result.allowed && result.error) {
    res.status(403).json({ ok: false, error: result.error });
    return;
  }

  next();
}
