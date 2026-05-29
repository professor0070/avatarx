import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User } from '../models/user.model';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const email = 'ashokpandit408@yahoo.com';
  const user = await User.findOne({ email });
  console.log('User found:', JSON.stringify(user, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
