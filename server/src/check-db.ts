import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Apply the fix
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const envPath = path.resolve(process.cwd(), '../.env');

dotenv.config({ path: envPath });

async function checkConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
  const userPart = uri.split('://')[1].split(':')[0];
  console.log(`Checking connection with user: ${userPart}`);
  console.log(`Checking connection to: ${maskedUri}`);

  try {
    const options = {
      family: 4,
      serverSelectionTimeoutMS: 10000,
    };
    
    await mongoose.connect(uri, options);
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Database Name:', mongoose.connection.name);
    console.log('Connection Host:', mongoose.connection.host);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:');
    console.error(err);
    process.exit(1);
  }
}

checkConnection();
