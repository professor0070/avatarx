import type { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Gig } from '../models/gig.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import { calculateSellerLevel, recalculateAllSellerLevels, getSellerLevelRequirements } from '../services/seller-level.service';
import { sanitizeUser } from '../utils/sanitize';

// Get user by ID
export async function getUserByIdHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({
      ok: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[avatarx-server] getUserById error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get current user profile
export async function getCurrentUserHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId).lean();

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({
      ok: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[avatarx-server] getCurrentUser error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Update user profile
export async function updateUserHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const updates = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    // Update allowed fields
    const allowedUpdates = ['displayName', 'bio', 'skills', 'languages', 'certifications', 'portfolio', 'isAvailable', 'outOfOfficeUntil', 'payoutMethods', 'hasAcceptedCreatorPolicy'];
    
    // Role update logic (only allow if unassigned or legacy 'user' mode)
    if (updates.role && (user.role === 'user' || user.role === 'buyer')) {
      if (['buyer', 'seller', 'creator'].includes(updates.role)) {
        if (!user.roles.includes(updates.role)) {
          user.roles.push(updates.role);
        }
        user.activeRole = updates.role as any;
      }
    }

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (user as any)[field] = updates[field];
      }
    });

    await user.save();

    res.json({
      ok: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[avatarx-server] updateUser error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Calculate seller level for current user
export async function calculateSellerLevelHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.roles.includes('seller')) {
      res.status(403).json({ ok: false, error: { message: 'User is not a seller' } });
      return;
    }

    const result = await calculateSellerLevel(req.userId);

    res.json({
      ok: true,
      sellerLevel: result,
    });
  } catch (error) {
    console.error('[avatarx-server] calculateSellerLevel error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get seller level requirements
export async function getSellerLevelRequirementsHandler(req: Request, res: Response) {
  try {
    const { level } = req.params;
    const levelStr = Array.isArray(level) ? level[0] : level;

    const validLevels = ['new', 'level1', 'level2', 'top_rated', 'pro'];
    if (!validLevels.includes(levelStr)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid seller level' } });
      return;
    }

    const requirements = getSellerLevelRequirements(levelStr as any);

    res.json({
      ok: true,
      requirements,
    });
  } catch (error) {
    console.error('[avatarx-server] getSellerLevelRequirements error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Recalculate all seller levels (admin only)
export async function recalculateAllSellerLevelsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || (!user.roles.includes('admin') && !user.roles.includes('super_admin'))) {
      res.status(403).json({ ok: false, error: { message: 'Admin access required' } });
      return;
    }

    const result = await recalculateAllSellerLevels();

    res.json({
      ok: true,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[avatarx-server] recalculateAllSellerLevels error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get leaderboard (top sellers)
export async function getLeaderboardHandler(req: Request, res: Response) {
  try {
    const { sort = 'rating', limit = 20 } = req.query;
    const limitNum = Math.min(Number(limit), 50);

    let sortField = 'averageRating';
    let sortDir = -1;

    switch (sort) {
      case 'orders':
        sortField = 'totalOrdersCompleted';
        break;
      case 'earnings':
        sortField = 'totalEarnedUSD';
        break;
      case 'rating':
      default:
        sortField = 'averageRating';
        break;
    }

    const sellers = await User.find({ roles: 'seller' })
      .sort({ [sortField]: sortDir } as any)
      .limit(limitNum)
      .lean();

    // Get average rating for each seller from their gigs
    const sellerIds = sellers.map((s) => s._id);
    const ratingAgg = await Gig.aggregate([
      { $match: { sellerId: { $in: sellerIds }, status: 'active' } },
      { $group: { _id: '$sellerId', avgRating: { $avg: '$averageRating' }, totalGigs: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratingAgg.map((r) => [r._id.toString(), { avgRating: r.avgRating, totalGigs: r.totalGigs }]));

    const result = sellers.map((s) => ({
      id: s._id.toString(),
      displayName: s.displayName,
      avatar: s.avatar,
      sellerLevel: s.sellerLevel || 'new',
      verificationBadge: s.verificationBadge || false,
      totalOrdersCompleted: s.totalOrdersCompleted || 0,
      totalEarnedUSD: s.totalEarnedUSD || 0,
      totalEarnedINR: s.totalEarnedINR || 0,
      successScore: s.successScore || 0,
      responseRate: s.responseRate || 0,
      badges: s.badges || [],
      averageRating: ratingMap.get(s._id.toString())?.avgRating || 0,
      totalGigs: ratingMap.get(s._id.toString())?.totalGigs || 0,
      createdAt: s.createdAt,
    }));

    // Sort by the selected field in memory (for averageRating which comes from aggregation)
    if (sort === 'rating') {
      result.sort((a, b) => b.averageRating - a.averageRating);
    }

    res.json({ ok: true, sellers: result });
  } catch (error) {
    console.error('[avatarx-server] getLeaderboard error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Setup Creator Profile
export async function setupCreatorProfileHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const updates = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    // Must accept creator policy
    if (updates.hasAcceptedCreatorPolicy === true) {
      user.hasAcceptedCreatorPolicy = true;
    } else if (!user.hasAcceptedCreatorPolicy) {
      res.status(400).json({ ok: false, error: { message: 'You must accept the Creator Policy to proceed' } });
      return;
    }

    // Add creator to roles if not present, and activate it
    if (!user.roles.includes('creator')) {
      user.roles.push('creator');
    }
    user.activeRole = 'creator';

    // Update Creator specific fields
    const allowedUpdates = ['bio', 'skills', 'languages', 'portfolio', 'payoutMethods'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (user as any)[field] = updates[field];
      }
    });

    await user.save();

    res.json({
      ok: true,
      message: 'Creator profile setup successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[avatarx-server] setupCreatorProfile error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Become a seller
export async function becomeSellerHandler(req: AuthRequest, res: Response) {
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

    if (user.roles.includes('seller')) {
      res.status(400).json({ ok: false, error: { message: 'User is already a seller' } });
      return;
    }

    // Validation for seller onboarding
    if (!user.bio || user.bio.length < 20) {
      res.status(400).json({ ok: false, error: { message: 'Please provide a bio of at least 20 characters' } });
      return;
    }

    if (!user.skills || user.skills.length === 0) {
      res.status(400).json({ ok: false, error: { message: 'Please add at least one skill' } });
      return;
    }

    // Upgrade role
    if (!user.roles.includes('seller')) {
      user.roles.push('seller');
    }
    user.activeRole = 'seller';
    await user.save();

    res.json({
      ok: true,
      message: 'Congratulations! You are now a seller.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[avatarx-server] becomeSeller error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Switch user active role
export async function switchRoleHandler(req: AuthRequest, res: Response) {
  try {
    const { newRole } = req.body;
    const validRoles = ['buyer', 'seller', 'creator', 'admin', 'super_admin'];

    if (!newRole || !validRoles.includes(newRole)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid role.' } });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required.' } });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found.' } });
      return;
    }

    // SECURITY: Verify user actually possesses this role
    if (!user.roles.includes(newRole)) {
      res.status(403).json({
        ok: false,
        error: { message: `You do not have the '${newRole}' role.` }
      });
      return;
    }

    user.activeRole = newRole as any;
    await user.save();

    res.json({
      ok: true,
      message: `Successfully switched to ${newRole} role`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[avatarx-server] switchRole error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
