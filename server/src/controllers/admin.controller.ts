import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/user.model';
import { Gig } from '../models/gig.model';
import { Order } from '../models/order.model';
import { PlatformSettings, getPlatformSettings } from '../models/platform-settings.model';

function mapUserForAdmin(user: any) {
  const role = user.activeRole || user.role || (user.roles && user.roles[0]) || 'buyer';
  const badges = [...(user.badges || [])];
  if (user.banned) {
    badges.push('banned');
  }
  return {
    id: user._id,
    displayName: user.displayName,
    email: user.email,
    avatar: user.avatar || '',
    role: role === 'seller' ? 'freelancer' : (role === 'user' ? 'buyer' : role),
    roles: user.roles || (role ? [role] : ['buyer']),
    activeRole: role,
    isEmailVerified: user.isEmailVerified,
    verificationStatus: user.verificationStatus,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen?.toISOString?.() || user.lastSeen,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    metrics: {
      totalOrders: user.totalOrdersCompleted || 0,
      totalSpent: 0,
      totalEarned: user.totalEarnedUSD || 0,
      successScore: user.successScore || 0,
    },
    badges,
  };
}

function mapGigForAdmin(gig: any) {
  let displayStatus = gig.status;
  if (gig.moderation?.status === 'rejected') {
    displayStatus = 'rejected';
  } else if (gig.status === 'draft' && gig.moderation?.status === 'pending') {
    displayStatus = 'pending_approval';
  } else if (gig.status === 'draft' && gig.moderation?.status === 'approved') {
    displayStatus = 'active';
  }

  const basicTier = gig.tiers?.[0];
  return {
    id: gig._id,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    price: basicTier?.price || 0,
    currency: basicTier?.currency || 'USD',
    status: displayStatus,
    seller: {
      id: gig.sellerId?._id || gig.sellerId,
      displayName: gig.sellerDisplayName || 'Unknown',
      avatar: gig.sellerAvatar || '',
      email: gig.sellerEmail || '',
    },
    tier: {
      name: basicTier?.name || 'Basic',
      price: basicTier?.price || 0,
      deliveryTime: basicTier?.deliveryTimeDays || 1,
    },
    tags: gig.tags || [],
    adultContent: gig.isAdultContent || false,
    createdAt: gig.createdAt?.toISOString?.() || gig.createdAt,
    updatedAt: gig.updatedAt?.toISOString?.() || gig.updatedAt,
    stats: {
      views: gig.impressions || 0,
      orders: gig.orders || 0,
      revenue: 0,
      rating: gig.averageRating || 0,
    },
    media: (gig.gallery || []).slice(0, 1).map((m: any) => ({
      type: m.type,
      url: m.url,
    })),
    reported: gig.reported || false,
    reportCount: gig.reportCount || 0,
  };
}

export async function getAdminDashboardStatsHandler(_req: AuthRequest, res: Response) {
  try {
    const [totalUsers, totalGigs, activeOrders, revenueResult] = await Promise.all([
      User.countDocuments(),
      Gig.countDocuments({ status: { $ne: 'deleted' } }),
      Order.countDocuments({ status: { $in: ['in_progress', 'delivered', 'payment_pending'] } }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalGigs,
      activeOrders,
      totalRevenue: revenueResult[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch admin stats' } });
  }
}

export async function getAdminDashboardActivityHandler(_req: AuthRequest, res: Response) {
  try {
    const [recentOrders, recentUsers] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyerId', 'displayName')
        .populate('sellerId', 'displayName')
        .lean(),
      User.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const activities = [
      ...recentOrders.map((o: any) => ({
        type: 'order',
        description: `Order #${o.orderNumber} — ${o.status.replace('_', ' ')} (${o.buyerId?.displayName || 'Unknown'} → ${o.sellerId?.displayName || 'Unknown'})`,
        timestamp: o.createdAt,
      })),
      ...recentUsers.map((u: any) => ({
        type: 'user',
        description: `New user registered: ${u.displayName} (${u.email})`,
        timestamp: u.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 15);

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch activity' } });
  }
}

export async function getAdminUsersHandler(req: AuthRequest, res: Response) {
  try {
    const roleFilter = req.query.role as string;
    const search = req.query.search as string;

    const query: any = {};
    if (roleFilter && roleFilter !== 'all') {
      if (roleFilter === 'users') {
        query.roles = 'buyer';
      } else if (roleFilter === 'freelancers') {
        query.roles = 'seller';
      } else if (roleFilter === 'admins') {
        query.roles = { $in: ['admin', 'super_admin'] };
      }
    }
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users: users.map(mapUserForAdmin) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch users' } });
  }
}

export async function updateAdminUserRoleHandler(req: AuthRequest, res: Response) {
  try {
    const { role } = req.body;
    const validRoles = ['buyer', 'seller', 'admin', 'super_admin'];
    const frontendToBackend: Record<string, string> = {
      user: 'buyer',
      buyer: 'buyer',
      freelancer: 'seller',
      seller: 'seller',
      admin: 'admin',
      super_admin: 'super_admin',
    };

    const backendRole = frontendToBackend[role] || role;
    if (!validRoles.includes(backendRole)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid role' } });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    // Update activeRole
    user.activeRole = backendRole as any;
    
    // Add to roles list if not present
    if (!user.roles.includes(backendRole)) {
      user.roles.push(backendRole);
    }
    
    // Synchronize legacy role
    user.role = backendRole as any;

    await user.save();

    res.json({ user: mapUserForAdmin(user.toObject()) });
  } catch (error) {
    console.error('updateAdminUserRole error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to update role' } });
  }
}

export async function toggleAdminUserBanHandler(req: AuthRequest, res: Response) {
  try {
    const { banned } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { banned: !!banned },
      { new: true },
    ).lean();

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({ user: mapUserForAdmin(user) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to toggle ban' } });
  }
}

export async function verifyAdminUserEmailHandler(req: AuthRequest, res: Response) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isEmailVerified: true },
      { new: true },
    ).lean();

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({ user: mapUserForAdmin(user) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to verify email' } });
  }
}

export async function getAdminGigsHandler(req: AuthRequest, res: Response) {
  try {
    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    const query: any = { status: { $ne: 'deleted' } };

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        query.status = 'draft';
        query['moderation.status'] = 'pending';
      } else if (statusFilter === 'active') {
        query.status = 'active';
      } else if (statusFilter === 'rejected') {
        query['moderation.status'] = 'rejected';
      } else if (statusFilter === 'reported') {
        query.reported = true;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sellerDisplayName: { $regex: search, $options: 'i' } },
      ];
    }

    const gigs = await Gig.find(query)
      .populate('sellerId', 'displayName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = gigs.map((gig: any) => {
      const mappedGig = mapGigForAdmin(gig);
      if (gig.sellerId) {
        mappedGig.seller = {
          id: gig.sellerId._id?.toString() || gig.sellerId.toString(),
          displayName: gig.sellerId.displayName || gig.sellerDisplayName,
          avatar: gig.sellerId.avatar || gig.sellerAvatar || '',
          email: gig.sellerId.email || '',
        };
      }
      return mappedGig;
    });

    res.json({ gigs: mapped });
  } catch (error) {
    console.error('getAdminGigsHandler error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch gigs' } });
  }
}

export async function approveAdminGigHandler(req: AuthRequest, res: Response) {
  try {
    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      {
        status: 'active',
        'moderation.status': 'approved',
        'moderation.reviewedAt': new Date(),
        'moderation.reviewedBy': req.userId,
      },
      { new: true },
    ).lean();

    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    res.json({ gig: mapGigForAdmin(gig) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to approve gig' } });
  }
}

export async function rejectAdminGigHandler(req: AuthRequest, res: Response) {
  try {
    const { reason } = req.body;

    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      {
        'moderation.status': 'rejected',
        'moderation.rejectionReason': reason || '',
        'moderation.reviewedAt': new Date(),
        'moderation.reviewedBy': req.userId,
      },
      { new: true },
    ).lean();

    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    res.json({ gig: mapGigForAdmin(gig) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to reject gig' } });
  }
}

export async function updateAdminGigStatusHandler(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;

    if (!['active', 'paused'].includes(status)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid status' } });
      return;
    }

    // Build update payload
    const update: any = { status };

    // When an admin reactivates a gig, clear any prior rejection
    // so mapGigForAdmin doesn't override the display status.
    // Set the full moderation subdocument because dot notation
    // updates via findByIdAndUpdate don't apply to nested objects.
    if (status === 'active') {
      update.moderation = {
        status: 'approved',
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedBy: req.userId,
      };
    }

    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true },
    ).lean();

    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    res.json({ gig: mapGigForAdmin(gig) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to update gig status' } });
  }
}

export async function deleteAdminGigHandler(req: AuthRequest, res: Response) {
  try {
    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted' },
      { new: true },
    ).lean();

    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to delete gig' } });
  }
}

export async function getAdminAnalyticsHandler(req: AuthRequest, res: Response) {
  try {
    const range = (req.query.range as string) || '30d';
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalUsers,
      totalGigs,
      totalOrders,
      revenueResult,
      newUsersToday,
      newGigsToday,
      newOrdersToday,
      revenueTodayResult,
      usersInRange,
      orderStats,
      gigStats,
      ordersInRange,
    ] = await Promise.all([
      User.countDocuments(),
      Gig.countDocuments({ status: { $ne: 'deleted' } }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      User.countDocuments({ createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } }),
      Gig.countDocuments({ createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) }, status: { $ne: 'deleted' } }),
      Order.countDocuments({ createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } }),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      User.find({ createdAt: { $gte: startDate } })
        .sort({ createdAt: 1 })
        .lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$totalPrice' } } },
      ]),
      Gig.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: { $arrayElemAt: ['$tiers.price', 0] } }, totalRevenue: { $sum: 0 } } },
        { $sort: { count: -1 } },
      ]),
      Order.find({ createdAt: { $gte: startDate } }).sort({ createdAt: 1 }).lean(),
    ]);

    const userGrowthMap = new Map<string, { date: string; totalUsers: number; newUsers: number; activeUsers: number }>();
    let runningTotal = await User.countDocuments({ createdAt: { $lt: startDate } });

    for (const u of usersInRange) {
      const day = (u.createdAt as Date).toISOString().slice(0, 10);
      if (!userGrowthMap.has(day)) {
        userGrowthMap.set(day, { date: day, totalUsers: runningTotal, newUsers: 0, activeUsers: 0 });
      }
      const entry = userGrowthMap.get(day)!;
      entry.newUsers += 1;
      runningTotal += 1;
      entry.totalUsers = runningTotal;
    }

    const revenueMap = new Map<string, { date: string; revenue: number; orders: number; commission: number }>();
    for (const o of ordersInRange) {
      const day = (o.createdAt as Date).toISOString().slice(0, 10);
      if (!revenueMap.has(day)) {
        revenueMap.set(day, { date: day, revenue: 0, orders: 0, commission: 0 });
      }
      const entry = revenueMap.get(day)!;
      entry.orders += 1;
      if (o.status === 'completed' || o.status === 'delivered') {
        entry.revenue += o.totalPrice || 0;
        entry.commission += (o.platformFee || 0) + (o.serviceFee || 0);
      }
    }

    const overview = {
      totalUsers,
      totalGigs,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      activeUsers: await User.countDocuments({ isOnline: true }),
      newUsersToday,
      newGigsToday,
      newOrdersToday,
      revenueToday: revenueTodayResult[0]?.total || 0,
    };

    const gigStatsMapped = gigStats.map((gs: any) => ({
      category: gs._id,
      count: gs.count,
      avgPrice: Math.round(gs.avgPrice * 100) / 100,
      totalRevenue: gs.totalRevenue,
    }));

    const orderStatsMapped = orderStats.map((os: any) => ({
      status: os._id,
      count: os.count,
      totalValue: os.totalValue,
    }));

    const userGrowth = Array.from(userGrowthMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const revenueData = Array.from(revenueMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const topSellers = await User.find({ roles: 'seller' })
      .sort({ totalEarnedUSD: -1 })
      .limit(5)
      .lean();

    const topPerformers: Array<{ type: 'freelancer' | 'gig'; name: string; value: number; metric: string }> = [
      ...topSellers.map((s: any) => ({
        type: 'freelancer' as const,
        name: s.displayName,
        value: s.totalEarnedUSD || 0,
        metric: 'Total Earned',
      })),
    ];

    const topGigs = await Gig.find({ status: 'active' })
      .sort({ orders: -1 })
      .limit(5)
      .lean();

    topPerformers.push(
      ...topGigs.map((g: any) => ({
        type: 'gig' as const,
        name: g.title,
        value: g.orders || 0,
        metric: 'Orders Completed',
      })),
    );

    res.json({
      data: {
        overview,
        userGrowth,
        gigStats: gigStatsMapped,
        orderStats: orderStatsMapped,
        revenueData,
        topPerformers,
      },
    });
  } catch (error) {
    console.error('getAdminAnalyticsHandler error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch analytics' } });
  }
}

export async function getAdminSettingsHandler(_req: AuthRequest, res: Response) {
  try {
    const settings = await getPlatformSettings();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch settings' } });
  }
}

export async function updateAdminSettingsHandler(req: AuthRequest, res: Response) {
  try {
    const updates = req.body;
    const settings = await getPlatformSettings();

    if (updates.platform) {
      Object.assign(settings.platform, updates.platform);
    }
    if (updates.commission) {
      Object.assign(settings.commission, updates.commission);
    }
    if (updates.limits) {
      Object.assign(settings.limits, updates.limits);
    }
    if (updates.features) {
      Object.assign(settings.features, updates.features);
    }
    if (updates.notifications) {
      Object.assign(settings.notifications, updates.notifications);
    }
    if (updates.security) {
      Object.assign(settings.security, updates.security);
    }

    await settings.save();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to update settings' } });
  }
}

export async function getPendingVerificationsHandler(req: AuthRequest, res: Response) {
  try {
    const pendingUsers = await User.find({ verificationStatus: 'pending', roles: { $in: ['seller', 'creator'] } })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users: pendingUsers.map(mapUserForAdmin) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch pending verifications' } });
  }
}

export async function updateVerificationStatusHandler(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ ok: false, error: { message: 'Invalid verification status' } });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: status },
      { new: true }
    ).lean();

    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    res.json({ user: mapUserForAdmin(user) });
  } catch (error) {
    res.status(500).json({ ok: false, error: { message: 'Failed to update verification status' } });
  }
}
