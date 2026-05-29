import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, createTestApp, createTestUser, createTestSeller, authHeader } from '../test-utils/test-setup';
import { Gig } from '../models/gig.model';
import { Order } from '../models/order.model';
import type express from 'express';

let app: express.Express;
let buyerToken: string;
let sellerToken: string;
let buyerId: string;
let sellerId: string;
let gigId: string;
let orderId: string;

beforeAll(async () => {
  await setupTestDB();
  app = createTestApp();

  const buyer = await createTestUser();
  const seller = await createTestSeller();
  buyerToken = buyer.accessToken;
  sellerToken = seller.accessToken;
  buyerId = buyer.user._id.toString();
  sellerId = seller.user._id.toString();

  const gig = await Gig.create({
    title: 'Test Gig Service',
    slug: `test-gig-${Date.now()}`,
    description: 'A test gig for integration testing',
    type: 'service',
    category: 'Custom Services',
    isAdultContent: false,
    tags: ['test', 'integration'],
    sellerId: seller.user._id,
    sellerDisplayName: seller.user.displayName as string,
    sellerAvatar: seller.user.avatar as string,
    sellerLevel: 'new',
    sellerVerificationBadge: false,
    thumbnail: 'https://example.com/thumbnail.jpg',
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
  gigId = gig._id.toString();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

describe('Order Lifecycle', () => {
  it('should create an order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(buyerToken))
      .send({
        gigId,
        tierName: 'Basic',
        extras: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe('payment_pending');
    orderId = res.body.order._id;
  });

  it('should get all orders for buyer', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set(authHeader(buyerToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
  });

  it('should get specific order by ID', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set(authHeader(buyerToken));

    expect(res.status).toBe(200);
    expect(res.body.order._id).toBe(orderId);
  });

  it('should reject unauthenticated order access', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`);

    expect(res.status).toBe(401);
  });

  it('should transition order to in_progress (seller)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(sellerToken))
      .send({ status: 'in_progress', comment: 'Starting work' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('in_progress');
  });

  it('should transition order to delivered (seller)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(sellerToken))
      .send({ status: 'delivered', comment: 'Work completed' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('delivered');
  });

  it('should transition order to completed (seller)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(sellerToken))
      .send({ status: 'completed', comment: 'Order completed' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('completed');
  });

  it('should submit a review for completed order', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/review`)
      .set(authHeader(buyerToken))
      .send({ rating: 5, comment: 'Excellent work!' });

    expect(res.status).toBe(200);
    expect(res.body.order.review).toBeDefined();
    expect(res.body.order.review.rating).toBe(5);
  });

  it('should reject review without rating', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/review`)
      .set(authHeader(buyerToken))
      .send({ comment: 'Good work!' });

    expect(res.status).toBe(400);
  });
});

describe('Order Revisions', () => {
  let revisionOrderId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(buyerToken))
      .send({
        gigId,
        tierName: 'Basic',
        extras: [],
      });

    revisionOrderId = res.body.order._id;

    await request(app)
      .patch(`/api/orders/${revisionOrderId}/status`)
      .set(authHeader(sellerToken))
      .send({ status: 'in_progress' });

    await request(app)
      .patch(`/api/orders/${revisionOrderId}/status`)
      .set(authHeader(sellerToken))
      .send({ status: 'delivered' });
  });

  it('should request a revision', async () => {
    const res = await request(app)
      .post(`/api/orders/${revisionOrderId}/revision/request`)
      .set(authHeader(buyerToken))
      .send({ message: 'Please make some changes' });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
  });

  it('should complete a revision', async () => {
    const res = await request(app)
      .post(`/api/orders/${revisionOrderId}/revision/complete`)
      .set(authHeader(sellerToken))
      .send({ message: 'Changes completed' });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
  });
});

describe('Order Disputes', () => {
  let disputeOrderId: string;

  beforeAll(async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set(authHeader(buyerToken))
      .send({
        gigId,
        tierName: 'Basic',
        extras: [],
      });

    disputeOrderId = createRes.body.order._id;

    await request(app)
      .patch(`/api/orders/${disputeOrderId}/status`)
      .set(authHeader(buyerToken))
      .send({ status: 'payment_completed' });

    await request(app)
      .patch(`/api/orders/${disputeOrderId}/status`)
      .set(authHeader(sellerToken))
      .send({ status: 'in_progress' });
  });

  it('should create a dispute', async () => {
    const res = await request(app)
      .post(`/api/orders/${disputeOrderId}/dispute`)
      .set(authHeader(buyerToken))
      .send({
        orderId: disputeOrderId,
        reason: 'seller_not_delivering',
        description: 'Seller did not deliver on time',
      });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.dispute.isDisputed).toBe(true);
  });

  it('should get dispute details', async () => {
    const res = await request(app)
      .get(`/api/orders/${disputeOrderId}/dispute`)
      .set(authHeader(buyerToken));

    expect(res.status).toBe(200);
    expect(res.body.dispute).toBeDefined();
  });
});
