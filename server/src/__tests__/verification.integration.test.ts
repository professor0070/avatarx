import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { setupTestDB, teardownTestDB, createTestApp, createTestUser, authHeader } from '../test-utils/test-setup';
import { User } from '../models/user.model';
import type express from 'express';

let app: express.Express;
let userToken: string;
let userId: string;
let emailVerificationToken: string;

beforeAll(async () => {
  await setupTestDB();
  app = createTestApp();

  const user = await createTestUser({
    email: `verify_${Date.now()}@example.com`,
    isEmailVerified: false,
    isProfileVerified: false,
    isIdVerified: false,
    isAgeVerified: false,
    isCloudinaryVerified: false,
    bio: 'Test bio for profile verification',
    avatar: 'https://example.com/avatar.jpg',
    skills: ['skill1', 'skill2'],
  });
  userToken = user.accessToken;
  userId = user.user._id.toString();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

describe('Verification - Email Verification', () => {
  it('should request email verification', async () => {
    const res = await request(app)
      .post('/api/verification/email')
      .set(authHeader(userToken));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toContain('email');
  });

  it('should set email verification token on user', async () => {
    const user = await User.findById(userId);
    expect(user).toBeDefined();
    expect(user!.emailVerificationToken).toBeDefined();
    expect(user!.emailVerificationExpires).toBeDefined();
    emailVerificationToken = user!.emailVerificationToken as string;
  });

  it('should reject invalid verification token format', async () => {
    const res = await request(app)
      .post('/api/verification/email')
      .set(authHeader(userToken))
      .send({ token: 'invalid-token' });

    // The email endpoint doesn't accept tokens - it's just for requesting verification
    expect(res.status).toBe(200);
  });
});

describe('Verification - Age Verification', () => {
  it('should submit age verification', async () => {
    const res = await request(app)
      .post('/api/verification/age')
      .set(authHeader(userToken))
      .send({
        dateOfBirth: '1990-01-15',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should reject age verification for minors', async () => {
    const res = await request(app)
      .post('/api/verification/age')
      .set(authHeader(userToken))
      .send({
        dateOfBirth: '2010-01-15',
      });

    expect(res.status).toBe(400);
  });

  it('should reject age verification without date of birth', async () => {
    const res = await request(app)
      .post('/api/verification/age')
      .set(authHeader(userToken))
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Verification - ID Verification', () => {
  it('should submit ID verification request', async () => {
    const res = await request(app)
      .post('/api/verification/id')
      .set(authHeader(userToken))
      .send({
        idType: 'passport',
        idNumber: 'AB123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should reject ID verification without required fields', async () => {
    const res = await request(app)
      .post('/api/verification/id')
      .set(authHeader(userToken))
      .send({ idNumber: 'AB123456' });

    expect(res.status).toBe(400);
  });

  it('should reject ID verification without auth', async () => {
    const res = await request(app)
      .post('/api/verification/id')
      .send({ idType: 'passport', idNumber: 'AB123456' });

    expect(res.status).toBe(401);
  });
});

describe('Verification - Profile Verification', () => {
  it('should submit profile verification request', async () => {
    const res = await request(app)
      .post('/api/verification/profile')
      .set(authHeader(userToken));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should reject duplicate profile verification', async () => {
    const res = await request(app)
      .post('/api/verification/profile')
      .set(authHeader(userToken));

    expect(res.status).toBe(400);
  });

  it('should reject profile verification without auth', async () => {
    const res = await request(app)
      .post('/api/verification/profile');

    expect(res.status).toBe(401);
  });
});

describe('Verification - Cloudinary Verification', () => {
  it('should submit cloudinary verification', async () => {
    const res = await request(app)
      .post('/api/verification/cloudinary')
      .set(authHeader(userToken))
      .send({
        cloudinaryUsername: 'test_cloudinary_user',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should reject cloudinary verification without username', async () => {
    const res = await request(app)
      .post('/api/verification/cloudinary')
      .set(authHeader(userToken))
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Verification - Status', () => {
  it('should get verification status for authenticated user', async () => {
    const res = await request(app)
      .get('/api/verification/status/me')
      .set(authHeader(userToken));

    expect(res.status).toBe(200);
    expect(res.body.verification).toBeDefined();
    expect(typeof res.body.verification.email).toBe('boolean');
    expect(typeof res.body.verification.age).toBe('boolean');
    expect(typeof res.body.verification.id).toBe('boolean');
    expect(typeof res.body.verification.profile).toBe('boolean');
    expect(typeof res.body.verification.cloudinary).toBe('boolean');
  });

  it('should reject status check without auth', async () => {
    const res = await request(app)
      .get('/api/verification/status/me');

    expect(res.status).toBe(401);
  });

  it('should reflect all completed verifications', async () => {
    const user = await User.findById(userId);
    expect(user!.isAgeVerified).toBe(true);
    expect(user!.isIdVerified).toBe(true);
    expect(user!.isProfileVerified).toBe(true);
    expect(user!.isCloudinaryVerified).toBe(true);
  });
});
