import { MongoClient } from 'mongodb';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8']);

const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

async function testNative() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return console.error('No URI');

  console.log('Testing with Native MongoDB Driver...');
  const client = new MongoClient(uri, {
    family: 4,
    serverSelectionTimeoutMS: 10000
  });

  try {
    await client.connect();
    console.log('✅ NATIVE CONNECT SUCCESS!');
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('Collections in DB:', collections.map(c => c.name));
    await client.close();
  } catch (err) {
    console.error('❌ NATIVE CONNECT FAIL:');
    console.error(err);
  }
}

testNative();
