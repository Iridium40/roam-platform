import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (req.body && Object.keys(req.body).length > 0) {
        schema.parse(req.body);
      }
      
      // Validate query parameters if they exist
      if (req.query && Object.keys(req.query).length > 0) {
        // For query validation, we'll use a more permissive schema
        // that allows string values for all fields
        const querySchema = z.record(z.string().optional());
        querySchema.parse(req.query);
      }
      
      // Validate URL parameters if they exist
      if (req.params && Object.keys(req.params).length > 0) {
        // For params validation, we'll use a more permissive schema
        const paramsSchema = z.record(z.string());
        paramsSchema.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = {
          name: 'ValidationError',
          message: 'Request validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          userMessage: 'Please check your input and try again.'
        };
        
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationError.details,
          userMessage: validationError.userMessage
        });
      }
      
      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          userMessage: 'Please check your query parameters and try again.'
        });
      }
      next(error);
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid URL parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          userMessage: 'Invalid URL parameters provided.'
        });
      }
      next(error);
    }
  };
};

export const validateHeaders = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.headers);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request headers',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          userMessage: 'Invalid request headers provided.'
        });
      }
      next(error);
    }
  };
};

// Custom validation for file uploads
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/*', 'application/pdf'], maxFiles = 1 } = options;
      
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          code: 'VALIDATION_ERROR',
          userMessage: 'Please select a file to upload.'
        });
      }
      
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files);
      
      if (files.length > maxFiles) {
        return res.status(400).json({
          error: 'Too many files',
          code: 'VALIDATION_ERROR',
          userMessage: `Maximum ${maxFiles} file(s) allowed.`
        });
      }
      
      for (const file of files) {
        if (file.size > maxSize) {
          return res.status(400).json({
            error: 'File too large',
            code: 'VALIDATION_ERROR',
            userMessage: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB.`
          });
        }
        
        const isValidType = allowedTypes.some(type => {
          if (type.endsWith('/*')) {
            const baseType = type.replace('/*', '');
            return file.mimetype.startsWith(baseType);
          }
          return file.mimetype === type;
        });
        
        if (!isValidType) {
          return res.status(400).json({
            error: 'Invalid file type',
            code: 'VALIDATION_ERROR',
            userMessage: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}.`
          });
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Rate limiting validation
export const validateRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}) => {
  const { windowMs, maxRequests, keyGenerator = (req) => req.ip } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    const userRequests = requests.get(key);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    userRequests.count++;
    next();
  };
};

// Sanitization middleware
export const sanitizeInput = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  };
};

// Helper function to sanitize objects
const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Helper function to sanitize strings
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, ' '); // Normalize whitespace
};
