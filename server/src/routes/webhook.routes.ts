import { Router } from 'express';
import express from 'express';
import { clerkWebhookHandler } from '../controllers/webhook.controller';

export const webhookRouter = Router();

// Clerk sends webhooks as POST requests. We must parse the raw body to verify the signature.
webhookRouter.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhookHandler);
