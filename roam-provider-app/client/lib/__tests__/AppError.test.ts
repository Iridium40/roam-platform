import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, NetworkError, AuthError, PermissionError, NotFoundError, ServerError } from '../errors/AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError(
        'Test error',
        'TEST_ERROR',
        'User friendly message',
        400,
        true,
        { additional: 'context' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.userMessage).toBe('User friendly message');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual({ additional: 'context' });
      expect(error.name).toBe('AppError');
    });

    it('should use default values for optional parameters', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 'User message');

      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(false);
      expect(error.context).toBeUndefined();
    });
  });

  describe('fromApiError', () => {
    it('should handle network errors', () => {
      const apiError = { code: 'NETWORK_ERROR' };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(0);
    });

    it('should handle authentication errors', () => {
      const apiError = { code: 'AUTH_REQUIRED' };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('AUTH_REQUIRED');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(401);
    });

    it('should handle permission errors', () => {
      const apiError = { code: 'INSUFFICIENT_PERMISSIONS' };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(403);
    });

    it('should handle validation errors', () => {
      const apiError = { 
        code: 'VALIDATION_ERROR',
        userMessage: 'Custom validation message'
      };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.userMessage).toBe('Custom validation message');
      expect(error.statusCode).toBe(400);
    });

    it('should handle resource not found errors', () => {
      const apiError = { code: 'RESOURCE_NOT_FOUND' };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should handle rate limit errors', () => {
      const apiError = { code: 'RATE_LIMIT_EXCEEDED' };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(429);
    });

    it('should handle unknown errors', () => {
      const apiError = { 
        message: 'Unknown error occurred',
        code: 'UNKNOWN_CODE',
        statusCode: 418
      };
      const error = AppError.fromApiError(apiError);

      expect(error.code).toBe('UNKNOWN_CODE');
      expect(error.statusCode).toBe(418);
      expect(error.retryable).toBe(false);
    });
  });

  describe('static factory methods', () => {
    it('should create validation errors', () => {
      const error = AppError.validationError('Invalid input', { field: 'email' });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ field: 'email' });
    });

    it('should create network errors', () => {
      const error = AppError.networkError();

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(0);
    });

    it('should create auth errors', () => {
      const error = AppError.authError('Custom auth message');

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Custom auth message');
    });

    it('should create permission errors', () => {
      const error = AppError.permissionError();

      expect(error.code).toBe('PERMISSION_ERROR');
      expect(error.statusCode).toBe(403);
    });

    it('should create not found errors', () => {
      const error = AppError.notFoundError('User');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create server errors', () => {
      const error = AppError.serverError('Database connection failed');

      expect(error.code).toBe('SERVER_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Database connection failed');
    });
  });
});

describe('ValidationError', () => {
  it('should extend AppError with field errors', () => {
    const fieldErrors = { email: 'Invalid email format' };
    const error = new ValidationError('Validation failed', fieldErrors);

    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors).toEqual(fieldErrors);
    expect(error.context).toEqual({ fieldErrors });
  });
});

describe('NetworkError', () => {
  it('should extend AppError with network-specific defaults', () => {
    const error = new NetworkError('Connection timeout');

    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.retryable).toBe(true);
    expect(error.statusCode).toBe(0);
  });
});

describe('AuthError', () => {
  it('should extend AppError with auth-specific defaults', () => {
    const error = new AuthError('Token expired');

    expect(error.name).toBe('AuthError');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.retryable).toBe(false);
  });
});

describe('PermissionError', () => {
  it('should extend AppError with permission-specific defaults', () => {
    const error = new PermissionError('Admin access required');

    expect(error.name).toBe('PermissionError');
    expect(error.code).toBe('PERMISSION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.retryable).toBe(false);
  });
});

describe('NotFoundError', () => {
  it('should extend AppError with not found defaults', () => {
    const error = new NotFoundError('Booking');

    expect(error.name).toBe('NotFoundError');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Booking not found');
  });
});

describe('ServerError', () => {
  it('should extend AppError with server-specific defaults', () => {
    const error = new ServerError('Internal server error');

    expect(error.name).toBe('ServerError');
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
  });
});
