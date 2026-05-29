import express, { Router } from 'express';
import {
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
  razorpayWebhookHandler,
  getPaymentStatusHandler,
  processRefundHandler,
  createMarketplaceOrderHandler,
  verifyMarketplacePaymentHandler,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

export const paymentRouter = Router();

// Public routes
paymentRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'payment/status' });
});

// Webhook endpoint (no authentication required, raw body needed for HMAC verification)
paymentRouter.post('/webhook/razorpay', express.raw({ type: 'application/json' }), razorpayWebhookHandler);

// Protected routes (require authentication)
paymentRouter.post('/razorpay/create-order', authenticate, createRazorpayOrderHandler);
paymentRouter.post('/razorpay/verify', authenticate, verifyRazorpayPaymentHandler);
paymentRouter.get('/status/:orderId', authenticate, getPaymentStatusHandler);
paymentRouter.post('/refund', authenticate, processRefundHandler);

// Marketplace payment routes
paymentRouter.post('/create-order', authenticate, createMarketplaceOrderHandler);
paymentRouter.post('/verify-payment', authenticate, verifyMarketplacePaymentHandler);
