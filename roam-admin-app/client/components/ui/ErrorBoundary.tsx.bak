/**
 * Comprehensive Error Boundary Component
 * Handles errors gracefully and provides user-friendly error messages
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { ROAMCard, ROAMCardContent, ROAMCardHeader, ROAMCardTitle } from './roam-card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: props.showDetails || false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with proper context
    logger.error('ErrorBoundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when props change (if enabled)
    if (this.props.resetOnPropsChange && prevProps !== this.props) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <ROAMCard className="w-full max-w-2xl">
            <ROAMCardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <ROAMCardTitle className="text-2xl font-bold text-gray-900">
                Something went wrong
              </ROAMCardTitle>
              <p className="text-gray-600 mt-2">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>
            </ROAMCardHeader>
            
            <ROAMCardContent className="space-y-6">
              {/* Error Details (if enabled) */}
              {this.state.showDetails && this.state.error && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Error Details</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>Message:</strong> {this.state.error.message}</p>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleGoBack}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {/* Toggle Details Button */}
              <div className="text-center">
                <Button
                  onClick={this.toggleDetails}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Error Details
                </Button>
              </div>

              {/* Support Information */}
              <div className="text-center text-sm text-gray-500 border-t pt-4">
                <p>
                  If this error persists, please contact support with the error details above.
                </p>
                <p className="mt-1">
                  Error ID: {this.state.error?.name || 'Unknown'} - {new Date().toISOString()}
                </p>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    logger.error(`Error in ${context || 'component'}`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  };

  return { handleError };
};
