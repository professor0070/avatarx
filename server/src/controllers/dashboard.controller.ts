import type { Response } from 'express';
import { Order } from '../models/order.model';
import { Gig } from '../models/gig.model';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a range string (7d | 30d | 90d | 1y) to a Date in the past */
function rangeToDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '7d':  return new Date(now.setDate(now.getDate() - 7));
    case '90d': return new Date(now.setDate(now.getDate() - 90));
    case '1y':  return new Date(now.setFullYear(now.getFullYear() - 1));
    default:    return new Date(now.setDate(now.getDate() - 30)); // '30d'
  }
}

/** Start of current calendar month */
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Start of previous calendar month */
function startOfLastMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

/** End of previous calendar month */
function endOfLastMonth() {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999);
}

// ─── Client Stats ────────────────────────────────────────────────────────────

export async function getClientStatsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const monthStart = startOfMonth();
    const lastMonthStart = startOfLastMonth();
    const lastMonthEnd = endOfLastMonth();

    const [
      totalOrders,
      activeOrders,
      totalSpentResult,
      thisMonthSpentResult,
      lastMonthSpentResult,
      wishlistCount,
      pendingCount,
      inProgressCount,
      completedCount,
    ] = await Promise.all([
      Order.countDocuments({ buyerId: userId }),
      Order.countDocuments({
        buyerId: userId,
        status: { $in: ['pending', 'payment_completed', 'requirements_submitted', 'in_progress', 'delivered'] },
      }),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed', createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      User.findById(userId).then((user) => user?.wishlist?.length || 0),
      Order.countDocuments({ buyerId: userId, status: 'pending' }),
      Order.countDocuments({ buyerId: userId, status: 'in_progress' }),
      Order.countDocuments({ buyerId: userId, status: 'completed' }),
    ]);

    const totalSpent = totalSpentResult[0]?.total || 0;
    const thisMonthSpent = thisMonthSpentResult[0]?.total || 0;
    const lastMonthSpent = lastMonthSpentResult[0]?.total || 0;
    const completedOrdersForAvg = await Order.countDocuments({ buyerId: userId, status: 'completed' });

    const recentOrders = await Order.find({ buyerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('gigId', 'title')
      .lean();

    res.json({
      ok: true,
      stats: {
        totalOrders,
        activeOrders,
        totalSpent,
        wishlistCount,
        recentOrders: recentOrders.map((o) => ({
          id: o._id,
          gigTitle: (o.gigId as any)?.title || 'Deleted Gig',
          createdAt: (o as any).createdAt,
          status: o.status,
          total: o.totalPrice,
        })),
        orderStatus: { pending: pendingCount, in_progress: inProgressCount, completed: completedCount },
        spending: {
          thisMonth: thisMonthSpent,
          lastMonth: lastMonthSpent,
          averageOrder: completedOrdersForAvg > 0 ? totalSpent / completedOrdersForAvg : 0,
        },
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getClientStats error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// ─── Client Analytics ────────────────────────────────────────────────────────

export async function getClientAnalyticsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const range = (req.query.range as string) || '30d';
    const since = rangeToDate(range);

    const [
      totalOrders,
      totalSpentResult,
      completedOrders,
      cancelledOrders,
      spendingByMonth,
      statusBreakdown,
      categoryBreakdown,
      topSellers,
    ] = await Promise.all([
      Order.countDocuments({ buyerId: userId, createdAt: { $gte: since } }),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.countDocuments({ buyerId: userId, status: 'completed', createdAt: { $gte: since } }),
      Order.countDocuments({ buyerId: userId, status: 'cancelled', createdAt: { $gte: since } }),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            total: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Order.aggregate([
        { $match: { buyerId: userId, createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed', createdAt: { $gte: since } } },
        {
          $lookup: {
            from: 'gigs',
            localField: 'gigId',
            foreignField: '_id',
            as: 'gig',
          },
        },
        { $unwind: { path: '$gig', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$gig.category',
            total: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { buyerId: userId, status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$sellerId',
            totalSpent: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'seller',
          },
        },
        { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      ]),
    ]);

    const totalSpent = totalSpentResult[0]?.total || 0;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    res.json({
      ok: true,
      data: {
        overview: {
          totalOrders,
          totalSpent,
          averageOrderValue: completedOrders > 0 ? totalSpent / completedOrders : 0,
          completedOrders,
          cancelledOrders,
        },
        spendingData: spendingByMonth.map((d) => ({
          month: `${months[d._id.month - 1]} ${d._id.year}`,
          spent: d.total,
          orders: d.orders,
        })),
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c._id || 'Uncategorized',
          total: c.total,
          orders: c.orders,
        })),
        orderStatusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
        topSellers: topSellers.map((s) => ({
          id: s._id,
          displayName: s.seller?.displayName || 'Unknown',
          avatar: s.seller?.avatar || '',
          totalSpent: s.totalSpent,
          orders: s.orders,
        })),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getClientAnalytics error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// ─── Freelancer Stats ────────────────────────────────────────────────────────

export async function getFreelancerStatsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);

    const [
      totalGigs,
      activeOrders,
      totalEarningsResult,
      completedOrdersCount,
      onTimeDeliveries,
      reviewStats,
      totalOrders,
    ] = await Promise.all([
      Gig.countDocuments({ sellerId: userId }),
      Order.countDocuments({
        sellerId: userId,
        status: { $in: ['pending', 'payment_completed', 'requirements_submitted', 'in_progress', 'delivered'] },
      }),
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.countDocuments({ sellerId: userId, status: 'completed' }),
      Order.countDocuments({ sellerId: userId, status: 'completed', 'metrics.onTimeDelivery': true }),
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed', 'review.rating': { $exists: true } } },
        { $group: { _id: null, avgRating: { $avg: '$review.rating' }, count: { $sum: 1 } } },
      ]),
      Order.countDocuments({ sellerId: userId }),
    ]);

    const totalEarnings = totalEarningsResult[0]?.total || 0;
    const allCompleted = await Order.countDocuments({ sellerId: userId, status: { $in: ['completed', 'cancelled'] } });
    const successRate = allCompleted > 0 ? Math.round((completedOrdersCount / allCompleted) * 100) : 100;
    const onTimeDeliveryRate = completedOrdersCount > 0 ? Math.round((onTimeDeliveries / completedOrdersCount) * 100) : 100;

    // Avg response time from metrics
    const avgResponseTimeResult = await Order.aggregate([
      { $match: { sellerId: userId, 'metrics.responseTime': { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$metrics.responseTime' } } },
    ]);

    const recentOrders = await Order.find({ sellerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('gigId', 'title')
      .lean();

    res.json({
      ok: true,
      stats: {
        totalGigs,
        activeOrders,
        totalOrders,
        totalEarnings,
        successRate,
        avgResponseTime: Math.round(avgResponseTimeResult[0]?.avg || 0),
        onTimeDeliveryRate,
        avgRating: reviewStats[0]?.avgRating ? parseFloat(reviewStats[0].avgRating.toFixed(1)) : 0,
        totalReviews: reviewStats[0]?.count || 0,
        recentOrders: recentOrders.map((o) => ({
          id: o._id,
          gigTitle: (o.gigId as any)?.title || 'Deleted Gig',
          createdAt: (o as any).createdAt,
          status: o.status,
          total: o.totalPrice,
        })),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getFreelancerStats error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// ─── Freelancer Analytics (general) ──────────────────────────────────────────

export async function getFreelancerAnalyticsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const range = (req.query.range as string) || '30d';
    const since = rangeToDate(range);

    const [earningsByMonth, gigPerformance] = await Promise.all([
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            earnings: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Order.aggregate([
        { $match: { sellerId: userId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$gigId',
            orders: { $sum: 1 },
            earnings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] } },
          },
        },
        { $sort: { orders: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'gigs',
            localField: '_id',
            foreignField: '_id',
            as: 'gig',
          },
        },
        { $unwind: { path: '$gig', preserveNullAndEmptyArrays: true } },
      ]),
    ]);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    res.json({
      ok: true,
      data: {
        earnings: {
          monthly: earningsByMonth.map((d) => ({
            month: `${months[d._id.month - 1]} ${d._id.year}`,
            earnings: d.earnings,
            orders: d.orders,
          })),
          total: earningsByMonth.reduce((sum, d) => sum + d.earnings, 0),
        },
        gigPerformance: gigPerformance.map((g) => ({
          id: g._id,
          title: g.gig?.title || 'Deleted Gig',
          orders: g.orders,
          earnings: g.earnings,
        })),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getFreelancerAnalytics error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// ─── Freelancer Earnings (dedicated endpoint for EarningsAnalytics component) ─

export async function getFreelancerEarningsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const range = (req.query.range as string) || '30d';
    const since = rangeToDate(range);
    const monthStart = startOfMonth();
    const lastMonthStart = startOfLastMonth();
    const lastMonthEnd = endOfLastMonth();

    const [
      totalEarningsResult,
      currentMonthResult,
      lastMonthResult,
      pendingResult,
      completedOrders,
      monthlyBreakdown,
      recentOrders,
    ] = await Promise.all([
      // All-time total
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      // This month
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      // Last month
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed', createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      // Pending from active orders
      Order.aggregate([
        {
          $match: {
            sellerId: userId,
            status: { $in: ['in_progress', 'delivered', 'requirements_submitted'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.countDocuments({ sellerId: userId, status: 'completed', createdAt: { $gte: since } }),
      // Monthly breakdown within range
      Order.aggregate([
        { $match: { sellerId: userId, status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            earnings: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      // Recent completed transactions
      Order.find({ sellerId: userId, status: { $in: ['completed', 'in_progress', 'delivered'] } })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('gigId', 'title')
        .lean(),
    ]);

    const totalEarnings = totalEarningsResult[0]?.total || 0;
    const currentMonthEarnings = currentMonthResult[0]?.total || 0;
    const lastMonthEarnings = lastMonthResult[0]?.total || 0;
    const pendingEarnings = pendingResult[0]?.total || 0;
    const averageOrderValue = completedOrders > 0 ? totalEarnings / completedOrders : 0;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    res.json({
      ok: true,
      data: {
        totalEarnings,
        currentMonthEarnings,
        lastMonthEarnings,
        pendingEarnings,
        completedOrders,
        averageOrderValue,
        monthlyData: monthlyBreakdown.map((d) => ({
          month: `${monthNames[d._id.month - 1]} ${d._id.year}`,
          earnings: d.earnings,
          orders: d.orders,
        })),
        recentTransactions: recentOrders.map((o) => ({
          id: o._id,
          orderNumber: `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
          gigTitle: (o.gigId as any)?.title || 'Deleted Gig',
          amount: o.totalPrice,
          currency: o.currency || 'USD',
          status: o.status === 'completed' ? 'completed' : 'pending',
          date: (o as any).updatedAt || (o as any).createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getFreelancerEarnings error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
