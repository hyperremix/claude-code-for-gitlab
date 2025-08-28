/**
 * Logger service implementation
 * Provides structured logging for dependency injection
 */

import type { ILoggerService } from "../interfaces";

export class LoggerService implements ILoggerService {
  /**
   * Logs info level messages
   */
  info(message: string, meta?: any): void {
    if (meta) {
      console.log(`[INFO] ${message}`, this.maskSensitive(meta));
    } else {
      console.log(`[INFO] ${message}`);
    }
  }

  /**
   * Logs error level messages
   */
  error(message: string, meta?: any): void {
    if (meta) {
      console.error(`[ERROR] ${message}`, this.maskSensitive(meta));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }

  /**
   * Logs warning level messages
   */
  warn(message: string, meta?: any): void {
    if (meta) {
      console.warn(`[WARN] ${message}`, this.maskSensitive(meta));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  /**
   * Logs debug level messages
   */
  debug(message: string, meta?: any): void {
    if (meta) {
      console.debug(`[DEBUG] ${message}`, this.maskSensitive(meta));
    } else {
      console.debug(`[DEBUG] ${message}`);
    }
  }

  /**
   * Masks sensitive information in log objects
   */
  maskSensitive(obj: any): any {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    const sensitiveKeys = [
      "token",
      "password",
      "secret",
      "key",
      "authorization",
    ];
    const masked = { ...obj };

    for (const key of Object.keys(masked)) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        masked[key] = "***MASKED***";
      } else if (typeof masked[key] === "object" && masked[key] !== null) {
        masked[key] = this.maskSensitive(masked[key]);
      }
    }

    return masked;
  }
}
