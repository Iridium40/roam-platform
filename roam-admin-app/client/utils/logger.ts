/**
 * Centralized logging utility for the ROAM Admin App
 * Provides consistent logging across the application with environment-aware behavior
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext, data?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(', ')}]` : '';
    return `[${timestamp}] ${level.toUpperCase()}${contextStr}: ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    if (this.isProduction && level !== 'debug') return true;
    return false;
  }

  debug(message: string, context?: LogContext, data?: any): void {
    if (!this.shouldLog('debug')) return;
    const formattedMessage = this.formatMessage('debug', message, context);
    console.debug(formattedMessage, data || '');
  }

  info(message: string, context?: LogContext, data?: any): void {
    if (!this.shouldLog('info')) return;
    const formattedMessage = this.formatMessage('info', message, context);
    console.info(formattedMessage, data || '');
  }

  warn(message: string, context?: LogContext, data?: any): void {
    if (!this.shouldLog('warn')) return;
    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage, data || '');
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    const formattedMessage = this.formatMessage('error', message, context);
    
    if (error instanceof Error) {
      console.error(formattedMessage, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      console.error(formattedMessage, error || '');
    }
  }

  // Specialized logging methods for common use cases
  apiCall(endpoint: string, method: string, context?: LogContext): void {
    this.info(`API ${method} ${endpoint}`, context);
  }

  apiResponse(endpoint: string, method: string, status: number, context?: LogContext): void {
    const level = status >= 400 ? 'error' : 'info';
    this[level](`API ${method} ${endpoint} - ${status}`, context);
  }

  userAction(action: string, userId?: string, context?: LogContext): void {
    this.info(`User action: ${action}`, { ...context, userId });
  }

  dataFetch(table: string, recordCount: number, context?: LogContext): void {
    this.info(`Fetched ${recordCount} records from ${table}`, context);
  }

  dataMutation(operation: 'create' | 'update' | 'delete', table: string, id: string, context?: LogContext): void {
    this.info(`${operation} ${table} record ${id}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { debug, info, warn, error, apiCall, apiResponse, userAction, dataFetch, dataMutation } = logger;
