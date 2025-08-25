import React, { memo, useMemo, useCallback, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Lazy load heavy components
const HeavyChartComponent = lazy(() => import('./HeavyChartComponent'));
const DataTable = lazy(() => import('./DataTable'));

// Memoized loading spinner
export const MemoizedLoadingSpinner = memo(({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => (
  <LoadingSpinner size={size} />
));

// Memoized skeleton loader
export const MemoizedSkeletonLoader = memo(({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
));

// Performance optimized card component
export const OptimizedCard = memo(({ 
  title, 
  children, 
  className = '',
  onClick,
  loading = false 
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
}) => {
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const cardContent = useMemo(() => {
    if (loading) {
      return <MemoizedSkeletonLoader lines={3} />;
    }
    return children;
  }, [loading, children]);

  return (
    <Card className={className} onClick={handleClick}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {cardContent}
      </CardContent>
    </Card>
  );
});

// Performance optimized list component
export const OptimizedList = memo(({ 
  items, 
  renderItem, 
  keyExtractor,
  loading = false,
  emptyMessage = "No items found",
  className = ""
}: {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  keyExtractor: (item: any, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}) => {
  const memoizedItems = useMemo(() => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => ({ id: `skeleton-${i}` }));
    }
    return items;
  }, [items, loading]);

  const renderMemoizedItem = useCallback((item: any, index: number) => {
    if (loading) {
      return <MemoizedSkeletonLoader key={`skeleton-${index}`} lines={2} />;
    }
    return renderItem(item, index);
  }, [renderItem, loading]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {memoizedItems.map((_, index) => (
          <div key={`skeleton-${index}`}>
            <MemoizedSkeletonLoader lines={2} />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {memoizedItems.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderMemoizedItem(item, index)}
        </div>
      ))}
    </div>
  );
});

// Performance optimized button with loading state
export const OptimizedButton = memo(({ 
  children, 
  loading = false, 
  disabled = false,
  onClick,
  className = "",
  ...props 
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) => {
  const handleClick = useCallback(() => {
    if (!loading && !disabled) {
      onClick?.();
    }
  }, [onClick, loading, disabled]);

  const buttonContent = useMemo(() => {
    if (loading) {
      return (
        <>
          <MemoizedLoadingSpinner size="sm" />
          <span className="ml-2">Loading...</span>
        </>
      );
    }
    return children;
  }, [loading, children]);

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {buttonContent}
    </Button>
  );
});

// Performance optimized search input
export const OptimizedSearchInput = memo(({ 
  value, 
  onChange, 
  placeholder = "Search...",
  debounceMs = 300,
  className = ""
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}) => {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    React.useMemo(
      () => {
        let timeoutId: NodeJS.Timeout;
        return (newValue: string) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            onChange(newValue);
          }, debounceMs);
        };
      },
      [onChange, debounceMs]
    ),
    [onChange, debounceMs]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
});

// Performance optimized pagination
export const OptimizedPagination = memo(({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = ""
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) => {
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }, [onPageChange, currentPage, totalPages]);

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <OptimizedButton
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        variant="outline"
        size="sm"
      >
        Previous
      </OptimizedButton>
      
      {pageNumbers.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-2">...</span>
          ) : (
            <OptimizedButton
              onClick={() => handlePageChange(page as number)}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className="w-8 h-8 p-0"
            >
              {page}
            </OptimizedButton>
          )}
        </React.Fragment>
      ))}
      
      <OptimizedButton
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        variant="outline"
        size="sm"
      >
        Next
      </OptimizedButton>
    </div>
  );
});

// Performance optimized data grid
export const OptimizedDataGrid = memo(({ 
  data, 
  columns, 
  loading = false,
  onRowClick,
  className = ""
}: {
  data: any[];
  columns: Array<{
    key: string;
    header: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  loading?: boolean;
  onRowClick?: (row: any) => void;
  className?: string;
}) => {
  const handleRowClick = useCallback((row: any) => {
    onRowClick?.(row);
  }, [onRowClick]);

  const renderCell = useCallback((column: any, row: any) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    return row[column.key];
  }, []);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex space-x-4">
            {columns.map((column, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex space-x-4 font-semibold text-sm text-gray-600">
        {columns.map((column) => (
          <div key={column.key} className="flex-1">
            {column.header}
          </div>
        ))}
      </div>
      
      {/* Rows */}
      {data.map((row, index) => (
        <div
          key={index}
          className={`flex space-x-4 p-2 rounded hover:bg-gray-50 cursor-pointer ${
            onRowClick ? 'cursor-pointer' : ''
          }`}
          onClick={() => handleRowClick(row)}
        >
          {columns.map((column) => (
            <div key={column.key} className="flex-1">
              {renderCell(column, row)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

// Performance optimized lazy component wrapper
export const LazyComponentWrapper = memo(({ 
  children, 
  fallback = <MemoizedLoadingSpinner />,
  className = ""
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </div>
));

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const startTime = React.useRef<number>(0);
  
  const startMeasurement = useCallback((name: string) => {
    startTime.current = performance.now();
    console.log(`🚀 Starting measurement: ${name}`);
  }, []);

  const endMeasurement = useCallback((name: string) => {
    const duration = performance.now() - startTime.current;
    console.log(`⏱️ ${name} completed in ${duration.toFixed(2)}ms`);
    return duration;
  }, []);

  const measureAsync = useCallback(function measureAsync<T>(
    name: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> {
    startMeasurement(name);
    return asyncFn().then(
      (result) => {
        endMeasurement(name);
        return result;
      },
      (error) => {
        console.error(`❌ ${name} failed after ${endMeasurement(name)}ms:`, error);
        throw error;
      }
    );
  }, [startMeasurement, endMeasurement]);

  return {
    startMeasurement,
    endMeasurement,
    measureAsync
  };
};
