import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch {}

import http from 'http';
import mongoose from 'mongoose';

const BASE = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://avatarxnoreply_db_user:JcaR7bircXShWFJW@cluster0.nwugutr.mongodb.net/avatarx_db?appName=Cluster0&authSource=admin';

function req(method: string, path: string, body?: any, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts: any = { method, hostname: url.hostname, port: url.port, path: url.pathname, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, (res) => { let d = ''; res.on('data', (c) => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch (e) { resolve({ status: res.statusCode, body: d }); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function getAdminToken(): Promise<string> {
  const login = await req('POST', '/auth/login', { email: 'superadmin@avatarx.com', password: 'AdminPass123!' });
  if (!login.body?.accessToken) throw new Error('No admin token');
  return login.body.accessToken;
}

async function main() {
  const token = await getAdminToken();
  console.log('1. Logged in as admin');

  // Create a seller user
  const unique = Date.now().toString(36);

  // Insert a gig document directly into MongoDB so we avoid API payload quirks
  await mongoose.connect(MONGO_URI);
  console.log('2. Connected to MongoDB');

  const admin = await mongoose.connection.db!.collection('users').findOne({ role: 'super_admin' });
  const seller = await mongoose.connection.db!.collection('users').findOne({ role: 'seller' });
  const user = await mongoose.connection.db!.collection('users').findOne({ role: 'user' });

  const gigId = new mongoose.Types.ObjectId();
  const sellerId = seller?._id || admin!._id;

  await mongoose.connection.db!.collection('gigs').insertOne({
    _id: gigId,
    title: 'Fix E2E Gig ' + unique,
    slug: 'fix-e2e-' + unique,
    description: 'Gig for testing the moderation status fix',
    type: 'service',
    category: 'Custom Services',
    isAdultContent: false,
    tags: ['test', 'fix'],
    sellerId: sellerId,
    sellerDisplayName: seller?.displayName || 'Admin',
    sellerAvatar: '',
    sellerLevel: 'new',
    sellerVerificationBadge: false,
    sellerRating: 0,
    sellerTotalOrders: 0,
    gallery: [],
    thumbnail: 'https://via.placeholder.com/400',
    tiers: [{ name: 'Basic', description: 'Basic', price: 25, currency: 'USD', deliveryTimeDays: 3, revisions: 2, features: ['A'] }],
    extras: [],
    upgrades: [],
    deliveryType: 'manual',
    requirements: { enabled: false, questions: [] },
    requestToOrder: false,
    isPaused: false,
    impressions: 0,
    clicks: 0,
    orders: 0,
    conversionRate: 0,
    totalReviews: 0,
    averageRating: 0,
    lastTwoMonthsRating: 0,
    faqs: [],
    status: 'draft',
    moderation: { status: 'pending', reviewedAt: null, reviewedBy: null },
    reported: false,
    reportCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('3. Created test gig via MongoDB');

  const gigIdStr = gigId.toString();

  // Step A: Set to active (admin approval)
  let ra = await req('PATCH', '/admin/gigs/' + gigIdStr + '/status', { status: 'active' }, token);
  console.log('4. Set to active ->', ra.body?.gig?.status, '| http:', ra.status);
  if (ra.body?.gig?.status !== 'active') { console.log('FAIL: expected active'); process.exit(1); }
  console.log('   PASS');

  // Step B: Reject it
  let rb = await req('PATCH', '/admin/gigs/' + gigIdStr + '/reject', { reason: 'E2E rejection test' }, token);
  console.log('5. Reject ->', rb.body?.gig?.status, '| http:', rb.status);
  if (rb.body?.gig?.status !== 'rejected') { console.log('FAIL: expected rejected'); process.exit(1); }
  console.log('   PASS');

  // Step C: Reactivate via status toggle (THE FIX)
  let rc = await req('PATCH', '/admin/gigs/' + gigIdStr + '/status', { status: 'active' }, token);
  console.log('6. Reactivate (THE FIX) -> status:', rc.body?.gig?.status, '| http:', rc.status);
  console.log('   Response gig keys:', Object.keys(rc.body?.gig || {}).join(', '));

  // Check DB state directly
  const dbGig = await mongoose.connection.db!.collection('gigs').findOne({ _id: gigId });
  console.log('   DB status:', dbGig?.status, '| moderation:', JSON.stringify(dbGig?.moderation));

  if (rc.body?.gig?.status !== 'active') { console.log('FAIL: expected active after reactivation'); process.exit(1); }
  console.log('   ✓ Fix verified: rejected gig displays active after reactivation');

  // Step D: Pause (existing flow should still work)
  let rd = await req('PATCH', '/admin/gigs/' + gigIdStr + '/status', { status: 'paused' }, token);
  console.log('7. Pause ->', rd.body?.gig?.status, '| http:', rd.status);
  if (rd.body?.gig?.status !== 'paused') { console.log('FAIL: expected paused'); process.exit(1); }
  console.log('   PASS');

  // Step E: Resume
  let re = await req('PATCH', '/admin/gigs/' + gigIdStr + '/status', { status: 'active' }, token);
  console.log('8. Resume ->', re.body?.gig?.status, '| http:', re.status);
  if (re.body?.gig?.status !== 'active') { console.log('FAIL: expected active'); process.exit(1); }
  console.log('   PASS');

  // Step F: Invalid status -> 400
  let rf = await req('PATCH', '/admin/gigs/' + gigIdStr + '/status', { status: 'invalid' }, token);
  console.log('9. Invalid status -> http:', rf.status, '(expect 400)');
  if (rf.status !== 400) { console.log('FAIL: expected 400'); process.exit(1); }
  console.log('   PASS');

  // Step G: Non-existent gig -> 404
  let rg = await req('PATCH', '/admin/gigs/000000000000000000000000/status', { status: 'active' }, token);
  console.log('10. Non-existent gig -> http:', rg.status, '(expect 404)');
  if (rg.status !== 404) { console.log('FAIL: expected 404'); process.exit(1); }
  console.log('   PASS');

  await mongoose.disconnect();
  console.log('\n✓ ALL E2E TESTS PASSED');
  process.exit(0);
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
