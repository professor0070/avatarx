import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { User } from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

export async function clerkWebhookHandler(req: Request, res: Response) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || 'test_secret';

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    res.status(500).json({ ok: false, error: 'Internal configuration error' });
    return;
  }

  // Get the headers and body
  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(401).json({ ok: false, error: 'Unauthorized: missing svix headers' });
    return;
  }

  // req.body should be a Buffer due to express.raw() in routes
  let payload: string;
  if (Buffer.isBuffer(req.body)) {
    payload = req.body.toString('utf8');
  } else if (typeof req.body === 'string') {
    payload = req.body;
  } else {
    payload = JSON.stringify(req.body);
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err: any) {
    console.error('[avatarx-server] Error verifying webhook:', err.message);
    res.status(401).json({ ok: false, error: 'Unauthorized: invalid signature' });
    return;
  }

  const { id } = evt.data;
  const eventType = evt.type;

  try {
    if (eventType === 'user.created') {
      const { email_addresses, username, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : '';
      const displayName = `${first_name || ''} ${last_name || ''}`.trim() || username || 'User';

      await User.findOneAndUpdate(
        { clerkId: id },
        {
          clerkId: id,
          username: username || `user_${id.substring(0,8)}`,
          email: primaryEmail,
          displayName: displayName,
          avatar: image_url || '',
          role: 'user', // Initial default
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`[avatarx-server] Clerk User synchronized`);
    } else if (eventType === 'user.deleted') {
      // Clean database lifecycle hook for orphaned context
      await User.findOneAndUpdate({ clerkId: id }, { banned: true, isAvailable: false });
      console.log(`[avatarx-server] Clerk User deactivated`);
    }

    res.status(200).json({ ok: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[avatarx-server] Webhook processing error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error processing webhook' });
  }
}
