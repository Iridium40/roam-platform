/**
 * Environment-aware logger utility
 * Only logs in development mode to avoid polluting production console
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
}

class Logger {
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : '';
  }

  private formatMessage(message: string): string {
    return this.prefix ? `${this.prefix} ${message}` : message;
  }

  debug(...args: unknown[]): void {
    if (isDevelopment) {
      console.debug(this.formatMessage(String(args[0])), ...args.slice(1));
    }
  }

  info(...args: unknown[]): void {
    if (isDevelopment) {
      console.info(this.formatMessage(String(args[0])), ...args.slice(1));
    }
  }

  warn(...args: unknown[]): void {
    // Warnings are logged in all environments
    console.warn(this.formatMessage(String(args[0])), ...args.slice(1));
  }

  error(...args: unknown[]): void {
    // Errors are logged in all environments
    console.error(this.formatMessage(String(args[0])), ...args.slice(1));
  }

  // For backwards compatibility with console.log
  log(...args: unknown[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage(String(args[0])), ...args.slice(1));
    }
  }
}

// Create a default logger instance
export const logger = new Logger();

// Factory function to create loggers with specific prefixes
export function createLogger(prefix: string): Logger {
  return new Logger({ prefix });
}

// Export individual log functions for convenience
export const debug = (...args: unknown[]) => logger.debug(...args);
export const info = (...args: unknown[]) => logger.info(...args);
export const warn = (...args: unknown[]) => logger.warn(...args);
export const error = (...args: unknown[]) => logger.error(...args);
export const log = (...args: unknown[]) => logger.log(...args);

export default logger;
