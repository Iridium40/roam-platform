// Enhanced logger utility for better debugging control
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      logger.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      logger.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      logger.info(this.formatMessage('INFO', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      logger.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  trace(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      console.trace(this.formatMessage('TRACE', message, data));
    }
  }

  // Method to enable/disable debug logging
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  // Method to check if debug logging is enabled
  isDebugEnabled(): boolean {
    return this.level >= LogLevel.DEBUG;
  }
}

export const logger = new Logger();

// Utility function to remove console.log statements in production
export const removeConsoleLogs = (): void => {
  if (isProduction) {
    console.log = () => {};
    console.debug = () => {};
    console.trace = () => {};
  }
};
