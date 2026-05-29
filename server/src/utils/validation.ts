import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateDisplayName(displayName: string): boolean {
  return displayName.length >= 2 && displayName.length <= 50;
}

export function validateMongoId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function validateRequestBody(
  body: unknown,
  requiredFields: string[]
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push({ field: 'body', message: 'Request body is required' });
    return { valid: false, errors };
  }
  
  for (const field of requiredFields) {
    if (!(field in body) || (body as Record<string, unknown>)[field] === undefined) {
      errors.push({ field, message: `${field} is required` });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function handleValidationErrors(
  validation: { valid: boolean; errors: ValidationError[] },
  res: Response
): boolean {
  if (!validation.valid) {
    res.status(400).json({ 
      ok: false, 
      error: { message: 'Validation failed', details: validation.errors } 
    });
    return true;
  }
  return false;
}

export function validateAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { email, password, displayName } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ 
      ok: false, 
      error: { message: 'Email and password are required' } 
    });
    return;
  }
  
  if (!validateEmail(email)) {
    res.status(400).json({ 
      ok: false, 
      error: { message: 'Invalid email format' } 
    });
    return;
  }
  
  if (displayName && !validateDisplayName(displayName)) {
    res.status(400).json({ 
      ok: false, 
      error: { message: 'Display name must be between 2 and 50 characters' } 
    });
    return;
  }
  
  next();
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
