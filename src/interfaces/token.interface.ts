export interface ITokenService {
  /**
   * Gets the GitLab token using injected environment service
   */
  getToken(): string;

  /**
   * Resets the cached token (used for testing)
   */
  resetCache(): void;
}
