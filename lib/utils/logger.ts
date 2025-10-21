/**
 * Production-Ready Logger
 *
 * Replaces console.log with structured logging for better debugging and monitoring.
 * Supports different log levels and conditional logging based on environment.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Format log message with timestamp and context
   */
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.format(LogLevel.DEBUG, message, context));
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    console.log(this.format(LogLevel.INFO, message, context));
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.format(LogLevel.WARN, message, context));
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error?.message || error,
      stack: error?.stack,
    };
    console.error(this.format(LogLevel.ERROR, message, errorContext));
  }

  /**
   * Log with custom emoji prefix (for backwards compatibility)
   */
  custom(emoji: string, message: string, context?: LogContext): void {
    const formattedMessage = `${emoji} ${message}`;
    console.log(this.format(LogLevel.INFO, formattedMessage, context));
  }

  /**
   * Helper: Log API calls
   */
  api(method: string, endpoint: string, status?: number, duration?: number): void {
    this.info(`API ${method} ${endpoint}`, {
      method,
      endpoint,
      status,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Helper: Log bot execution
   */
  bot(botId: string, action: string, result?: any): void {
    this.info(`🤖 Bot ${botId}: ${action}`, { botId, action, result });
  }

  /**
   * Helper: Log trading actions
   */
  trade(symbol: string, action: string, details?: LogContext): void {
    this.info(`💰 Trade ${symbol}: ${action}`, { symbol, action, ...details });
  }

  /**
   * Helper: Log scheduler events
   */
  scheduler(event: string, details?: LogContext): void {
    this.info(`⏰ Scheduler: ${event}`, details);
  }

  /**
   * Helper: Log database operations
   */
  db(operation: string, table: string, details?: LogContext): void {
    this.debug(`DB ${operation} on ${table}`, { operation, table, ...details });
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Export type for external use
 */
export type { LogContext };
