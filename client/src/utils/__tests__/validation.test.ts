import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  isValidDisplayName,
  isValidPrice,
  isNotEmpty,
} from '../../lib/sanitize';

describe('Validation Utils', () => {
  describe('Email Validation', () => {
    it('validates correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('rejects incorrect email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('accepts strong passwords', () => {
      expect(isValidPassword('StrongPass123')).toBe(true);
    });

    it('rejects weak passwords', () => {
      expect(isValidPassword('weak')).toBe(false);
      expect(isValidPassword('password')).toBe(false);
      expect(isValidPassword('PASSWORD')).toBe(false);
      expect(isValidPassword('12345678')).toBe(false);
    });
  });

  describe('Display Name Validation', () => {
    it('accepts valid names', () => {
      expect(isValidDisplayName('JohnDoe')).toBe(true);
      expect(isValidDisplayName('User_123')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidDisplayName('A')).toBe(false);
      expect(isValidDisplayName('')).toBe(false);
      expect(isValidDisplayName('Name@Symbol')).toBe(false);
    });
  });

  describe('Price Validation', () => {
    it('accepts valid prices', () => {
      expect(isValidPrice('100')).toBe(true);
      expect(isValidPrice('99.99')).toBe(true);
    });

    it('rejects invalid prices', () => {
      expect(isValidPrice('0')).toBe(false);
      expect(isValidPrice('-10')).toBe(false);
      expect(isValidPrice('abc')).toBe(false);
    });
  });

  describe('Empty Field Validation', () => {
    it('detects non-empty values', () => {
      expect(isNotEmpty('value')).toBe(true);
      expect(isNotEmpty('  value  ')).toBe(true);
    });

    it('detects empty values', () => {
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
    });
  });
});
