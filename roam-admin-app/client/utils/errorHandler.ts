/**
 * Comprehensive Error Handler Utility
 * Centralizes error handling and logging throughout the application
 */

import { logger } from './logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  details?: any;
  context?: ErrorContext;
}

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  API = 'api',
  UI = 'ui',
  UNKNOWN = 'unknown',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Main error handler function
export const handleError = (
  error: Error | string | any,
  context?: ErrorContext,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): ErrorInfo => {
  const errorInfo: ErrorInfo = {
    message: typeof error === 'string' ? error : error.message || 'Unknown error',
    stack: error.stack,
    code: error.code,
    details: error,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
      severity,
    },
  };

  // Determine error type
  const errorType = determineErrorType(error, context);
  errorInfo.context = { ...errorInfo.context, type: errorType };

  // Log based on severity
  switch (severity) {
    case ErrorSeverity.LOW:
      logger.debug('Low severity error', errorInfo);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn('Medium severity error', errorInfo);
      break;
    case ErrorSeverity.HIGH:
      logger.error('High severity error', errorInfo);
      break;
    case ErrorSeverity.CRITICAL:
      logger.error('Critical error', errorInfo);
      // Could trigger alerts, notifications, etc.
      break;
  }

  return errorInfo;
};

// Determine error type based on error and context
const determineErrorType = (error: any, context?: ErrorContext): ErrorType => {
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
      case 'PGRST301':
      case 'PGRST302':
        return ErrorType.DATABASE;
      case 'AUTH_INVALID_TOKEN':
      case 'AUTH_TOKEN_EXPIRED':
        return ErrorType.AUTHENTICATION;
      case 'AUTH_INSUFFICIENT_PERMISSIONS':
        return ErrorType.AUTHORIZATION;
      case 'NETWORK_ERROR':
      case 'FETCH_ERROR':
        return ErrorType.NETWORK;
    }
  }

  if (error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('auth') || message.includes('token')) {
      return ErrorType.AUTHENTICATION;
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorType.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('database') || message.includes('sql')) {
      return ErrorType.DATABASE;
    }
  }

  if (context?.component) {
    if (context.component.includes('Auth') || context.component.includes('Login')) {
      return ErrorType.AUTHENTICATION;
    }
    if (context.component.includes('API') || context.component.includes('Service')) {
      return ErrorType.API;
    }
  }

  return ErrorType.UNKNOWN;
};

// Supabase error handler
export const handleSupabaseError = (error: any, context?: ErrorContext): ErrorInfo => {
  const severity = error.code === 'PGRST116' ? ErrorSeverity.LOW : ErrorSeverity.MEDIUM;
  return handleError(error, { ...context, source: 'supabase' }, severity);
};

// React error handler
export const handleReactError = (error: Error, errorInfo: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, {
    ...context,
    source: 'react',
    componentStack: errorInfo.componentStack,
  }, ErrorSeverity.HIGH);
};

// API error handler
export const handleApiError = (error: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, { ...context, source: 'api' }, ErrorSeverity.MEDIUM);
};

// Network error handler
export const handleNetworkError = (error: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, { ...context, source: 'network' }, ErrorSeverity.HIGH);
};

// Validation error handler
export const handleValidationError = (error: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, { ...context, source: 'validation' }, ErrorSeverity.LOW);
};

// Authentication error handler
export const handleAuthError = (error: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, { ...context, source: 'authentication' }, ErrorSeverity.HIGH);
};

// Database error handler
export const handleDatabaseError = (error: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, { ...context, source: 'database' }, ErrorSeverity.MEDIUM);
};

// UI error handler
export const handleUIError = (error: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, { ...context, source: 'ui' }, ErrorSeverity.LOW);
};

// Async error wrapper
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext,
  errorHandler: (error: any, context?: ErrorContext) => ErrorInfo = handleError
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler(error, context);
      throw error;
    }
  };
};

// Error boundary error handler
export const handleErrorBoundaryError = (error: Error, errorInfo: any, context?: ErrorContext): ErrorInfo => {
  return handleError(error, {
    ...context,
    source: 'error-boundary',
    componentStack: errorInfo.componentStack,
  }, ErrorSeverity.HIGH);
};

// User-friendly error messages
export const getUserFriendlyMessage = (error: ErrorInfo): string => {
  switch (error.context?.type) {
    case ErrorType.NETWORK:
      return 'Connection error. Please check your internet connection and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Authentication error. Please log in again.';
    case ErrorType.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.';
    case ErrorType.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorType.DATABASE:
      return 'Database error. Please try again later.';
    case ErrorType.API:
      return 'Service temporarily unavailable. Please try again later.';
    case ErrorType.UI:
      return 'Something went wrong. Please refresh the page and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

// Error reporting (for production)
export const reportError = (error: ErrorInfo): void => {
  // In production, this could send errors to a service like Sentry
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error);
    logger.error('Error reported to monitoring service', error);
  }
};

// Error recovery suggestions
export const getRecoverySuggestions = (error: ErrorInfo): string[] => {
  const suggestions: string[] = [];

  switch (error.context?.type) {
    case ErrorType.NETWORK:
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Check if the service is available');
      break;
    case ErrorType.AUTHENTICATION:
      suggestions.push('Log out and log back in');
      suggestions.push('Clear your browser cache');
      suggestions.push('Check if your session has expired');
      break;
    case ErrorType.AUTHORIZATION:
      suggestions.push('Contact your administrator for access');
      suggestions.push('Check your user permissions');
      break;
    case ErrorType.VALIDATION:
      suggestions.push('Review your input data');
      suggestions.push('Check required fields');
      suggestions.push('Verify data format');
      break;
    case ErrorType.DATABASE:
      suggestions.push('Try again in a few minutes');
      suggestions.push('Contact support if the problem persists');
      break;
    default:
      suggestions.push('Refresh the page');
      suggestions.push('Try again later');
      suggestions.push('Contact support if the problem persists');
  }

  return suggestions;
};


