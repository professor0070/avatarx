import { Router } from 'express';
import {
  createBuyerRequestHandler,
  getBuyerRequestsHandler,
  getBuyerRequestByIdHandler,
  getMyBuyerRequestsHandler,
  submitProposalHandler,
  acceptProposalHandler,
  rejectProposalHandler,
  updateBuyerRequestHandler,
  deleteBuyerRequestHandler,
} from '../controllers/buyer-request.controller';
import { authenticate } from '../middleware/auth.middleware';

export const buyerRequestRouter = Router();

// Public routes
buyerRequestRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'buyer-request/status' });
});

// Public route - browse buyer requests (for freelancers)
buyerRequestRouter.get('/', getBuyerRequestsHandler);

// Protected routes (require authentication)
buyerRequestRouter.get('/my/requests', authenticate, getMyBuyerRequestsHandler);
buyerRequestRouter.get('/:requestId', authenticate, getBuyerRequestByIdHandler);
buyerRequestRouter.post('/', authenticate, createBuyerRequestHandler);
buyerRequestRouter.post('/:requestId/proposals', authenticate, submitProposalHandler);
buyerRequestRouter.patch('/:requestId/proposals/accept', authenticate, acceptProposalHandler);
buyerRequestRouter.patch('/:requestId/proposals/reject', authenticate, rejectProposalHandler);
buyerRequestRouter.put('/:requestId', authenticate, updateBuyerRequestHandler);
buyerRequestRouter.delete('/:requestId', authenticate, deleteBuyerRequestHandler);
