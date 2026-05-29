import { Router } from 'express';
import {
  getConversationsHandler,
  getConversationHandler,
  getMessagesHandler,
  createConversationHandler,
  sendMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  markAsReadHandler,
  archiveConversationHandler,
  getUnreadCountHandler,
} from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

export const messageRouter = Router();

// Public routes
messageRouter.get('/status', (_req, res) => {
  res.status(200).json({ ok: true, route: 'message/status' });
});

// Protected routes (require authentication)
messageRouter.get('/conversations', authenticate, getConversationsHandler);
messageRouter.get('/conversations/:conversationId', authenticate, getConversationHandler);
messageRouter.get('/conversations/:conversationId/messages', authenticate, getMessagesHandler);
messageRouter.post('/conversations', authenticate, createConversationHandler);
messageRouter.post('/messages', authenticate, sendMessageHandler);
messageRouter.patch('/messages/:messageId', authenticate, editMessageHandler);
messageRouter.delete('/messages/:messageId', authenticate, deleteMessageHandler);
messageRouter.post('/conversations/:conversationId/read', authenticate, markAsReadHandler);
messageRouter.patch('/conversations/:conversationId/archive', authenticate, archiveConversationHandler);
messageRouter.get('/unread-count', authenticate, getUnreadCountHandler);
