import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  totalDuration: number;
  averageDuration: number;
  slowestOperation: PerformanceMetric | null;
  fastestOperation: PerformanceMetric | null;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = import.meta.env.DEV;

  enable(): void {
    this.isEnabled = true;
    logger.info('Performance monitoring enabled');
  }

  disable(): void {
    this.isEnabled = false;
    logger.info('Performance monitoring disabled');
  }

  startTimer(name: string, metadata?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.metrics.set(name, metric);
    logger.debug(`Performance timer started: ${name}`, metadata);
  }

  endTimer(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Performance timer not found: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    logger.debug(`Performance timer ended: ${name}`, {
      duration: `${metric.duration.toFixed(2)}ms`,
      metadata: metric.metadata,
    });

    return metric.duration;
  }

  measureAsync<T>(
    name: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isEnabled) {
      return asyncFn();
    }

    this.startTimer(name, metadata);
    
    return asyncFn()
      .then((result) => {
        this.endTimer(name);
        return result;
      })
      .catch((error) => {
        this.endTimer(name);
        throw error;
      });
  }

  measureSync<T>(
    name: string,
    syncFn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    if (!this.isEnabled) {
      return syncFn();
    }

    this.startTimer(name, metadata);
    const result = syncFn();
    this.endTimer(name);
    return result;
  }

  getReport(): PerformanceReport {
    const completedMetrics = Array.from(this.metrics.values())
      .filter((metric) => metric.duration !== undefined)
      .sort((a, b) => (a.duration || 0) - (b.duration || 0));

    const totalDuration = completedMetrics.reduce(
      (sum, metric) => sum + (metric.duration || 0),
      0
    );

    return {
      metrics: completedMetrics,
      totalDuration,
      averageDuration: completedMetrics.length > 0 
        ? totalDuration / completedMetrics.length 
        : 0,
      slowestOperation: completedMetrics[completedMetrics.length - 1] || null,
      fastestOperation: completedMetrics[0] || null,
    };
  }

  clear(): void {
    this.metrics.clear();
    logger.debug('Performance metrics cleared');
  }

  logReport(): void {
    if (!this.isEnabled) return;

    const report = this.getReport();
    
    logger.info('Performance Report', {
      totalOperations: report.metrics.length,
      totalDuration: `${report.totalDuration.toFixed(2)}ms`,
      averageDuration: `${report.averageDuration.toFixed(2)}ms`,
      slowestOperation: report.slowestOperation 
        ? `${report.slowestOperation.name}: ${report.slowestOperation.duration?.toFixed(2)}ms`
        : 'None',
      fastestOperation: report.fastestOperation
        ? `${report.fastestOperation.name}: ${report.fastestOperation.duration?.toFixed(2)}ms`
        : 'None',
    });
  }
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    startTimer: monitor.startTimer.bind(monitor),
    endTimer: monitor.endTimer.bind(monitor),
    measureAsync: monitor.measureAsync.bind(monitor),
    measureSync: monitor.measureSync.bind(monitor),
    getReport: monitor.getReport.bind(monitor),
    logReport: monitor.logReport.bind(monitor),
    clear: monitor.clear.bind(monitor),
  };
}

// Higher-order component for measuring component render times
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const name = componentName || Component.name;
    
    React.useEffect(() => {
      monitor.startTimer(`${name}-render`);
      return () => {
        monitor.endTimer(`${name}-render`);
      };
    });

    return React.createElement(Component, props);
  };
}

// Global performance monitor instance
export const monitor = new PerformanceMonitor();

// Auto-log performance report on page unload in development
if (import.meta.env.DEV) {
  window.addEventListener('beforeunload', () => {
    monitor.logReport();
  });
}
