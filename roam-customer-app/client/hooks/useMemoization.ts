import { useMemo, useCallback, useRef } from 'react';
import { useState, useEffect } from 'react';

// Custom hook for expensive calculations
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

// Custom hook for memoized callbacks
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

// Custom hook for debounced values
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for throttled callbacks
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const lastCallTimer = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    } else {
      if (lastCallTimer.current) {
        clearTimeout(lastCallTimer.current);
      }
      lastCallTimer.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}

// Custom hook for expensive list operations
export function useMemoizedList<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string | number
): T[] {
  return useMemo(() => {
    return items.map((item, index) => ({
      ...item,
      key: keyExtractor(item, index),
    }));
  }, [items, keyExtractor]);
}
