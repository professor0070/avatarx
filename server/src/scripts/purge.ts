import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
import { connectDB } from '../config/db';
import mongoose from 'mongoose';

async function purge() {
  try {
    await connectDB(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error("Database connection not established.");
    }

    console.log('Purging Users...');
    await db.collection('users').deleteMany({});
    
    console.log('Purging Gigs...');
    await db.collection('gigs').deleteMany({});
    
    console.log('Purging Orders...');
    await db.collection('orders').deleteMany({});
    
    console.log('Purging Reviews...');
    await db.collection('reviews').deleteMany({});
    
    console.log('Purging Notifications...');
    await db.collection('notifications').deleteMany({});
    
    console.log('Purging Messages...');
    await db.collection('messages').deleteMany({});
    
    console.log('Purging Conversations...');
    await db.collection('conversations').deleteMany({});

    console.log('Database purged successfully. Collections cleared, indexes preserved.');
    process.exit(0);
  } catch (error) {
    console.error('Error purging database:', error);
    process.exit(1);
  }
}
purge();
