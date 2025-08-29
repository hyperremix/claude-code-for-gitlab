/**
 * Environment service implementation
 * Wraps process.env access for dependency injection
 */

import type { IEnvironmentService } from "../interfaces";
import type { EnvVar } from "../types";

export class EnvironmentService implements IEnvironmentService {
  /**
   * Gets environment variable value using enum
   */
  get(key: EnvVar): string | undefined {
    return process.env[key];
  }

  /**
   * Gets required environment variable value using enum, throws if missing
   */
  require(key: EnvVar): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Gets all environment variables
   */
  getAll(): Record<string, string> {
    return { ...process.env } as Record<string, string>;
  }

  /**
   * Sets environment variable value using enum
   */
  set(key: EnvVar, value: string): void {
    process.env[key] = value;
  }
}
