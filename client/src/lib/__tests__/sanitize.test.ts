import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  isValidEmail,
  isValidPassword,
  isValidDisplayName,
  isValidPrice,
  isNotEmpty,
  hasMinLength,
  hasMaxLength,
} from '../sanitize';

describe('sanitizeHtml', () => {
  it('should sanitize XSS attack vectors', () => {
    const malicious = '<script>alert("xss")</script>';
    expect(sanitizeHtml(malicious)).not.toContain('<script');
  });

  it('should allow safe HTML tags', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(safe)).toContain('<p>');
    expect(sanitizeHtml(safe)).toContain('<strong>');
  });

  it('should remove event handlers', () => {
    const withHandler = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(withHandler)).not.toContain('onerror');
  });
});

describe('sanitizeText', () => {
  it('should strip all HTML tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeText(html)).toBe('Hello world');
  });

  it('should handle empty strings', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('sanitizeUrl', () => {
  it('should allow valid HTTP URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('should allow valid HTTPS URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('should reject javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('should reject data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('should return empty string for invalid URLs', () => {
    expect(sanitizeUrl('not-a-url')).toBe('');
  });
});

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('should accept valid passwords', () => {
    expect(isValidPassword('Password123')).toBe(true);
    expect(isValidPassword('MyP@ssw0rd')).toBe(true);
  });

  it('should reject passwords without uppercase', () => {
    expect(isValidPassword('password123')).toBe(false);
  });

  it('should reject passwords without lowercase', () => {
    expect(isValidPassword('PASSWORD123')).toBe(false);
  });

  it('should reject passwords without numbers', () => {
    expect(isValidPassword('PasswordABC')).toBe(false);
  });

  it('should reject short passwords', () => {
    expect(isValidPassword('Pass1')).toBe(false);
  });
});

describe('isValidDisplayName', () => {
  it('should accept valid names', () => {
    expect(isValidDisplayName('John Doe')).toBe(true);
    expect(isValidDisplayName('User_123')).toBe(true);
  });

  it('should reject names with special characters', () => {
    expect(isValidDisplayName('John@Doe')).toBe(false);
    expect(isValidDisplayName('User<script>')).toBe(false);
  });

  it('should reject too short names', () => {
    expect(isValidDisplayName('A')).toBe(false);
  });

  it('should reject too long names', () => {
    expect(isValidDisplayName('A'.repeat(51))).toBe(false);
  });
});

describe('isValidPrice', () => {
  it('should accept valid prices', () => {
    expect(isValidPrice('100')).toBe(true);
    expect(isValidPrice('99.99')).toBe(true);
    expect(isValidPrice('0.50')).toBe(true);
  });

  it('should reject invalid prices', () => {
    expect(isValidPrice('0')).toBe(false);
    expect(isValidPrice('-10')).toBe(false);
    expect(isValidPrice('abc')).toBe(false);
    expect(isValidPrice('10.999')).toBe(false);
  });
});

describe('isNotEmpty', () => {
  it('should return true for non-empty strings', () => {
    expect(isNotEmpty('hello')).toBe(true);
    expect(isNotEmpty('  hello  ')).toBe(true);
  });

  it('should return false for empty strings', () => {
    expect(isNotEmpty('')).toBe(false);
    expect(isNotEmpty('   ')).toBe(false);
  });
});

describe('hasMinLength', () => {
  it('should validate minimum length correctly', () => {
    expect(hasMinLength('hello', 3)).toBe(true);
    expect(hasMinLength('hi', 5)).toBe(false);
  });
});

describe('hasMaxLength', () => {
  it('should validate maximum length correctly', () => {
    expect(hasMaxLength('hello', 10)).toBe(true);
    expect(hasMaxLength('hello world', 5)).toBe(false);
  });
});
