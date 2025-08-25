import React from "react";
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getUserFriendlyError, getErrorSeverityColor, getErrorIcon } from "@/lib/errors/UserFriendlyErrors";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: Error | string;
  title?: string;
  showActions?: boolean;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
  variant?: "card" | "alert" | "inline";
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title = "Something went wrong",
  showActions = true,
  onRetry,
  onGoBack,
  onGoHome,
  className,
  variant = "card",
}) => {
  const errorMapping = getUserFriendlyError(error);
  const isDevelopment = import.meta.env.DEV;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = "/";
    }
  };

  if (variant === "alert") {
    return (
      <Alert className={cn(getErrorSeverityColor(errorMapping.severity), className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium">{errorMapping.userMessage}</div>
          {errorMapping.action && (
            <div className="text-sm mt-1">{errorMapping.action}</div>
          )}
          {isDevelopment && typeof error === "object" && error.stack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Technical details</summary>
              <pre className="text-xs mt-1 overflow-auto max-h-32 bg-muted p-2 rounded">
                {error.stack}
              </pre>
            </details>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <span className="text-red-500">{getErrorIcon(errorMapping.severity)}</span>
        <span className="text-red-600">{errorMapping.userMessage}</span>
      </div>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">{errorMapping.userMessage}</p>
        
        {errorMapping.action && (
          <p className="text-sm text-muted-foreground">{errorMapping.action}</p>
        )}

        {isDevelopment && typeof error === "object" && error.stack && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Technical details
            </summary>
            <pre className="text-xs mt-1 overflow-auto max-h-32 bg-muted p-2 rounded">
              {error.stack}
            </pre>
          </details>
        )}

        {showActions && (
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}

            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>

            <Button onClick={handleGoHome} variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Full screen error component
export const FullScreenError: React.FC<Omit<ErrorStateProps, "variant">> = (props) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ErrorState {...props} />
    </div>
  );
};

// Page error component
export const PageError: React.FC<Omit<ErrorStateProps, "variant">> = (props) => {
  return (
    <div className="container mx-auto py-8">
      <ErrorState {...props} />
    </div>
  );
};

export default ErrorState;
