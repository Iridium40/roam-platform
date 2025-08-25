/**
 * Comprehensive Loading Skeleton Components
 * Provides consistent loading states throughout the application
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, children }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
    >
      {children}
    </div>
  );
};

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 6,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Card skeleton
interface CardSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showContent?: boolean;
  showFooter?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className,
  showHeader = true,
  showContent = true,
  showFooter = false,
}) => {
  return (
    <div className={cn('rounded-lg border bg-white p-6 shadow-sm', className)}>
      {showHeader && (
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      
      {showContent && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}
      
      {showFooter && (
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </div>
  );
};

// Stat card skeleton
export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('rounded-lg border bg-white p-6 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
};

// List skeleton
interface ListSkeletonProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
  showSubtitle?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  className,
  showAvatar = true,
  showSubtitle = true,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            {showSubtitle && <Skeleton className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
};

// Form skeleton
interface FormSkeletonProps {
  fields?: number;
  className?: string;
  showSubmit?: boolean;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  className,
  showSubmit = true,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      
      {showSubmit && (
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
};

// Page skeleton
interface PageSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showStats?: boolean;
  showContent?: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  className,
  showHeader = true,
  showStats = true,
  showContent = true,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {showHeader && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      
      {showContent && (
        <div className="space-y-6">
          <CardSkeleton showHeader showContent showFooter />
          <CardSkeleton showHeader showContent />
        </div>
      )}
    </div>
  );
};

// Data table skeleton
interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showPagination?: boolean;
}

export const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  rows = 10,
  columns = 6,
  className,
  showPagination = true,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Table */}
      <div className="rounded-lg border">
        <div className="p-4">
          <TableSkeleton rows={rows} columns={columns} />
        </div>
      </div>
      
      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}
    </div>
  );
};

// Chart skeleton
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
};

// Profile skeleton
export const ProfileSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
};

// Export default
export default Skeleton;
