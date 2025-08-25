import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "muted";
  className?: string;
  text?: string;
  showText?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const variantClasses = {
  default: "text-foreground",
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  muted: "text-muted-foreground",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "default",
  className,
  text,
  showText = false,
}) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2
          className={cn(
            "animate-spin",
            sizeClasses[size],
            variantClasses[variant]
          )}
        />
        {showText && text && (
          <p className={cn("text-sm", variantClasses[variant])}>{text}</p>
        )}
      </div>
    </div>
  );
};

// Full screen loading component
export const FullScreenLoader: React.FC<{ text?: string }> = ({ text = "Loading..." }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <div className="w-8 h-8 bg-white rounded-full"></div>
        </div>
        <h2 className="text-xl font-semibold text-roam-blue mb-2">
          {text}
        </h2>
        <p className="text-foreground/60">
          Please wait while we process your request.
        </p>
      </div>
    </div>
  );
};

// Inline loading component
export const InlineLoader: React.FC<{ text?: string; size?: "sm" | "md" }> = ({ 
  text = "Loading...", 
  size = "sm" 
}) => {
  return (
    <div className="inline-flex items-center gap-2">
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
};

// Button loading state
export const ButtonLoader: React.FC<{ text?: string }> = ({ text = "Loading..." }) => {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" variant="muted" />
      <span>{text}</span>
    </div>
  );
};

export default LoadingSpinner;
