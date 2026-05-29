import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';

import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { errorMiddleware } from '../middleware/error.middleware';
import { authRouter } from '../routes/auth.routes';
import { gigRouter } from '../routes/gig.routes';
import { uploadRouter } from '../routes/upload.routes';
import { searchRouter } from '../routes/search.routes';
import { orderRouter } from '../routes/order.routes';
import { paymentRouter } from '../routes/payment.routes';
import { messageRouter } from '../routes/message.routes';
import { contentRouter } from '../routes/content.routes';
import { notificationRouter } from '../routes/notification.routes';
import { buyerRequestRouter } from '../routes/buyer-request.routes';
import { customOfferRouter } from '../routes/custom-offer.routes';
import { userRouter } from '../routes/user.routes';
import { verificationRouter } from '../routes/verification.routes';
import { assetRouter } from '../routes/asset.routes';
import { dashboardRouter } from '../routes/dashboard.routes';
import { SocketService } from '../services/socket.service';
import { User } from '../models/user.model';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { IUser } from '../models/user.model';

let mongoServer: MongoMemoryServer;

export async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function teardownTestDB() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));
  app.use('/api', rateLimitMiddleware);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'avatarx-server' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/gigs', gigRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/buyer-requests', buyerRequestRouter);
  app.use('/api/custom-offers', customOfferRouter);
  app.use('/api/users', userRouter);
  app.use('/api/verification', verificationRouter);
  app.use('/api/assets', assetRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(errorMiddleware);

  return app;
}

export function createSocketServer(app: express.Express): { httpServer: http.Server; io: SocketIOServer } {
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', credentials: true },
  });

  io.on('connection', (socket) => {
    socket.emit('server:connected', { ok: true, socketId: socket.id });
  });

  new SocketService(io);
  return { httpServer, io };
}

export interface TestUserData {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export async function createTestUser(overrides: Partial<IUser> = {}): Promise<TestUserData> {
  const password = 'TestPass123';
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password,
    imvuId: `imvu_${Date.now()}`,
    displayName: `Test User ${Date.now()}`,
    role: 'user' as const,
    isOnline: false,
    ...overrides,
  };

  const user = await User.create(userData);

  const accessToken = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET || 'test-access-secret-min-32-chars!!',
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString(), tokenVersion: 0 },
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-32-chars!!',
    { expiresIn: '7d' },
  );

  return { user, accessToken, refreshToken };
}

export async function createTestSeller(): Promise<TestUserData> {
  return createTestUser({
    username: `seller_${Date.now()}`,
    email: `seller_${Date.now()}@example.com`,
    displayName: `Seller ${Date.now()}`,
    role: 'seller',
    imvuId: `seller_imvu_${Date.now()}`,
  });
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
