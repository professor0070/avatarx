import type { Request, Response } from 'express';
import { Order } from '../models/order.model';
import { Gig } from '../models/gig.model';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { IOrder, OrderStatus } from '../models/order.model';
import { NotificationService } from '../services/notification.service';
import { escrowService } from '../services/escrow.service';

// Helper function to sanitize order data
function sanitizeOrder(order: any) {
  const sanitized = order.toObject ? order.toObject() : { ...order };
  return sanitized;
}

// Create order
export async function createOrderHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      gigId,
      tierName,
      extras,
      requirements,
      paymentMethod = 'razorpay',
    } = req.body;

    // Validate required fields
    if (!gigId || !tierName) {
      res.status(400).json({ ok: false, error: { message: 'Gig ID and tier name are required' } });
      return;
    }

    // Get gig details
    const gig = await Gig.findById(gigId);
    if (!gig) {
      res.status(404).json({ ok: false, error: { message: 'Gig not found' } });
      return;
    }

    // Check if gig is active
    if (gig.status !== 'active') {
      res.status(400).json({ ok: false, error: { message: 'Gig is not available for ordering' } });
      return;
    }

    // Get buyer details
    const buyer = await User.findById(req.userId);
    if (!buyer) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    // Prevent self-ordering
    if (gig.sellerId.toString() === req.userId) {
      res.status(400).json({ ok: false, error: { message: 'Cannot order your own gig' } });
      return;
    }

    // Check adult content restrictions
    if (gig.isAdultContent) {
      if (!buyer.isAgeVerified) {
        res.status(403).json({ ok: false, error: { message: 'Age verification required for adult content' } });
        return;
      }

      const adultBadges = ['AP', 'VIP', 'Marriage Pack'];
      const hasAdultBadge = buyer.badges.some((badge: string) => adultBadges.includes(badge));
      if (!hasAdultBadge) {
        res.status(403).json({ ok: false, error: { message: 'Adult badge required for adult content' } });
        return;
      }
    }

    // Find the selected tier
    const tier = gig.tiers.find((t: any) => t.name === tierName);
    if (!tier) {
      res.status(400).json({ ok: false, error: { message: 'Invalid tier selected' } });
      return;
    }

    // Calculate extras price
    let extrasPrice = 0;
    const selectedExtras = [];

    if (extras && Array.isArray(extras)) {
      for (const extraId of extras) {
        const extra = gig.extras.find((e: any) => e.id === extraId);
        if (extra) {
          extrasPrice += extra.price;
          selectedExtras.push({
            id: extra.id,
            name: extra.name,
            price: extra.price,
            currency: extra.currency,
          });
        }
      }
    }

    // Calculate total price
    const basePrice = tier.price;
    const totalPrice = basePrice + extrasPrice;
    const commissionPercent = 20; // Default Phase 3 specification
    const commission = Math.round(totalPrice * commissionPercent / 100);
    const netCreatorPayout = totalPrice - commission;
    const finalTotal = totalPrice;

    // Check if buyer has sufficient wallet balance for wallet payment
    if (paymentMethod === 'wallet' && buyer.crWalletBalance < finalTotal) {
      res.status(400).json({ ok: false, error: { message: 'Insufficient wallet balance' } });
      return;
    }

    // Create order
    const order = new Order({
      gigId,
      buyerId: req.userId,
      creatorId: gig.sellerId.toString(),
      tierName,
      extras: selectedExtras,
      financials: {
        price: finalTotal,
        commission,
        netCreatorPayout
      },
      currency: tier.currency,
      deliveryType: gig.deliveryType,
      deliveryTimeDays: tier.deliveryTimeDays,
      revisions: { allowed: tier.revisions, used: 0 },
      requirements: {
        enabled: gig.requirements.enabled,
        questions: gig.requirements.questions || [],
        answers: requirements?.answers || [],
        submittedAt: requirements?.submittedAt,
      },
      payment: {
        method: paymentMethod,
      },
      type: gig.requestToOrder ? 'custom' : 'standard',
      expiresAt: gig.requestToOrder ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined, // 7 days for request-to-order
    });

    // Update status based on order type
    if (gig.requestToOrder) {
      order.updateStatus('pending', 'Order request sent to seller', req.userId);
    } else {
      order.updateStatus('payment_pending', 'Awaiting payment', req.userId);
    }

    await order.save();

    // Update gig metrics (atomic $inc to avoid race conditions)
    await Gig.findByIdAndUpdate(gigId, { $inc: { orders: 1 } });

    // If wallet payment, process immediately
    if (paymentMethod === 'wallet') {
      await User.findByIdAndUpdate(req.userId, { $inc: { crWalletBalance: -finalTotal } });

      order.payment.paidAt = new Date();
      order.paymentStatus = 'completed';
      order.updateStatus('payment_completed', 'Payment completed via wallet', req.userId);
      
      if (gig.requirements.enabled) {
        order.updateStatus('requirements_submitted', 'Awaiting buyer requirements', req.userId);
      } else {
        order.updateStatus('in_progress', 'Order started', req.userId);
      }
      
      await order.save();

      // Hold funds in escrow for wallet payments
      await escrowService.holdFunds(order._id.toString()).catch((e) => {
        console.error('[avatarx-server] Failed to hold funds in escrow for wallet payment:', e);
      });
    }

    // Notify seller of new order (fire-and-forget — no await)
    NotificationService.notifyNewOrder(order).catch((e) =>
      console.error('[avatarx-server] Failed to send new order notification:', e)
    );

    res.status(201).json({
      ok: true,
      order: sanitizeOrder(order),
    });

  } catch (error) {
    console.error('[avatarx-server] createOrder error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Get orders (for buyer or seller)
export async function getOrdersHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await User.findById(req.userId);
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    const {
      page = 1,
      limit = 20,
      status,
      role = 'buyer', // 'buyer', 'seller', or 'admin'
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter for /my-contracts (Phase 3 spec)
    const filter: any = {
      $or: [{ buyerId: req.userId }, { creatorId: req.userId }]
    };

    if (status) {
      filter.status = status;
    }

    // Build sort
    const sortOptions: any = {};
    switch (sort) {
      case 'createdAt':
      default:
        sortOptions.createdAt = order === 'desc' ? -1 : 1;
        break;
      case 'totalPrice':
        sortOptions.totalPrice = order === 'desc' ? -1 : 1;
        break;
      case 'deliveryTimeDays':
        sortOptions.deliveryTimeDays = order === 'desc' ? -1 : 1;
        break;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('gigId', 'title thumbnail category')
        .populate('buyerId', 'displayName avatar')
        .populate('creatorId', 'displayName avatar')
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      orders: orders.map(order => {
        const sanitized = sanitizeOrder(order);
        if (!sanitized.gigId) {
          sanitized.gigId = {
            _id: 'deleted',
            title: 'Deleted Gig',
            thumbnail: '',
            category: 'unknown'
          };
        }
        return sanitized;
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('[avatarx-server] getOrders error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Get single order
export async function getOrderHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('gigId', 'title thumbnail category description deliveryType')
      .populate('buyerId', 'displayName avatar email')
      .populate('creatorId', 'displayName avatar email');

    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer or seller
    const bId = (order.buyerId as any)._id?.toString() || order.buyerId;
    const cId = (order.creatorId as any)._id?.toString() || order.creatorId;
    if (bId !== req.userId && cId !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Increment view count
    order.metrics.viewCount += 1;
    await order.save();

    const sanitizedOrder = sanitizeOrder(order as IOrder);
    if (!sanitizedOrder.gigId) {
      sanitizedOrder.gigId = {
        _id: 'deleted',
        title: 'Deleted Gig',
        thumbnail: '',
        category: 'unknown',
        description: 'This gig has been removed from the platform.',
        deliveryType: 'manual'
      };
    }

    res.json({
      ok: true,
      order: sanitizedOrder,
    });

  } catch (error) {
    console.error('[avatarx-server] getOrder error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Update order status
export async function updateOrderStatusHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;
    const { status, comment } = req.body;

    if (!status) {
      res.status(400).json({ ok: false, error: { message: 'Status is required' } });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // THE RACE CONDITION HOLE
    if (order.status === 'disputed') {
      res.status(423).json({ ok: false, error: { message: 'Order is currently locked in an active dispute resolution process' } });
      return;
    }

    // Check if user is buyer or seller
    const isBuyer = order.buyerId.toString() === req.userId;
    const isSeller = order.creatorId.toString() === req.userId;

    if (!isBuyer && !isSeller) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    // Capture previous status before updating
    const previousStatus = order.status;

    // Strict State Mutation Validator Layer (Phase 3 Milestone D)
    const illegalTransitionError = { 
      ok: false, 
      error: { 
        message: 'Illegal state transition', 
        details: `Cannot mutate status from '${previousStatus}' to '${status}'` 
      } 
    };

    if (status === 'escrow_locked' && previousStatus !== 'pending') {
      res.status(400).json(illegalTransitionError);
      return;
    }
    
    if (status === 'in_progress' && previousStatus !== 'escrow_locked') {
      res.status(400).json(illegalTransitionError);
      return;
    }
    
    if (status === 'delivered' && previousStatus !== 'in_progress') {
      res.status(400).json(illegalTransitionError);
      return;
    }
    
    if ((status === 'completed' || status === 'disputed') && (previousStatus !== 'delivered' && previousStatus !== 'in_progress')) {
      res.status(400).json(illegalTransitionError);
      return;
    }

    // Role-based authorization constraints
    if (isBuyer && !['cancelled', 'completed', 'disputed'].includes(status)) {
      res.status(403).json({ ok: false, error: { message: 'Buyer unauthorized to perform this status mutation' } });
      return;
    }

    if (isSeller && !['in_progress', 'delivered'].includes(status)) {
      res.status(403).json({ ok: false, error: { message: 'Creator unauthorized to perform this status mutation' } });
      return;
    }

    // Handle buyer cancellation - refund escrow
    if (status === 'cancelled' && isBuyer) {
      await escrowService.refundFunds(order._id.toString(), req.userId, 'Order cancelled by buyer').catch((e) => {
        console.error('[avatarx-server] Failed to refund escrow funds on cancellation:', e);
      });
    }

    // Update order status
    order.updateStatus(status as OrderStatus, comment, req.userId);

    // Handle special status transitions
    if (status === 'in_progress' && previousStatus === 'payment_completed') {
      // Calculate response time
      const responseTime = Math.abs(new Date().getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
      order.metrics.responseTime = Math.round(responseTime);
    }

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
      order.metrics.onTimeDelivery = !order.isOverdue();
    }

    if (status === 'completed') {
      order.metrics.completionTime = order.calculateCompletionTime();
      
      // Release escrow funds to seller
      await escrowService.releaseFunds(order._id.toString(), req.userId, 'Order completed by buyer').catch((e) => {
        console.error('[avatarx-server] Failed to release escrow funds:', e);
      });
      
      // Update seller metrics
      const seller = await User.findById(order.creatorId);
      if (seller) {
        seller.totalOrdersCompleted += 1;
        if (order.metrics.onTimeDelivery) {
          seller.successScore = Math.min(100, seller.successScore + 1);
        }
        await seller.save();
      }
    }

    await order.save();

    // Fire-and-forget: notify affected party of status change
    NotificationService.notifyOrderStatusUpdate(order, status)
      .then(() => {
        if (status === 'completed') {
          return NotificationService.send({
            userId: order.creatorId.toString(),
            type: 'order_completed',
            title: 'Order Completed 🎉',
            message: 'Your buyer has marked the order as completed!',
            relatedOrderId: order._id.toString(),
            actionUrl: `/dashboard/orders/${order._id}`,
            actionLabel: 'View Order',
            priority: 'high',
          });
        }
      })
      .catch((e) => console.error('[avatarx-server] Failed to send order status notification:', e));

    res.json({
      ok: true,
      order: sanitizeOrder(order),
    });

  } catch (error) {
    console.error('[avatarx-server] updateOrderStatus error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Submit requirements
export async function submitRequirementsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ ok: false, error: { message: 'Answers are required' } });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer
    if (order.buyerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Only buyer can submit requirements' } });
      return;
    }

    // Check if requirements are enabled
    if (!order.requirements.enabled) {
      res.status(400).json({ ok: false, error: { message: 'Requirements not enabled for this order' } });
      return;
    }

    // Update requirements
    order.requirements.answers = answers;
    order.requirements.submittedAt = new Date();
    order.updateStatus('requirements_submitted', 'Requirements submitted by buyer', req.userId);

    await order.save();

    res.json({
      ok: true,
      order: sanitizeOrder(order),
    });

  } catch (error) {
    console.error('[avatarx-server] submitRequirements error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Request revision
export async function requestRevisionHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;
    const { message, files = [] } = req.body;

    if (!message) {
      res.status(400).json({ ok: false, error: { message: 'Revision message is required' } });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer
    if (order.buyerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Only buyer can request revisions' } });
      return;
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      res.status(400).json({ ok: false, error: { message: 'Can only request revisions for delivered orders' } });
      return;
    }

    // Check if revisions are available
    if (order.revisions.used >= order.revisions.allowed) {
      res.status(400).json({ ok: false, error: { message: 'No revisions remaining' } });
      return;
    }

    // Add revision request
    order.addRevision(message, files, req.userId);
    await order.save();

    res.json({
      ok: true,
      order: sanitizeOrder(order),
    });

  } catch (error) {
    console.error('[avatarx-server] requestRevision error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Complete revision
export async function completeRevisionHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;
    const { files = [] } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is seller
    if (order.creatorId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Only seller can complete revisions' } });
      return;
    }

    // Check if order is in revision
    if (order.status !== 'revision_requested') {
      res.status(400).json({ ok: false, error: { message: 'Order is not in revision status' } });
      return;
    }

    // Add delivery files
    if (files && files.length > 0) {
      order.deliveryFiles.push(...files);
    }

    // Update revision status
    order.revisions.used += 1;
    order.revisions.currentRequest = undefined;
    order.revisions.history.push({
      type: 'completed',
      message: 'Revision completed',
      timestamp: new Date(),
      updatedBy: req.userId,
    });

    order.updateStatus('delivered', 'Revision completed and delivered', req.userId);
    await order.save();

    res.json({
      ok: true,
      order: sanitizeOrder(order),
    });

  } catch (error) {
    console.error('[avatarx-server] completeRevision error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Submit review
export async function submitReviewHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ ok: false, error: { message: 'Valid rating (1-5) is required' } });
      return;
    }

    const order = await Order.findById(orderId).populate('gigId');
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer
    if (order.buyerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Only buyer can submit review' } });
      return;
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      res.status(400).json({ ok: false, error: { message: 'Can only review completed orders' } });
      return;
    }

    // Check if review already exists
    if (order.review.rating) {
      res.status(400).json({ ok: false, error: { message: 'Review already submitted' } });
      return;
    }

    // Update review
    order.review = {
      rating,
      comment,
      submittedAt: new Date(),
    };

    await order.save();

    // Update gig rating using aggregation for performance
    const gig = order.gigId as any;
    if (gig) {
      const [ratingResult] = await Order.aggregate([
        { $match: { gigId: gig._id, status: 'completed', 'review.rating': { $exists: true } } },
        { $group: { _id: null, averageRating: { $avg: '$review.rating' }, count: { $sum: 1 } } },
      ]);

      gig.averageRating = ratingResult ? Math.round(ratingResult.averageRating * 10) / 10 : 0;
      gig.totalReviews = ratingResult ? ratingResult.count : 0;
      await gig.save();
    }

    res.json({
      ok: true,
      order: sanitizeOrder(order),
    });

  } catch (error) {
    console.error('[avatarx-server] submitReview error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Dispute Resolution Handlers

// Create dispute
export async function createDisputeHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;
    const { reason, evidenceUrl } = req.body;

    if (!id || !reason) {
      res.status(400).json({ ok: false, error: { message: 'Order ID and reason are required' } });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // IDENTITY ENFORCEMENT HOLE
    if (order.buyerId.toString() !== req.userId && order.creatorId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Forbidden: You are not authorized to access this contract' } });
      return;
    }

    // STATE STATE GUARD
    if (order.status !== 'in_progress' && order.status !== 'delivered') {
      res.status(400).json({ ok: false, error: { message: 'Bad Request: Can only dispute in_progress or delivered orders' } });
      return;
    }

    // METADATA WRITE
    order.disputeMetadata = {
      raisedBy: req.userId,
      reason: reason,
      evidenceUrl: evidenceUrl,
      raisedAt: new Date()
    };
    
    // Create dispute legacy schema compat
    order.dispute = {
      isDisputed: true,
      reason,
      description: reason,
      evidence: evidenceUrl ? [evidenceUrl] : [],
      status: 'pending',
      createdAt: new Date(),
    };

    // Update order status
    order.updateStatus('disputed', 'Dispute raised', req.userId);

    await order.save();

    res.json({
      ok: true,
      order: sanitizeOrder(order),
      message: 'Dispute created successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] createDispute error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get all disputes (admin only)
export async function getDisputesHandler(req: AuthRequest, res: Response) {
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

    const { page = 1, limit = 20, status } = req.query;

    const query: any = { 'dispute.isDisputed': true };
    if (status) query['dispute.status'] = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyerId', 'displayName email avatar')
        .populate('creatorId', 'displayName email avatar')
        .sort({ 'dispute.createdAt': -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      ok: true,
      disputes: orders.map(sanitizeOrder),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getDisputes error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Resolve dispute (admin only)
export async function resolveDisputeHandler(req: AuthRequest, res: Response) {
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

    const { orderId, resolution, action } = req.body;

    if (!orderId || !resolution || !action) {
      res.status(400).json({ ok: false, error: { message: 'Order ID, resolution, and action are required' } });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    if (!order.dispute.isDisputed) {
      res.status(400).json({ ok: false, error: { message: 'No dispute exists for this order' } });
      return;
    }

    // Resolve dispute
    order.dispute.status = 'resolved';
    order.dispute.resolution = resolution;
    order.dispute.resolvedAt = new Date();
    order.dispute.moderationReviewedBy = req.userId;
    order.dispute.moderationReviewedAt = new Date();

    // Take action based on resolution
    if (action === 'refund_buyer') {
      // Refund escrow to buyer
      await escrowService.refundFunds(order._id.toString(), req.userId, `Dispute resolved: ${resolution}`).catch((e) => {
        console.error('[avatarx-server] Failed to refund escrow funds:', e);
      });
      
      // Process refund
      order.paymentStatus = 'refunded';
      order.payment.refundAmount = order.totalPrice;
      order.payment.refundReason = 'Dispute resolution';
      order.payment.refundedAt = new Date();
      order.status = 'refunded';
      order.updateStatus('refunded', `Dispute resolved: ${resolution}`, req.userId);
    } else if (action === 'complete_order') {
      // Release escrow to seller
      await escrowService.releaseFunds(order._id.toString(), req.userId, `Dispute resolved in favor of seller: ${resolution}`).catch((e) => {
        console.error('[avatarx-server] Failed to release escrow funds:', e);
      });
      
      // Complete order in favor of seller
      order.status = 'completed';
      order.updateStatus('completed', `Dispute resolved: ${resolution}`, req.userId);
    } else if (action === 'cancel_order') {
      // Refund escrow to buyer on cancellation
      await escrowService.refundFunds(order._id.toString(), req.userId, `Dispute resolved with cancellation: ${resolution}`).catch((e) => {
        console.error('[avatarx-server] Failed to refund escrow funds:', e);
      });
      
      // Cancel order with refund
      order.status = 'cancelled';
      order.updateStatus('cancelled', `Dispute resolved: ${resolution}`, req.userId);
    }

    await order.save();

    res.json({
      ok: true,
      order: sanitizeOrder(order),
      message: 'Dispute resolved successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] resolveDispute error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Get dispute details
export async function getDisputeDetailsHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('buyerId', 'displayName email avatar')
      .populate('creatorId', 'displayName email avatar')
      .lean();

    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer, seller, or admin
    const user = await User.findById(req.userId);
    const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin');
    const buyerId = typeof order.buyerId === 'object' && order.buyerId !== null
      ? (order.buyerId as { _id?: { toString(): string } })._id?.toString() ?? ''
      : String(order.buyerId ?? '');
    const sellerId = typeof order.creatorId === 'object' && order.creatorId !== null
      ? (order.creatorId as { _id?: { toString(): string } })._id?.toString() ?? ''
      : String(order.creatorId ?? '');
    const isBuyer = buyerId === req.userId;
    const isSeller = sellerId === req.userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    if (!order.dispute.isDisputed) {
      res.status(404).json({ ok: false, error: { message: 'No dispute found for this order' } });
      return;
    }

    res.json({
      ok: true,
      dispute: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        buyer: order.buyerId,
        seller: order.creatorId,
        dispute: order.dispute,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        totalPrice: order.totalPrice,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error('[avatarx-server] getDisputeDetails error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Add evidence to dispute
export async function addDisputeEvidenceHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId, evidence } = req.body;

    if (!orderId || !evidence) {
      res.status(400).json({ ok: false, error: { message: 'Order ID and evidence are required' } });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer or seller
    if (order.buyerId.toString() !== req.userId && order.creatorId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    if (!order.dispute.isDisputed) {
      res.status(400).json({ ok: false, error: { message: 'No dispute exists for this order' } });
      return;
    }

    // Add evidence
    if (!order.dispute.evidence) {
      order.dispute.evidence = [];
    }
    order.dispute.evidence.push(...evidence);

    await order.save();

    res.json({
      ok: true,
      order: sanitizeOrder(order),
      message: 'Evidence added successfully',
    });
  } catch (error) {
    console.error('[avatarx-server] addDisputeEvidence error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Admin Resolve Payout
export async function adminResolvePayoutHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;
    const adminUser = await User.findById(req.userId);
    
    if (!adminUser || (!adminUser.roles.includes('admin') && !adminUser.roles.includes('super_admin'))) {
      res.status(403).json({ ok: false, error: { message: 'Forbidden: Admin access required' } });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    order.updateStatus('completed', 'Admin resolved dispute in favor of Creator', req.userId);
    if (order.dispute) {
      order.dispute.status = 'resolved';
    }

    await order.save();
    
    await escrowService.releaseFunds(order._id.toString(), req.userId, 'Admin resolved dispute in favor of Creator').catch((e) => {
      console.error('[avatarx-server] Failed to release escrow funds:', e);
    });

    res.json({
      ok: true,
      order: sanitizeOrder(order),
      message: 'Admin resolved payout to Creator'
    });
  } catch (error) {
    console.error('[avatarx-server] adminResolvePayoutHandler error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

// Admin Resolve Refund
export async function adminResolveRefundHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;
    const adminUser = await User.findById(req.userId);
    
    if (!adminUser || (!adminUser.roles.includes('admin') && !adminUser.roles.includes('super_admin'))) {
      res.status(403).json({ ok: false, error: { message: 'Forbidden: Admin access required' } });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    order.updateStatus('refunded' as any, 'Admin resolved dispute in favor of Buyer (Refunded)', req.userId);
    if (order.dispute) {
      order.dispute.status = 'resolved';
    }

    await order.save();
    
    await escrowService.refundFunds(order._id.toString(), req.userId, 'Admin resolved dispute in favor of Buyer').catch((e) => {
      console.error('[avatarx-server] Failed to refund escrow funds:', e);
    });

    res.json({
      ok: true,
      order: sanitizeOrder(order),
      message: 'Admin resolved refund to Buyer'
    });
  } catch (error) {
    console.error('[avatarx-server] adminResolveRefundHandler error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
