/**
 * Centralized Logger Utility
 *
 * Provides consistent, environment-aware logging throughout the app.
 * Only logs in development mode by default.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('Component', 'Mounted with props', props);
 *   logger.error('API', error);
 *   logger.warn('Deprecation', 'This method will be removed');
 *   logger.debug('Filter', 'Applied filters', filters);
 *
 * Production behavior:
 *   - info, debug, warn: Silent
 *   - error: Always logs (for critical issues)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  /** Enable all logs regardless of environment */
  forceEnable?: boolean;
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Prefix for all log messages */
  appPrefix?: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      forceEnable: false,
      minLevel: 'warn',
      appPrefix: 'TM',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // Errors always log
    if (level === 'error') return true;

    // In production, only errors log unless forced
    if (!isDevelopment && !this.config.forceEnable) return false;

    // Check log level priority
    const minPriority = LOG_LEVEL_PRIORITY[this.config.minLevel || 'debug'];
    const currentPriority = LOG_LEVEL_PRIORITY[level];
    return currentPriority >= minPriority;
  }

  private formatMessage(prefix: string, ...args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    return [`[${this.config.appPrefix}:${prefix}] ${timestamp}`, ...args];
  }

  /**
   * Debug-level logging (most verbose)
   * Use for detailed debugging information
   */
  debug(prefix: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage(prefix, ...args));
    }
  }

  /**
   * Info-level logging
   * Use for general information about app state/flow
   */
  info(prefix: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage(prefix, ...args));
    }
  }

  /**
   * Warning-level logging
   * Use for potentially problematic situations
   */
  warn(prefix: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage(prefix, ...args));
    }
  }

  /**
   * Error-level logging (always logs)
   * Use for errors that need attention
   */
  error(prefix: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage(prefix, ...args));
    }
  }

  /**
   * Group logs together (dev only)
   */
  group(label: string, fn: () => void): void {
    if (!isDevelopment && !this.config.forceEnable) {
      fn();
      return;
    }
    console.group(`[${this.config.appPrefix}] ${label}`);
    fn();
    console.groupEnd();
  }

  /**
   * Measure execution time (dev only)
   */
  time<T>(label: string, fn: () => T): T {
    if (!isDevelopment && !this.config.forceEnable) {
      return fn();
    }
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.debug('Perf', `${label}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Async version of time measurement
   */
  async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!isDevelopment && !this.config.forceEnable) {
      return fn();
    }
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.debug('Perf', `${label}: ${duration.toFixed(2)}ms`);
    return result;
  }
}

// Default logger instance
export const logger = new Logger();

// Factory for creating prefixed loggers
export function createLogger(prefix: string): {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
} {
  return {
    debug: (...args) => logger.debug(prefix, ...args),
    info: (...args) => logger.info(prefix, ...args),
    warn: (...args) => logger.warn(prefix, ...args),
    error: (...args) => logger.error(prefix, ...args),
  };
}

export default logger;
