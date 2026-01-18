/**
 * Server-side logger utility
 * Provides structured logging with environment awareness
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private prefix: string;

  constructor(prefix?: string) {
    this.prefix = prefix || '';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context));
  }

  // For backwards compatibility - only logs in development
  log(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.log(this.formatMessage('info', message, context));
    }
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function to create loggers with prefixes
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}

export default logger;
