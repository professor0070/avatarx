import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars!!';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.SERVICE_FEE_PERCENT = '5.5';
  process.env.PLATFORM_FEE_PERCENT = '2.5';
  process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key';
  process.env.RAZORPAY_KEY_SECRET = 'mock_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
});
