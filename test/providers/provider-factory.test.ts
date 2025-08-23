import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getToken } from "../../src/providers/provider-factory";

describe("getToken", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GitLab token retrieval", () => {
    test("gets token from GITLAB_TOKEN environment variable", () => {
      process.env.GITLAB_TOKEN = "env-gitlab-token";

      expect(getToken()).toBe("env-gitlab-token");
    });

    test("throws error when no GitLab token found", () => {
      delete process.env.GITLAB_TOKEN;
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
      delete process.env.INPUT_CLAUDE_CODE_OAUTH_TOKEN;
      delete process.env.INPUT_GITLAB_TOKEN;

      expect(() => getToken()).toThrow(
        "GitLab authentication required (CLAUDE_CODE_GL_ACCESS_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, GITLAB_TOKEN, or gitlab_token input)",
      );
    });
  });
});
