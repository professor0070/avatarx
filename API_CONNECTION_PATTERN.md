# Frontend-Backend API Connection Pattern

## Overview
AvatarX uses a monorepo architecture with separate client (Vite/React) and server (Node/Express) directories.

## Architecture

```
avatarx/
├── client/          # Vite + React frontend (port 3000)
│   ├── src/
│   │   ├── lib/api.ts          # Axios client with interceptors
│   │   └── store/authStore.ts  # Zustand auth state
│   └── package.json
├── server/          # Node + Express backend (port 5000)
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── routes/             # API route handlers
│   │   └── utils/jwt.utils.ts  # JWT token utilities
│   └── package.json
└── .env             # Shared environment variables
```

## Environment Variables

### Root .env File
```
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
VITE_API_URL=http://localhost:5000
SOCKET_CORS_ORIGIN=http://localhost:3000
PORT=5000
```

### Client Environment
- `VITE_API_URL` - Backend API base URL (default: http://localhost:5000)
- Loaded from root .env via dotenv in server, and Vite's env system in client

### Server Environment
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- Loaded from root .env via `dotenv.config({ path: '../../.env' })`

## API Client Setup (Frontend)

### Axios Configuration (`client/src/lib/api.ts`)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // Important for cookies
});

// Request interceptor - adds access token
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor - handles 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { accessToken, user } = await refreshAccessToken();
        useAuthStore.getState().setSession({ accessToken, user });
        return api.request(error.config);
      } catch {
        useAuthStore.getState().clearSession();
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

## Authentication Flow

### 1. Login/Register
```
Client → POST /api/auth/login or /api/auth/register
       → Returns { accessToken, user }
       → Stores in authStore
       → Sets httpOnly cookie for refresh token
```

### 2. Token Refresh
```
Client → API request with expired access token
       → 401 response
       → POST /api/auth/refresh (uses httpOnly cookie)
       → Returns new { accessToken, user }
       → Updates authStore
       → Retries original request
```

### 3. Protected Routes
```
Client → Request with Bearer token
       → Server validates JWT_ACCESS_SECRET
       → Returns protected data
```

## JWT Token Architecture

### Access Token
- **Purpose**: API authentication
- **Secret**: `JWT_ACCESS_SECRET`
- **Expiry**: 15 minutes (configurable via `JWT_ACCESS_EXPIRY`)
- **Storage**: In-memory (Zustand store)
- **Transmission**: Authorization header

### Refresh Token
- **Purpose**: Obtain new access tokens
- **Secret**: `JWT_REFRESH_SECRET`
- **Expiry**: 7 days (configurable via `JWT_REFRESH_EXPIRY`)
- **Storage**: httpOnly cookie
- **Transmission**: Cookie (automatic)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Gigs
- `GET /api/gigs` - List all gigs
- `GET /api/gigs/:gigId` - Get gig details
- `POST /api/gigs` - Create gig (protected)
- `PUT /api/gigs/:gigId` - Update gig (protected)
- `DELETE /api/gigs/:gigId` - Delete gig (protected)

### Orders
- `GET /api/orders` - List user orders (protected)
- `POST /api/orders` - Create order (protected)
- `GET /api/orders/:orderId` - Get order details (protected)

### Messages
- `GET /api/messages/conversations` - List conversations (protected)
- `GET /api/messages/:conversationId` - Get messages (protected)
- `POST /api/messages` - Send message (protected)

### Upload
- `POST /api/upload` - Upload file (protected)

## Socket.IO Connection

### Client Setup
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true,
  auth: { token: accessToken }
});
```

### Server Setup
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});
```

## CORS Configuration

### Server (`server/src/index.ts`)
```typescript
app.use(cors({
  origin: [
    process.env.VITE_API_URL,
    process.env.SOCKET_CORS_ORIGIN
  ].filter(Boolean) as string[],
  credentials: true
}));
```

## Development vs Production

### Development
- Client: `http://localhost:3000`
- Server: `http://localhost:5000`
- Socket: `ws://localhost:5000`
- Environment: `.env` file in root

### Production
- Client: Deployed to Vercel/Netlify
- Server: Deployed to Railway/Render/AWS
- Socket: WSS endpoint
- Environment: CI/CD environment variables

## Common Issues

### 1. CORS Errors
- Ensure `VITE_API_URL` and `SOCKET_CORS_ORIGIN` match client URL
- Check server CORS configuration

### 2. Token Not Loading
- Verify `.env` file is in root directory
- Check dotenv path in `server/src/index.ts`
- Ensure environment variables are set

### 3. MongoDB Connection
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure cluster is active

### 4. Socket.IO Connection
- Verify socket authentication token
- Check CORS configuration for Socket.IO
- Ensure WebSocket port is accessible

## Security Best Practices

1. **Never expose secrets** - Use environment variables
2. **httpOnly cookies** - Prevent XSS attacks on refresh tokens
3. **Short-lived access tokens** - 15 minutes expiry
4. **CORS restrictions** - Only allow trusted origins
5. **Helmet middleware** - Security headers
6. **Rate limiting** - Prevent abuse
7. **Input validation** - Validate all user inputs
8. **HTTPS in production** - Encrypt all traffic
