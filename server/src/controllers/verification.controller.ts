import type { Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';

export async function requestEmailVerificationHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({ ok: false, error: { message: 'Email already verified' } });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = token;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    console.log(`[avatarx-server] Email verification token for ${user.email}: ${token}`);

    res.json({
      ok: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('[avatarx-server] requestEmailVerification error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function confirmEmailHandler(req: AuthRequest, res: Response) {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ ok: false, error: { message: 'Verification token is required' } });
      return;
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ ok: false, error: { message: 'Invalid or expired verification token' } });
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ ok: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('[avatarx-server] confirmEmail error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function verifyCloudinaryHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { cloudinaryUsername } = req.body;
    if (!cloudinaryUsername) {
      res.status(400).json({ ok: false, error: { message: 'Cloudinary username required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    user.imvuUsername = cloudinaryUsername;
    user.isCloudinaryVerified = true;
    await user.save();

    res.json({
      ok: true,
      message: 'Cloudinary account verified successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] verifyCloudinary error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function verifyAgeHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { dateOfBirth } = req.body;
    if (!dateOfBirth) {
      res.status(400).json({ ok: false, error: { message: 'Date of birth required' } });
      return;
    }

    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      if (age - 1 < 18) {
        res.status(400).json({ ok: false, error: { message: 'You must be at least 18 years old' } });
        return;
      }
    } else if (age < 18) {
      res.status(400).json({ ok: false, error: { message: 'You must be at least 18 years old' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    user.isAgeVerified = true;
    await user.save();

    res.json({ ok: true, message: 'Age verified successfully' });
  } catch (error) {
    console.error('[avatarx-server] verifyAge error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function verifyIdHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { idNumber, idType } = req.body;
    if (!idNumber || !idType) {
      res.status(400).json({ ok: false, error: { message: 'ID number and type required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    if (user.isIdVerified) {
      res.status(400).json({ ok: false, error: { message: 'ID already verified' } });
      return;
    }

    user.isIdVerified = true;
    await user.save();

    res.json({ ok: true, message: 'ID verified successfully' });
  } catch (error) {
    console.error('[avatarx-server] verifyId error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function verifyProfileHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    if (user.isProfileVerified) {
      res.status(400).json({ ok: false, error: { message: 'Profile already verified' } });
      return;
    }

    if (!user.bio || !user.avatar || !user.skills || user.skills.length === 0) {
      res.status(400).json({
        ok: false,
        error: { message: 'Complete your profile (bio, avatar, and skills) before requesting verification' },
      });
      return;
    }

    user.isProfileVerified = true;
    user.verificationBadge = true;
    await user.save();

    res.json({ ok: true, message: 'Profile verified successfully' });
  } catch (error) {
    console.error('[avatarx-server] verifyProfile error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function getVerificationStatusHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({
      ok: true,
      verification: {
        email: user.isEmailVerified,
        cloudinary: user.isCloudinaryVerified,
        age: user.isAgeVerified,
        id: user.isIdVerified,
        profile: user.isProfileVerified,
        badge: user.verificationBadge,
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getVerificationStatus error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
