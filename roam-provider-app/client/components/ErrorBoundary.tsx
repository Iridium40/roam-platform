import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { AppError } from "@/lib/errors/AppError";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0,
    isRetrying: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Log to external service in production
    if (import.meta.env.MODE === "production") {
      // TODO: Send to error reporting service
      console.error("Production error:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
  }

  private handleRetry = async () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.error("Max retries exceeded");
      return;
    }

    this.setState({ isRetrying: true });

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay));

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private renderErrorContent() {
    const { error, retryCount, isRetrying } = this.state;
    const { maxRetries = 3 } = this.props;

    // Custom fallback UI
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const isAppError = error instanceof AppError;
    const canRetry = retryCount < maxRetries && (isAppError ? error.retryable : true);
    const isNetworkError = isAppError && error.code === 'NETWORK_ERROR';
    const isAuthError = isAppError && error.code === 'AUTH_ERROR';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">
              {isNetworkError ? "Connection Error" : "Something went wrong"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {isAppError 
                ? error.userMessage 
                : "We're sorry, but something unexpected happened. Please try refreshing the page."
              }
            </p>

            {isAuthError && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                You may need to sign in again to continue.
              </p>
            )}

            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}

            {import.meta.env.DEV && error && (
              <div className="text-left bg-gray-100 p-3 rounded text-sm">
                <strong>Error:</strong> {error.message}
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Stack trace</summary>
                    <pre className="text-xs mt-1 overflow-auto">{error.stack}</pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="w-full"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={this.handleGoBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </div>

              {!canRetry && (
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Refresh Page
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      return this.renderErrorContent();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
