import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { TokenService } from "../../src/services";
import type { EnvVar } from "../../src/types";

describe("TokenService", () => {
  // System Under Test
  let tokenService: TokenService;

  // Dependencies
  let logger: any;
  let environment: any;

  // Test Data
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };

    // Clear all token-related environment variables first
    delete process.env.CLAUDE_CODE_GL_ACCESS_TOKEN;
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.GITLAB_TOKEN;
    delete process.env.INPUT_CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.INPUT_GITLAB_TOKEN;

    // Set required GitLab context environment variables for service container
    process.env.CI_PROJECT_ID = "123";
    process.env.CI_SERVER_HOST = "gitlab.com";

    logger = {
      error: mock(() => {}),
      info: mock(() => {}),
    };

    environment = {
      get: mock((envVar: EnvVar) => process.env[envVar]),
    };

    tokenService = new TokenService(logger, environment);
    tokenService.resetCache();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getToken", () => {
    test("prefers GL access token over all other tokens", () => {
      process.env.CLAUDE_CODE_GL_ACCESS_TOKEN = "gl-access-token-123";
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "oauth-token-456";
      process.env.GITLAB_TOKEN = "gitlab-token-789";

      const token = tokenService.getToken();
      expect(token).toBe("gl-access-token-123");
    });

    test("prefers OAuth token over traditional GitLab token", () => {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "oauth-token-123";
      process.env.GITLAB_TOKEN = "gitlab-token-456";

      const token = tokenService.getToken();
      expect(token).toBe("oauth-token-123");
    });

    test("uses OAuth token from input variable", () => {
      process.env.INPUT_CLAUDE_CODE_OAUTH_TOKEN = "input-oauth-token";
      process.env.GITLAB_TOKEN = "gitlab-token";

      const token = tokenService.getToken();
      expect(token).toBe("input-oauth-token");
    });

    test("falls back to gitlab_token input when OAuth token not available", () => {
      process.env.INPUT_GITLAB_TOKEN = "input-gitlab-token";
      process.env.GITLAB_TOKEN = "env-gitlab-token";

      const token = tokenService.getToken();
      expect(token).toBe("env-gitlab-token");
    });

    test("falls back to GITLAB_TOKEN env var when no inputs available", () => {
      process.env.GITLAB_TOKEN = "env-gitlab-token";

      const token = tokenService.getToken();
      expect(token).toBe("env-gitlab-token");
    });

    test("throws error with helpful message when no tokens available", () => {
      // All tokens already cleared in beforeEach
      expect(() => tokenService.getToken()).toThrow(
        "GitLab authentication required (CLAUDE_CODE_GL_ACCESS_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, GITLAB_TOKEN, or gitlab_token input)",
      );
    });
  });
});
