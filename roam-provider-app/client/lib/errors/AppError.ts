export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromApiError(apiError: any): AppError {
    if (apiError.code === 'NETWORK_ERROR') {
      return new AppError(
        'Network connection failed',
        'NETWORK_ERROR',
        'Unable to connect to server. Please check your internet connection and try again.',
        0,
        true
      );
    }

    if (apiError.code === 'AUTH_REQUIRED') {
      return new AppError(
        'Authentication required',
        'AUTH_REQUIRED',
        'Please sign in to continue.',
        401,
        false
      );
    }

    if (apiError.code === 'INSUFFICIENT_PERMISSIONS') {
      return new AppError(
        'Insufficient permissions',
        'INSUFFICIENT_PERMISSIONS',
        'You don\'t have permission to perform this action.',
        403,
        false
      );
    }

    if (apiError.code === 'VALIDATION_ERROR') {
      return new AppError(
        'Validation failed',
        'VALIDATION_ERROR',
        apiError.userMessage || 'Please check your input and try again.',
        400,
        false,
        apiError.details
      );
    }

    if (apiError.code === 'RESOURCE_NOT_FOUND') {
      return new AppError(
        'Resource not found',
        'RESOURCE_NOT_FOUND',
        'The requested resource was not found.',
        404,
        false
      );
    }

    if (apiError.code === 'RATE_LIMIT_EXCEEDED') {
      return new AppError(
        'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please wait a moment and try again.',
        429,
        true
      );
    }

    // Default error
    return new AppError(
      apiError.message || 'An unexpected error occurred',
      apiError.code || 'UNKNOWN_ERROR',
      apiError.userMessage || 'Something went wrong. Please try again.',
      apiError.statusCode || 500,
      false
    );
  }

  static validationError(message: string, details?: Record<string, any>): AppError {
    return new AppError(
      'Validation failed',
      'VALIDATION_ERROR',
      message,
      400,
      false,
      details
    );
  }

  static networkError(): AppError {
    return new AppError(
      'Network error',
      'NETWORK_ERROR',
      'Unable to connect to server. Please check your internet connection and try again.',
      0,
      true
    );
  }

  static authError(message: string = 'Authentication failed'): AppError {
    return new AppError(
      message,
      'AUTH_ERROR',
      'Please sign in again to continue.',
      401,
      false
    );
  }

  static permissionError(): AppError {
    return new AppError(
      'Insufficient permissions',
      'PERMISSION_ERROR',
      'You don\'t have permission to perform this action.',
      403,
      false
    );
  }

  static notFoundError(resource: string = 'Resource'): AppError {
    return new AppError(
      `${resource} not found`,
      'NOT_FOUND',
      `${resource} was not found.`,
      404,
      false
    );
  }

  static serverError(message: string = 'Server error'): AppError {
    return new AppError(
      message,
      'SERVER_ERROR',
      'Something went wrong on our end. Please try again later.',
      500,
      true
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(
      'Validation failed',
      'VALIDATION_ERROR',
      message,
      400,
      false,
      { fieldErrors }
    );
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connection failed') {
    super(
      message,
      'NETWORK_ERROR',
      'Unable to connect to server. Please check your internet connection and try again.',
      0,
      true
    );
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(
      message,
      'AUTH_ERROR',
      'Please sign in again to continue.',
      401,
      false
    );
    this.name = 'AuthError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(
      message,
      'PERMISSION_ERROR',
      'You don\'t have permission to perform this action.',
      403,
      false
    );
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(
      `${resource} not found`,
      'NOT_FOUND',
      `${resource} was not found.`,
      404,
      false
    );
    this.name = 'NotFoundError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Server error') {
    super(
      message,
      'SERVER_ERROR',
      'Something went wrong on our end. Please try again later.',
      500,
      true
    );
    this.name = 'ServerError';
  }
}
