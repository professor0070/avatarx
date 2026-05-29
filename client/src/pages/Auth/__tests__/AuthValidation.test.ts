import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  isValidDisplayName,
  isNotEmpty,
  hasMinLength,
  hasMaxLength,
} from '../../../lib/sanitize';

describe('Auth Form Validation', () => {
  describe('Email Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'name+tag@example.org',
        '123@numeric.com',
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@domain',
        'username@domain..com',
        '',
        '   ',
      ];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Password123',
        'MyStr0ngPwd',
        'Complex1ty!',
        'A1b2C3d4E5',
      ];

      strongPasswords.forEach((password) => {
        expect(isValidPassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'short1', reason: 'too short' },
        { password: 'lowercase123', reason: 'no uppercase' },
        { password: 'UPPERCASE123', reason: 'no lowercase' },
        { password: 'NoNumbersHere', reason: 'no numbers' },
        { password: '12345678', reason: 'no letters' },
        { password: '', reason: 'empty' },
      ];

      weakPasswords.forEach(({ password }) => {
        expect(isValidPassword(password)).toBe(false);
      });
    });

    it('should require minimum 8 characters', () => {
      expect(isValidPassword('Pas1')).toBe(false);
      expect(isValidPassword('Passwor1')).toBe(true);
    });
  });

  describe('Display Name Validation', () => {
    it('should accept valid display names', () => {
      const validNames = [
        'John Doe',
        'User_123',
        'Test-Name',
        'Valid Name',
        'A'.repeat(50),
      ];

      validNames.forEach((name) => {
        expect(isValidDisplayName(name)).toBe(true);
      });
    });

    it('should reject invalid display names', () => {
      const invalidNames = [
        { name: 'A', reason: 'too short' },
        { name: 'A'.repeat(51), reason: 'too long' },
        { name: 'Name@Symbol', reason: 'special characters' },
        { name: 'Name<script>', reason: 'HTML tags' },
        { name: '', reason: 'empty' },
        { name: '   ', reason: 'whitespace only' },
      ];

      invalidNames.forEach(({ name }) => {
        expect(isValidDisplayName(name)).toBe(false);
      });
    });
  });

  describe('Required Field Validation', () => {
    it('should validate non-empty fields', () => {
      expect(isNotEmpty('value')).toBe(true);
      expect(isNotEmpty('  value  ')).toBe(true);
      expect(isNotEmpty('a')).toBe(true);
    });

    it('should reject empty fields', () => {
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
      expect(isNotEmpty('\t\n')).toBe(false);
    });
  });

  describe('Length Validation', () => {
    it('should validate minimum length', () => {
      expect(hasMinLength('hello', 3)).toBe(true);
      expect(hasMinLength('hi', 5)).toBe(false);
      expect(hasMinLength('exact', 5)).toBe(true);
    });

    it('should validate maximum length', () => {
      expect(hasMaxLength('short', 10)).toBe(true);
      expect(hasMaxLength('this is too long', 10)).toBe(false);
      expect(hasMaxLength('exact', 5)).toBe(true);
    });

    it('should trim whitespace before checking length', () => {
      expect(hasMinLength('  hi  ', 2)).toBe(true);
      expect(hasMaxLength('  hello  ', 5)).toBe(true);
    });
  });

  describe('Complete Auth Form Scenarios', () => {
    it('should validate complete signup form data', () => {
      const signupData = {
        displayName: 'TestUser',
        email: 'test@example.com',
        password: 'StrongPass123',
      };

      expect(isValidDisplayName(signupData.displayName)).toBe(true);
      expect(isValidEmail(signupData.email)).toBe(true);
      expect(isValidPassword(signupData.password)).toBe(true);
    });

    it('should reject incomplete signup form data', () => {
      const invalidSignupData = {
        displayName: '',
        email: 'invalid-email',
        password: 'weak',
      };

      expect(isNotEmpty(invalidSignupData.displayName)).toBe(false);
      expect(isValidEmail(invalidSignupData.email)).toBe(false);
      expect(isValidPassword(invalidSignupData.password)).toBe(false);
    });

    it('should validate login form data', () => {
      const loginData = {
        email: 'user@example.com',
        password: 'MyPassword123',
      };

      expect(isValidEmail(loginData.email)).toBe(true);
      expect(isNotEmpty(loginData.password)).toBe(true);
    });
  });
});
