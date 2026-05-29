import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateMongoId,
  validateRequestBody,
  sanitizeInput,
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('validateDisplayName', () => {
    it('should accept valid display names', () => {
      expect(validateDisplayName('John')).toBe(true);
      expect(validateDisplayName('A')).toBe(false);
      expect(validateDisplayName('This is a very long display name that exceeds fifty characters')).toBe(false);
    });
  });

  describe('validateMongoId', () => {
    it('should accept valid MongoDB ObjectIds', () => {
      expect(validateMongoId('507f1f77bcf86cd799439011')).toBe(true);
      expect(validateMongoId('507f1f77bcf86cd7994390ab')).toBe(true);
    });

    it('should reject invalid MongoDB ObjectIds', () => {
      expect(validateMongoId('invalid')).toBe(false);
      expect(validateMongoId('507f1f77bcf86cd7994390')).toBe(false); // Too short
      expect(validateMongoId('507f1f77bcf86cd7994390111')).toBe(false); // Too long
    });
  });

  describe('validateRequestBody', () => {
    it('should validate request body with required fields', () => {
      const body = { email: 'test@example.com', password: 'password123' };
      const result = validateRequestBody(body, ['email', 'password']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject body missing required fields', () => {
      const body = { email: 'test@example.com' };
      const result = validateRequestBody(body, ['email', 'password']);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('password');
    });

    it('should reject null or undefined body', () => {
      const result = validateRequestBody(null, ['email']);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('body');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should handle normal input', () => {
      expect(sanitizeInput('normal text')).toBe('normal text');
    });
  });
});
