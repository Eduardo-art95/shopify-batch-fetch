/**
 * Secure logging utility
 * In production, errors are not logged to console to prevent information leakage
 * Consider integrating with a proper logging service like Sentry or LogRocket
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log error messages
   * In production, this should send to a logging service instead of console
   */
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      // In production, send to logging service
      // Example: Sentry.captureException(error, { extra: { message } });
      // For now, we silently fail to prevent information disclosure
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
