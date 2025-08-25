import { logger } from './logger';
import React from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
}

export class AppError extends Error {
  public code: string;
  public context?: Record<string, any>;
  public isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    context?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.isOperational = isOperational;
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: ErrorInfo) => void> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: Error | AppError, context?: Record<string, any>): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      stack: error.stack,
      context: {
        ...(error instanceof AppError ? error.context : {}),
        ...context,
      },
      timestamp: new Date().toISOString(),
    };

    // Log the error
    logger.error('Application error occurred', errorInfo);

    // Notify listeners
    this.notifyListeners(errorInfo);

    // Handle operational vs programming errors
    if (error instanceof AppError && error.isOperational) {
      // Operational errors can be recovered from
      this.handleOperationalError(errorInfo);
    } else {
      // Programming errors should be reported
      this.handleProgrammingError(errorInfo);
    }
  }

  private handleOperationalError(errorInfo: ErrorInfo): void {
    // Handle recoverable errors (network issues, validation errors, etc.)
    logger.warn('Operational error handled', errorInfo);
  }

  private handleProgrammingError(errorInfo: ErrorInfo): void {
    // Handle programming errors (bugs, unexpected states, etc.)
    logger.error('Programming error detected', errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (import.meta.env.PROD) {
      // Send to error reporting service (e.g., Sentry)
      this.reportToErrorService(errorInfo);
    }
  }

  private reportToErrorService(errorInfo: ErrorInfo): void {
    // Implementation for error reporting service
    // Example: Sentry, LogRocket, etc.
    logger.error('Error reported to service:', errorInfo);
  }

  addErrorListener(listener: (error: ErrorInfo) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(errorInfo: ErrorInfo): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (listenerError) {
        logger.error('Error in error listener', listenerError);
      }
    });
  }
}

// Utility functions for common error scenarios
export const createNetworkError = (message: string, context?: Record<string, any>): AppError => {
  return new AppError(message, 'NETWORK_ERROR', context, true);
};

export const createValidationError = (message: string, field?: string): AppError => {
  return new AppError(message, 'VALIDATION_ERROR', { field }, true);
};

export const createAuthError = (message: string, context?: Record<string, any>): AppError => {
  return new AppError(message, 'AUTH_ERROR', context, true);
};

export const createDatabaseError = (message: string, context?: Record<string, any>): AppError => {
  return new AppError(message, 'DATABASE_ERROR', context, false);
};

// Global error handler
export const globalErrorHandler = ErrorHandler.getInstance();

// React error boundary helper
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error }>
) => {
  return class ErrorBoundaryWrapper extends React.Component<P, { hasError: boolean; error?: Error }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      globalErrorHandler.handleError(error, {
        componentStack: errorInfo.componentStack,
        componentName: Component.name,
      });
    }

    render() {
      if (this.state.hasError) {
        if (fallback) {
          return React.createElement(fallback, { error: this.state.error });
        }
        return React.createElement('div', { 
          className: 'error-boundary-fallback' 
        }, [
          React.createElement('h2', { key: 'title' }, 'Something went wrong'),
          React.createElement('p', { key: 'message' }, 'Please try refreshing the page')
        ]);
      }

      return React.createElement(Component, this.props);
    }
  };
};
