import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      logger.error('Error Boundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // reportErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-foreground/70">
                We're sorry, but an unexpected error occurred. Please try refreshing the page.
              </p>
              
              <Button 
                onClick={this.handleRetry}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>

              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>

              {this.props.showDetails && import.meta.env.DEV && this.state.error && (
                <details className="text-left mt-4">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-32">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary wrapper for specific scenarios
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specialized error boundaries for different scenarios
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <Card className="w-full max-w-lg mx-4">
          <CardHeader className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Page Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-foreground/70">
              This page encountered an error and couldn't be loaded properly.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    }
    showDetails={true}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName?: string;
}> = ({ children, componentName = 'Component' }) => (
  <ErrorBoundary
    fallback={
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">{componentName} Error</span>
        </div>
        <p className="text-red-600 text-sm mt-1">
          This component failed to load. Please refresh the page.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Specialized error boundary for booking flow
export const BookingErrorBoundary: React.FC<{ 
  children: ReactNode;
  onRetry?: () => void;
}> = ({ children, onRetry }) => (
  <ErrorBoundary
    fallback={
      <Card className="w-full max-w-lg mx-auto my-8">
        <CardHeader className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-xl">Booking Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-foreground/70">
            There was an issue with the booking process. Your payment has not been processed.
          </p>
          <div className="flex gap-3 justify-center">
            {onRetry && (
              <Button 
                onClick={onRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            <Button 
              onClick={() => window.location.href = '/services'}
            >
              Browse Services
            </Button>
          </div>
        </CardContent>
      </Card>
    }
    showDetails={true}
  >
    {children}
  </ErrorBoundary>
);

// Specialized error boundary for payment forms
export const PaymentErrorBoundary: React.FC<{ 
  children: ReactNode;
  onCancel?: () => void;
}> = ({ children, onCancel }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center gap-2 text-red-700 mb-3">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-semibold">Payment Error</span>
        </div>
        <p className="text-red-600 text-sm mb-4">
          The payment form encountered an error. Your card has not been charged.
          Please refresh and try again.
        </p>
        <div className="flex gap-3">
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {onCancel && (
            <Button 
              onClick={onCancel}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Specialized error boundary for chat/messaging
export const ChatErrorBoundary: React.FC<{ 
  children: ReactNode;
}> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-foreground/70 mb-4">
          Unable to load messages. Please check your connection and try again.
        </p>
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload Chat
        </Button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
