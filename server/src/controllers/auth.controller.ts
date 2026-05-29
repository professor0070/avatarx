import type { Request, Response } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import { sanitizeUser } from '../utils/sanitize';

export async function syncHandler(req: Request, res: Response) {
  // Use Clerk's auth object directly since this route shouldn't use the db-backed `authenticate`
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    return;
  }


  try {
    // Fast path: existing user — no Clerk API call needed
    let user = await User.findOne({ clerkId });
    if (user) {
      res.status(200).json({ ok: true, user: sanitizeUser(user) });
      return;
    }

    // New user: fetch from Clerk to get email/profile details
    console.log('[syncHandler] New user — fetching from Clerk:', clerkId);
    const clerkUser = await clerkClient.users.getUser(clerkId);
    console.log('[syncHandler] Fetched clerkUser:', clerkUser.id);

    const emailObj = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)
                  || clerkUser.emailAddresses[0];
    const email = emailObj?.emailAddress;

    if (!email) {
      console.warn('[syncHandler] Clerk user has no email address:', clerkId);
      res.status(400).json({ ok: false, error: { message: 'Clerk user has no email address.' } });
      return;
    }

    const displayName = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
      : 'User';

    const username = clerkUser.username || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 10000);

    // Try to find by email (legacy migration path)
    user = await User.findOne({ email });
    if (user) {
      // Link existing legacy account with the new Clerk ID
      user.clerkId = clerkId;
      user.isEmailVerified = true;
      await user.save();
    } else {
      // Brand new user
      user = await User.create({
        clerkId,
        email,
        username,
        displayName,
        role: 'user', // default role — RoleInterceptor will prompt them to choose
        isEmailVerified: true
      });
    }

    res.status(200).json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('[avatarx-server] sync error', err);
    res.status(500).json({ ok: false, error: { message: 'Internal server error during sync.' } });
  }
}

export async function meHandler(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ ok: false, error: { message: 'Unauthorized.' } });
    return;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found.' } });
      return;
    }
    res.status(200).json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('[avatarx-server] me error', err);
    res.status(500).json({ ok: false, error: { message: 'Internal server error.' } });
  }
}
