import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  ollamaStatusHandler,
  ollamaGenerateHandler,
  ollamaChatHandler,
} from '../controllers/ollama.controller';

export const ollamaRouter = Router();

ollamaRouter.get('/status', ollamaStatusHandler);
ollamaRouter.post('/generate', authenticate, ollamaGenerateHandler);
ollamaRouter.post('/chat', authenticate, ollamaChatHandler);
