import { Router } from 'express';
import {
  createOrderHandler,
  getOrdersHandler,
  getOrderHandler,
  updateOrderStatusHandler,
  submitRequirementsHandler,
  requestRevisionHandler,
  completeRevisionHandler,
  submitReviewHandler,
  createDisputeHandler,
  getDisputesHandler,
  resolveDisputeHandler,
  getDisputeDetailsHandler,
  addDisputeEvidenceHandler,
  adminResolvePayoutHandler,
  adminResolveRefundHandler,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

export const orderRouter = Router();

// Public routes
orderRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'order/status' });
});

// Protected routes (require authentication)
orderRouter.get('/disputes/all', authenticate, getDisputesHandler);
orderRouter.post('/initialize', authenticate, createOrderHandler);
orderRouter.get('/my-contracts', authenticate, getOrdersHandler);
orderRouter.get('/:id', authenticate, getOrderHandler);
orderRouter.patch('/:id/status', authenticate, updateOrderStatusHandler);
orderRouter.post('/:orderId/requirements', authenticate, submitRequirementsHandler);
orderRouter.post('/:orderId/revision/request', authenticate, requestRevisionHandler);
orderRouter.post('/:orderId/revision/complete', authenticate, completeRevisionHandler);
orderRouter.post('/:orderId/review', authenticate, submitReviewHandler);

// Dispute resolution routes
orderRouter.patch('/:id/dispute', authenticate, createDisputeHandler);
orderRouter.get('/:id/dispute', authenticate, getDisputeDetailsHandler);
orderRouter.post('/:id/dispute/evidence', authenticate, addDisputeEvidenceHandler);
orderRouter.post('/:id/dispute/resolve', authenticate, resolveDisputeHandler);

// Admin Settlement Channels
orderRouter.post('/:id/admin-resolve-payout', authenticate, adminResolvePayoutHandler);
orderRouter.post('/:id/admin-resolve-refund', authenticate, adminResolveRefundHandler);
