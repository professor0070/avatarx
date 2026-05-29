import type { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import type { Payments } from 'razorpay/dist/types/payments';
import type { Orders } from 'razorpay/dist/types/orders';
import type { Refunds } from 'razorpay/dist/types/refunds';
import { Order } from '../models/order.model';
import { MarketOrder } from '../models/market-order.model';
import { Product } from '../models/Product';
import { User } from '../models/user.model';
import { paymentService } from '../services/payment.service';
import type { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { escrowService } from '../services/escrow.service';

type RazorpayPayment = Payments.RazorpayPayment;
type RazorpayOrder = Orders.RazorpayOrder;
type RazorpayRefund = Refunds.RazorpayRefund;

// Create Razorpay order
export async function createRazorpayOrderHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ ok: false, error: { message: 'Order ID is required' } });
      return;
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    if (order.buyerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    if (order.status !== 'payment_pending') {
      res.status(400).json({ ok: false, error: { message: 'Order is not in payment pending state' } });
      return;
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      res.status(500).json({ ok: false, error: { message: 'Payment gateway not configured' } });
      return;
    }

    // Create Razorpay order using server-validated amounts from the database
    const razorpayOrder = {
      amount: order.totalPrice * 100, // Razorpay expects amount in paise (INR) or cents (USD)
      currency: order.currency,
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        buyerId: order.buyerId.toString(),
        sellerId: order.sellerId.toString(),
        gigId: order.gigId.toString(),
      },
    };

    try {
      // Import Razorpay dynamically to avoid issues if not installed
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const razorpayOrderResponse = await razorpay.orders.create(razorpayOrder) as any;

      // Update order with Razorpay order ID
      order.payment.transactionId = razorpayOrderResponse.id;
      await order.save();

      res.json({
        ok: true,
        razorpayOrder: {
          id: razorpayOrderResponse.id,
          amount: razorpayOrderResponse.amount,
          currency: razorpayOrderResponse.currency,
          key_id: process.env.RAZORPAY_KEY_ID,
        },
      });

    } catch (razorpayError: any) {
      console.error('[avatarx-server] Razorpay order creation error:', razorpayError);
      res.status(500).json({ 
        ok: false, 
        error: { message: 'Failed to create payment order' } 
      });
    }

  } catch (error) {
    console.error('[avatarx-server] createRazorpayOrder error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Verify Razorpay payment
export async function verifyRazorpayPaymentHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ ok: false, error: { message: 'Missing payment verification parameters' } });
      return;
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ ok: false, error: { message: 'Invalid payment signature' } });
      return;
    }

    // Find order by Razorpay order ID
    const order = await Order.findOne({ 'payment.transactionId': razorpay_order_id });
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    if (order.buyerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    if (order.paymentStatus !== 'pending') {
      res.status(400).json({ ok: false, error: { message: 'Payment already processed' } });
      return;
    }

    // Fetch payment details from Razorpay
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const payment: RazorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

      if (payment.status !== 'captured') {
        res.status(400).json({ ok: false, error: { message: 'Payment not captured' } });
        return;
      }

      // Update order with payment details
      order.payment.transactionId = razorpay_payment_id;
      order.payment.paidAt = new Date();
      order.paymentStatus = 'completed';
      order.updateStatus('payment_completed', 'Payment completed via Razorpay');

      // Update order status based on requirements
      if (order.requirements.enabled) {
        order.updateStatus('requirements_submitted', 'Awaiting buyer requirements');
      } else {
        order.updateStatus('in_progress', 'Order started');
      }

      // Calculate response time
      const responseTime = Math.abs(new Date().getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
      order.metrics.responseTime = Math.round(responseTime);

      await order.save();

      // Hold funds in escrow
      await escrowService.holdFunds(order._id.toString(), razorpay_payment_id).catch((e) => {
        console.error('[avatarx-server] Failed to hold funds in escrow:', e);
      });

      // Notify seller that payment is complete and order has started
      NotificationService.send({
        userId: order.sellerId.toString(),
        type: 'order_payment_completed',
        title: 'New Order Started 🚀',
        message: 'Payment received — your order is now in progress.',
        relatedOrderId: order._id.toString(),
        actionUrl: `/dashboard/orders/${order._id}`,
        actionLabel: 'View Order',
        priority: 'high',
      }).catch((e) => console.error('[avatarx-server] Failed to send payment notification:', e));

      res.json({
        ok: true,
        order: {
          id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
      });

    } catch (razorpayError: any) {
      console.error('[avatarx-server] Razorpay payment fetch error:', razorpayError);
      res.status(500).json({ 
        ok: false, 
        error: { message: 'Failed to verify payment' } 
      });
    }

  } catch (error) {
    console.error('[avatarx-server] verifyRazorpayPayment error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Razorpay webhook handler
export async function razorpayWebhookHandler(req: Request, res: Response) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[avatarx-server] Razorpay webhook secret not configured');
      return res.status(500).json({ ok: false, error: { message: 'Webhook not configured' } });
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return res.status(400).json({ ok: false, error: { message: 'Missing webhook signature' } });
    }

    // Verify webhook signature against raw body buffer
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[avatarx-server] Invalid webhook signature');
      return res.status(400).json({ ok: false, error: { message: 'Invalid signature' } });
    }

    const event = JSON.parse(rawBody.toString());
    const eventType = event.event;

    console.log('[avatarx-server] Razorpay webhook event:', eventType);

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;
      default:
        console.log('[avatarx-server] Unhandled webhook event:', eventType);
    }

    res.json({ ok: true });

  } catch (error) {
    console.error('[avatarx-server] razorpayWebhook error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Webhook processing failed' } 
    });
  }
}

// Handle payment captured webhook event
async function handlePaymentCaptured(payment: RazorpayPayment) {
  try {
    const order = await Order.findOne({ 'payment.transactionId': payment.order_id });
    if (!order) {
      console.error('[avatarx-server] Order not found for payment:', payment.id);
      return;
    }

    if (order.paymentStatus !== 'pending') {
      console.log('[avatarx-server] Payment already processed for order:', order._id);
      return;
    }

    // Update order with payment details
    order.payment.transactionId = payment.id;
    order.payment.paidAt = new Date(payment.created_at * 1000);
    order.paymentStatus = 'completed';
    order.updateStatus('payment_completed', 'Payment captured via webhook');

    // Update order status based on requirements
    if (order.requirements.enabled) {
      order.updateStatus('requirements_submitted', 'Awaiting buyer requirements');
    } else {
      order.updateStatus('in_progress', 'Order started');
    }

    await order.save();

    // Hold funds in escrow
    await escrowService.holdFunds(order._id.toString(), payment.id).catch((e) => {
      console.error('[avatarx-server] Failed to hold funds in escrow:', e);
    });

    console.log('[avatarx-server] Payment captured for order:', order._id);

  } catch (error) {
    console.error('[avatarx-server] Error handling payment captured:', error);
  }
}

// Handle payment failed webhook event
async function handlePaymentFailed(payment: RazorpayPayment) {
  try {
    const order = await Order.findOne({ 'payment.transactionId': payment.order_id });
    if (!order) {
      console.error('[avatarx-server] Order not found for failed payment:', payment.id);
      return;
    }

    order.paymentStatus = 'failed';
    order.updateStatus('payment_failed', `Payment failed: ${payment.error_description || 'Unknown error'}`);
    await order.save();

    console.log('[avatarx-server] Payment failed for order:', order._id);

  } catch (error) {
    console.error('[avatarx-server] Error handling payment failed:', error);
  }
}

// Handle order paid webhook event
async function handleOrderPaid(razorpayOrder: RazorpayOrder) {
  try {
    const order = await Order.findOne({ 'payment.transactionId': razorpayOrder.id });
    if (!order) {
      console.error('[avatarx-server] Order not found for Razorpay order:', razorpayOrder.id);
      return;
    }

    if (order.paymentStatus === 'completed') {
      console.log('[avatarx-server] Payment already processed for order:', order._id);
      return;
    }

    order.paymentStatus = 'completed';
    order.payment.paidAt = new Date(razorpayOrder.created_at * 1000);
    order.updateStatus('payment_completed', 'Payment completed via Razorpay webhook');

    if (order.requirements.enabled) {
      order.updateStatus('requirements_submitted', 'Awaiting buyer requirements');
    } else {
      order.updateStatus('in_progress', 'Order started');
    }

    await order.save();

    // Hold funds in escrow
    await escrowService.holdFunds(order._id.toString()).catch((e) => {
      console.error('[avatarx-server] Failed to hold funds in escrow:', e);
    });

    console.log('[avatarx-server] Order paid webhook processed for:', order._id);
  } catch (error) {
    console.error('[avatarx-server] Error handling order paid:', error);
  }
}

// Get payment status
export async function getPaymentStatusHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is buyer or seller
    if (order.buyerId.toString() !== req.userId && order.sellerId.toString() !== req.userId) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    res.json({
      ok: true,
      payment: {
        status: order.paymentStatus,
        method: order.payment.method,
        transactionId: order.payment.transactionId,
        paidAt: order.payment.paidAt,
        refundAmount: order.payment.refundAmount,
        refundReason: order.payment.refundReason,
        refundedAt: order.payment.refundedAt,
      },
    });

  } catch (error) {
    console.error('[avatarx-server] getPaymentStatus error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Process refund
export async function processRefundHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount || !reason) {
      res.status(400).json({ ok: false, error: { message: 'Order ID, amount, and reason are required' } });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: { message: 'Order not found' } });
      return;
    }

    // Check if user is seller or admin
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ ok: false, error: { message: 'User not found' } });
      return;
    }

    if (order.sellerId.toString() !== req.userId && !user.roles.includes('admin') && !user.roles.includes('super_admin')) {
      res.status(403).json({ ok: false, error: { message: 'Access denied' } });
      return;
    }

    if (order.paymentStatus !== 'completed') {
      res.status(400).json({ ok: false, error: { message: 'Cannot refund unpaid order' } });
      return;
    }

    if (order.payment.method !== 'razorpay') {
      res.status(400).json({ ok: false, error: { message: 'Only Razorpay payments can be refunded' } });
      return;
    }

    const transactionId = order.payment.transactionId;
    if (!transactionId) {
      res.status(400).json({ ok: false, error: { message: 'No transaction ID found for this order' } });
      return;
    }

    // Process refund via Razorpay
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const refund = await (razorpay.payments.refund as (paymentId: string, params: Record<string, unknown>) => Promise<RazorpayRefund>)(transactionId, {
        amount: amount * 100, // Convert to paise/cents
        notes: {
          orderId: order._id.toString(),
          reason,
          processedBy: req.userId,
        },
      });

      // Update order with refund details
      order.payment.refundAmount = amount;
      order.payment.refundReason = reason;
      order.payment.refundedAt = new Date();
      order.paymentStatus = 'refunded';
      order.updateStatus('refunded', `Refund processed: ${reason}`, req.userId);

      await order.save();

      res.json({
        ok: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
      });

    } catch (razorpayError: any) {
      console.error('[avatarx-server] Razorpay refund error:', razorpayError);
      res.status(500).json({ 
        ok: false, 
        error: { message: 'Failed to process refund' } 
      });
    }

  } catch (error) {
    console.error('[avatarx-server] processRefund error:', error);
    res.status(500).json({ 
      ok: false, 
      error: { message: 'Internal server error' } 
    });
  }
}

// Marketplace: Create order for product purchase
export async function createMarketplaceOrderHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({ ok: false, error: { message: 'Product ID is required' } });
      return;
    }

    const result = await paymentService.generateRazorpayOrder(productId, req.userId);

    res.json({
      ok: true,
      order: {
        id: result.id,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
        key_id: result.key_id,
      },
    });

  } catch (error) {
    console.error('[avatarx-server] createMarketplaceOrder error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ 
      ok: false, 
      error: { message } 
    });
  }
}

// Marketplace: Verify payment and credit user
export async function verifyMarketplacePaymentHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ ok: false, error: { message: 'Authentication required' } });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ ok: false, error: { message: 'Missing payment verification parameters' } });
      return;
    }

    const result = await paymentService.processPaymentVerification(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      req.userId
    );

    if (!result.success) {
      res.status(400).json({ ok: false, error: { message: result.error || 'Payment verification failed' } });
      return;
    }

    res.json({
      ok: true,
      order: result.order,
    });

  } catch (error) {
    console.error('[avatarx-server] verifyMarketplacePayment error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ 
      ok: false, 
      error: { message } 
    });
  }
}
