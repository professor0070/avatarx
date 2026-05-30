import dns from 'node:dns';

// Force IPv4 DNS resolution for Node 24 (CRITICAL: must be before other imports)
dns.setDefaultResultOrder('ipv4first');
try {
  // Use Google DNS to ensure SRV records resolve correctly over IPv4
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if servers cannot be set in this environment
}



import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory or parent (monorepo root)
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Load local server/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Load root .env
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

// Debug: Log environment loading status (safely masked)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  console.log(`[avatarx-server] ✓ MONGODB_URI loaded: ${maskedUri}`);
} else {
  console.warn('[avatarx-server] ✗ MONGODB_URI not found in environment');
  console.log('[avatarx-server] Tried loading from:', path.resolve(__dirname, '../../.env'));
}

console.log('[avatarx-server] CLERK_SECRET_KEY length:', process.env.CLERK_SECRET_KEY ? process.env.CLERK_SECRET_KEY.length : 'NOT FOUND');
console.log('[avatarx-server] CLERK_PUBLISHABLE_KEY length:', process.env.CLERK_PUBLISHABLE_KEY ? process.env.CLERK_PUBLISHABLE_KEY.length : 'NOT FOUND');
console.log('[avatarx-server] CLERK_PUBLISHABLE_KEY value:', process.env.CLERK_PUBLISHABLE_KEY || 'NOT FOUND');


// Validate critical environment variables
function validateEnv(): { ok: boolean; missing: string[] } {
  const required = ['MONGODB_URI', 'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  // JWT secrets are optional - JWT utils handle splitting/fallback
  return { ok: missing.length === 0, missing };
}

import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './config/db';
import { rateLimitMiddleware, strictAuthLimiter } from './middleware/rateLimit.middleware';
import { sellerGuard } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { SocketService } from './services/socket.service';
import { authRouter } from './routes/auth.routes';
import { gigRouter } from './routes/gig.routes';
import { uploadRouter } from './routes/upload.routes';
import { searchRouter } from './routes/search.routes';
import { orderRouter } from './routes/order.routes';
import { paymentRouter } from './routes/payment.routes';
import { messageRouter } from './routes/message.routes';
import { contentRouter } from './routes/content.routes';
import { notificationRouter } from './routes/notification.routes';
import { buyerRequestRouter } from './routes/buyer-request.routes';
import { customOfferRouter } from './routes/custom-offer.routes';
import { userRouter } from './routes/user.routes';
import { verificationRouter } from './routes/verification.routes';
import { assetRouter } from './routes/asset.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { ollamaRouter } from './routes/ollama.routes';
import { adminRouter } from './routes/admin.routes';
import { webhookRouter } from './routes/webhook.routes';
import mongoose from 'mongoose';

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  // Validate environment before starting
  const envCheck = validateEnv();
  if (!envCheck.ok) {
    console.warn(`[avatarx-server] ⚠ Missing env vars: ${envCheck.missing.join(', ')}`);
  } else {
    console.log('[avatarx-server] ✓ All critical environment variables loaded');
  }

  await connectDB(process.env.MONGODB_URI);

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(morgan('dev'));

  // Webhooks must be parsed before express.json() to maintain raw buffer for Svix verification
  app.use('/api/webhooks', webhookRouter);

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, process.env.CORS_ORIGIN].filter(Boolean) as string[]
    : ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL, process.env.CORS_ORIGIN].filter(Boolean) as string[];

  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'avatarx-server' });
  });

  // Phase 1: apply general rate limiting to all public REST APIs.
  // Note: /api/auth/sync is a session management endpoint called on every page load —
  // it must NOT be separately rate-limited. Clerk handles actual authentication.
  app.use('/api', rateLimitMiddleware);

  // Global Seller Guard for anything nested under /api/seller
  app.use('/api/seller', sellerGuard);

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
  app.use('/api/ollama', ollamaRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', adminRouter);

  app.get('/api', (_req, res) => {
    res.status(200).json({ 
      name: 'avatarx-server', 
      routes: [
        '/api/health',
        '/api/auth',
        '/api/gigs',
        '/api/upload',
        '/api/search',
        '/api/orders',
        '/api/payments',
        '/api/messages',
        '/api/content',
        '/api/notifications',
        '/api/buyer-requests',
        '/api/custom-offers',
        '/api/users',
        '/api/verification',
        '/api/assets',
        '/api/dashboard',
        '/api/ollama',
        '/api/admin',
      ] 
    });
  });

  app.use(errorMiddleware);

  const httpServer = http.createServer(app);

  const socketAllowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, process.env.CORS_ORIGIN].filter(Boolean) as string[]
    : ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL, process.env.CORS_ORIGIN].filter(Boolean) as string[];

  const io = new Server(httpServer, {
    cors: {
      origin: socketAllowedOrigins.length > 0 ? socketAllowedOrigins : 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId || 'anonymous';
    
    socket.emit('server:connected', { ok: true, socketId: socket.id });

    socket.on('disconnect', (reason) => {
    });
  });

  // Initialize Socket.IO service
  const socketService = new SocketService(io);
  
  // Make io available to routes
  app.set('io', io);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[avatarx-server] 🚀 Server running at http://0.0.0.0:${PORT}`);
    console.log(`[avatarx-server] ⚡ API available at http://0.0.0.0:${PORT}/api`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('[avatarx-server] 🛑 Shutting down gracefully...');
    httpServer.close(() => {
      console.log('[avatarx-server] HTTP server closed.');
      mongoose.connection.close(false).then(() => {
        console.log('[avatarx-server] MongoDB connection closed.');
        process.exit(0);
      });
    });
    
    // Force close after 10s
    setTimeout(() => {
      console.error('[avatarx-server] ⚠ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[avatarx-server] 💥 Fatal error during startup:', err);
  process.exit(1);
});
