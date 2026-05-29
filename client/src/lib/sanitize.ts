import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * This should be used for any user-generated content that will be rendered
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

/**
 * Sanitize text content (strip all HTML tags)
 * Use this for plain text fields where no HTML should be allowed
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL to prevent XSS
 * Use this for user-provided URLs
 */
export function sanitizeUrl(url: string): string {
  // Basic URL validation and sanitization
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate display name (no special characters, 2-50 characters)
 */
export function isValidDisplayName(name: string): boolean {
  const nameRegex = /^[a-zA-Z0-9\s\-_]{2,50}$/;
  return nameRegex.test(name);
}

/**
 * Validate price (positive number, max 2 decimal places)
 */
export function isValidPrice(price: string): boolean {
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  return priceRegex.test(price) && parseFloat(price) > 0;
}

/**
 * Validate that a string is not empty after trimming
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validate that a string meets minimum length requirement
 */
export function hasMinLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

/**
 * Validate that a string meets maximum length requirement
 */
export function hasMaxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}
