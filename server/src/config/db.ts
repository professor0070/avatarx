import mongoose from 'mongoose';

export async function connectDB(uri?: string) {
  if (!uri) {
    console.warn('[avatarx-server] ⚠ MONGODB_URI not set; skipping database connection.');
    console.log('[avatarx-server] ℹ Server will run without database (API wiring mode)');
    return;
  }

  // Mask credentials for safe logging
  const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
  console.log(`[avatarx-server] ℹ Attempting to connect to: ${maskedUri}`);

  try {
    mongoose.set('strictQuery', true);
    
    // Set connection options for better reliability
    const options = {
      family: 4, // Force IPv4 to avoid IPv6 DNS resolution issues
      authSource: 'admin',
      serverSelectionTimeoutMS: 5000,
      dbName: 'avatarx_db', // ← EXPLICIT: always route to this DB regardless of URI path
    };
    
    await mongoose.connect(uri, options);
    
    // Verify connection
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`[avatarx-server] ✓ MongoDB connected (state: ${states[state]})`);
    console.log(`[avatarx-server] ✓ Database: ${mongoose.connection.name || 'unknown'}`);
    console.log(`[avatarx-server] ✓ Host: ${mongoose.connection.host || 'unknown'}`);
    
  } catch (err) {
    console.error('[avatarx-server] ✗ MongoDB connection error:', err instanceof Error ? err.message : err);
    console.log('[avatarx-server] ℹ Server will continue without database connection');
    // Let the server continue in Phase 1 so we can validate API wiring.
  }
}

