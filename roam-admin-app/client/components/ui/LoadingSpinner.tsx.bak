import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const variantClasses = {
  default: 'border-gray-300 border-t-gray-600',
  primary: 'border-blue-200 border-t-blue-600',
  secondary: 'border-gray-200 border-t-gray-800',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
  variant = 'default',
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
};

// Convenience components for common use cases
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" text={text} variant="primary" />
  </div>
);

export const TableLoader: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner size="md" text="Loading data..." />
  </div>
);

export const ButtonLoader: React.FC = () => (
  <LoadingSpinner size="sm" variant="primary" />
);

export const InlineLoader: React.FC = () => (
  <LoadingSpinner size="xs" variant="default" />
);
