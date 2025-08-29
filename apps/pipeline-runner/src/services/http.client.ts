/**
 * HTTP client service implementation
 * Wraps fetch API for dependency injection
 */

import type { IHttpClient } from "../interfaces";

export class HttpClient implements IHttpClient {
  /**
   * Makes HTTP requests using fetch API
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    return await fetch(url, options);
  }
}
