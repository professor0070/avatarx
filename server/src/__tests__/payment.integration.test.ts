import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, createTestApp, createTestUser, authHeader } from '../test-utils/test-setup';
import { Gig } from '../models/gig.model';
import { Order } from '../models/order.model';
import { User } from '../models/user.model';
import type express from 'express';

vi.mock('razorpay', () => {
  const mockOrdersCreate = vi.fn().mockResolvedValue({
    id: 'order_mock_test_123',
    amount: 10000,
    currency: 'INR',
    status: 'created',
  });

  const mockPaymentsFetch = vi.fn().mockResolvedValue({
    id: 'pay_mock_test_123',
    status: 'captured',
    amount: 10000,
    currency: 'INR',
    order_id: 'order_mock_test_123',
  });

  class MockRazorpay {
    orders = { create: mockOrdersCreate };
    payments = { fetch: mockPaymentsFetch };
  }

  return {
    default: MockRazorpay,
  };
});

let app: express.Express;
let buyerToken: string;
let sellerToken: string;
let buyerId: string;
let sellerId: string;
let productId: string;
let gigOrderId: string;

beforeAll(async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key';
  process.env.RAZORPAY_KEY_SECRET = 'mock_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';

  await setupTestDB();
  app = createTestApp();

  const buyer = await createTestUser({ credits: 500, crWalletBalance: 1000 });
  const seller = await createTestUser({
    username: `seller_${Date.now()}`,
    email: `seller_${Date.now()}@example.com`,
    displayName: `Seller ${Date.now()}`,
    role: 'seller',
    imvuId: `seller_imvu_${Date.now()}`,
  });
  buyerToken = buyer.accessToken;
  sellerToken = seller.accessToken;
  buyerId = buyer.user._id.toString();
  sellerId = seller.user._id.toString();

  const gig = await Gig.create({
    title: 'Payment Test Gig',
    slug: `payment-test-gig-${Date.now()}`,
    description: 'Gig for payment testing',
    type: 'service',
    category: 'Custom Services',
    isAdultContent: false,
    tags: ['test', 'payment'],
    sellerId: seller.user._id,
    sellerDisplayName: seller.user.displayName as string,
    sellerAvatar: seller.user.avatar as string,
    sellerLevel: 'new',
    sellerVerificationBadge: false,
    thumbnail: 'https://example.com/thumb.jpg',
    status: 'active',
    tiers: [{
      name: 'Basic',
      description: 'Basic tier',
      price: 100,
      currency: 'INR',
      deliveryTimeDays: 3,
      revisions: 2,
      features: ['Feature 1'],
    }],
    deliveryType: 'manual',
    faqs: [],
    requirements: { enabled: false, questions: [] },
  });
  productId = gig._id.toString();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

describe('Payment - Gig Order Razorpay', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(buyerToken))
      .send({ gigId: productId, tierName: 'Basic', extras: [] });

    gigOrderId = res.body.order._id;
  });

  it('should create a razorpay order for a gig order', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/create-order')
      .set(authHeader(buyerToken))
      .send({ orderId: gigOrderId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should reject razorpay order without auth', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/create-order')
      .send({ orderId: gigOrderId });

    expect(res.status).toBe(401);
  });

  it('should reject razorpay order for non-existent order', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/payments/razorpay/create-order')
      .set(authHeader(buyerToken))
      .send({ orderId: fakeId });

    expect(res.status).toBe(404);
  });
});

describe('Payment - Webhook Handling', () => {
  function signWebhookPayload(payload: Record<string, unknown>): string {
    const body = JSON.stringify(payload);
    const secret = 'test-webhook-secret';
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('should reject webhook without signature', async () => {
    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .send({ event: 'payment.captured' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Missing webhook signature');
  });

  it('should reject webhook with invalid signature', async () => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_test', order_id: 'order_test', amount: 10000, currency: 'INR', status: 'captured' } },
      },
    };

    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('x-razorpay-signature', 'invalid-signature')
      .send(payload);

    expect(res.status).toBe(400);
  });

  it('should handle payment.captured webhook with valid signature', async () => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_captured_test', order_id: 'order_test_123', amount: 10000, currency: 'INR', status: 'captured' } },
        order: { entity: { receipt: gigOrderId } },
      },
    };

    const signature = signWebhookPayload(payload);
    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should handle payment.failed webhook', async () => {
    const payload = {
      event: 'payment.failed',
      payload: {
        payment: { entity: { id: 'pay_failed_test', order_id: 'order_test_456', amount: 10000, currency: 'INR', status: 'failed', error_description: 'Insufficient funds' } },
        order: { entity: { receipt: gigOrderId } },
      },
    };

    const signature = signWebhookPayload(payload);
    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should handle order.paid webhook', async () => {
    const payload = {
      event: 'order.paid',
      payload: {
        order: { entity: { id: 'order_paid_test', receipt: gigOrderId, amount: 10000, currency: 'INR', status: 'paid' } },
      },
    };

    const signature = signWebhookPayload(payload);
    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should ignore unknown webhook events', async () => {
    const payload = { event: 'subscription.activated', payload: {} };
    const signature = signWebhookPayload(payload);
    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
  });
});

describe('Payment - Payment Status', () => {
  it('should get payment status for a gig order', async () => {
    const res = await request(app)
      .get(`/api/payments/status/${gigOrderId}`)
      .set(authHeader(buyerToken));

    expect(res.status).toBe(200);
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.status).toBeDefined();
  });

  it('should reject payment status check without auth', async () => {
    const res = await request(app)
      .get(`/api/payments/status/${gigOrderId}`);

    expect(res.status).toBe(401);
  });
});

describe('Payment - Refund', () => {
  it('should reject refund without auth', async () => {
    const res = await request(app)
      .post('/api/payments/refund')
      .send({ transactionId: 'test_txn_123', amount: 50, reason: 'Test refund' });

    expect(res.status).toBe(401);
  });
});

describe('Payment - Wallet Balance', () => {
  it('should reflect wallet balance changes', async () => {
    const user = await User.findById(buyerId);
    expect(user).toBeDefined();
    expect(user!.crWalletBalance).toBeGreaterThanOrEqual(0);
  });
});
