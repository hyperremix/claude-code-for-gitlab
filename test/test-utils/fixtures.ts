/**
 * Shared test fixtures and data factories for comprehensive testing
 */

import type { WebhookPayload } from "../../gitlab-app/src/types";
import type { ParsedGitLabContext } from "../../src/gitlab/context";

export interface TestFixtures {
  gitlabContext: ParsedGitLabContext;
  webhookPayloads: Record<string, WebhookPayload>;
  apiResponses: Record<string, unknown>;
}

export interface TestEnvironment {
  originalEnv: NodeJS.ProcessEnv;
  mockEnv: Record<string, string>;
}

/**
 * Creates a mock GitLab context for testing
 */
export function createMockGitLabContext(
  overrides: Partial<ParsedGitLabContext> = {},
): ParsedGitLabContext {
  return {
    projectId: "123",
    host: "https://gitlab.example.com",
    userName: "testuser",
    userEmail: "test@example.com",
    commitSha: "abc123def456",
    commitBranch: "feature-branch",
    mrIid: "45",
    pipelineUrl: "https://gitlab.example.com/project/-/pipelines/789",
    triggerSource: "web",
    ...overrides,
  };
}

/**
 * Creates mock webhook payloads for different GitLab events
 */
export function createMockWebhookPayloads(): Record<string, WebhookPayload> {
  return {
    mergeRequestOpened: {
      object_kind: "merge_request",
      event_type: "merge_request",
      user: {
        id: 1,
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
      },
      project: {
        id: 123,
        name: "test-project",
        description: "Test project description",
        web_url: "https://gitlab.example.com/group/test-project",
        avatar_url: "",
        git_ssh_url: "git@gitlab.example.com:group/test-project.git",
        git_http_url: "https://gitlab.example.com/group/test-project.git",
        namespace: "group",
        visibility_level: 20,
        path_with_namespace: "group/test-project",
        default_branch: "main",
      },
      object_attributes: {
        id: 45,
        author_id: 1,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        project_id: 123,
        system: false,
        action: "open",
      },
      merge_request: {
        id: 45,
        iid: 45,
        target_branch: "main",
        source_branch: "feature-branch",
        source_project_id: 123,
        author_id: 1,
        title: "Test Merge Request",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        milestone_id: undefined,
        state: "opened",
        merge_status: "can_be_merged",
        target_project_id: 123,
        description: "Test description with @claude trigger",
        source: {},
        target: {},
        work_in_progress: false,
        url: "https://gitlab.example.com/group/test-project/-/merge_requests/45",
      },
    },
    issueOpened: {
      object_kind: "issue",
      event_type: "issue",
      user: {
        id: 1,
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
      },
      project: {
        id: 123,
        name: "test-project",
        description: "Test project description",
        web_url: "https://gitlab.example.com/group/test-project",
        avatar_url: "",
        git_ssh_url: "git@gitlab.example.com:group/test-project.git",
        git_http_url: "https://gitlab.example.com/group/test-project.git",
        namespace: "group",
        visibility_level: 20,
        path_with_namespace: "group/test-project",
        default_branch: "main",
      },
      object_attributes: {
        id: 67,
        author_id: 1,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        project_id: 123,
        system: false,
        action: "open",
      },
      issue: {
        id: 67,
        iid: 67,
        project_id: 123,
        title: "Test Issue",
        description: "Test issue description with @claude trigger",
        state: "opened",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        labels: [],
        assignees: [],
        author: { id: 1, username: "testuser" },
        user_notes_count: 0,
        upvotes: 0,
        downvotes: 0,
        confidential: false,
        web_url: "https://gitlab.example.com/group/test-project/-/issues/67",
      },
    },
    noteCreated: {
      object_kind: "note",
      event_type: "note",
      user: {
        id: 1,
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
      },
      project: {
        id: 123,
        name: "test-project",
        description: "Test project description",
        web_url: "https://gitlab.example.com/group/test-project",
        avatar_url: "",
        git_ssh_url: "git@gitlab.example.com:group/test-project.git",
        git_http_url: "https://gitlab.example.com/group/test-project.git",
        namespace: "group",
        visibility_level: 20,
        path_with_namespace: "group/test-project",
        default_branch: "main",
      },
      object_attributes: {
        id: 789,
        note: "@claude please help with this issue",
        noteable_type: "MergeRequest",
        author_id: 1,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        project_id: 123,
        system: false,
        noteable_id: 45,
      },
      merge_request: {
        id: 45,
        iid: 45,
        target_branch: "main",
        source_branch: "feature-branch",
        source_project_id: 123,
        author_id: 1,
        title: "Test MR",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        milestone_id: undefined,
        state: "opened",
        merge_status: "can_be_merged",
        target_project_id: 123,
        source: {},
        target: {},
        work_in_progress: false,
        url: "https://gitlab.example.com/group/test-project/-/merge_requests/45",
      },
    },
  };
}

/**
 * Creates mock GitLab API responses
 */
export function createMockApiResponses(): Record<string, unknown> {
  return {
    project: {
      id: 123,
      name: "test-project",
      path_with_namespace: "group/test-project",
      web_url: "https://gitlab.example.com/group/test-project",
      default_branch: "main",
    },
    mergeRequest: {
      id: 45,
      iid: 45,
      title: "Test Merge Request",
      description: "Test description",
      state: "opened",
      source_branch: "feature-branch",
      target_branch: "main",
      web_url:
        "https://gitlab.example.com/group/test-project/-/merge_requests/45",
      changes: [
        {
          old_path: "src/test.ts",
          new_path: "src/test.ts",
          diff: "@@ -1,3 +1,4 @@\n line1\n+line2\n line3",
        },
      ],
    },
    issue: {
      id: 67,
      iid: 67,
      title: "Test Issue",
      description: "Test issue description",
      state: "opened",
      web_url: "https://gitlab.example.com/group/test-project/-/issues/67",
    },
    pipeline: {
      id: 789,
      status: "running",
      ref: "feature-branch",
      web_url: "https://gitlab.example.com/group/test-project/-/pipelines/789",
    },
    user: {
      id: 1,
      username: "testuser",
      name: "Test User",
      email: "test@example.com",
    },
    fileContent: {
      file_name: "test.ts",
      file_path: "src/test.ts",
      content: "Y29uc29sZS5sb2coImhlbGxvIHdvcmxkIik=", // base64 encoded "console.log("hello world")"
      encoding: "base64",
    },
  };
}

/**
 * Creates a test environment with mocked environment variables
 */
export function createTestEnvironment(
  envOverrides: Record<string, string> = {},
): TestEnvironment {
  const originalEnv = { ...process.env };
  const mockEnv = {
    GITLAB_TOKEN: "mock-token",
    GITLAB_HOST: "https://gitlab.example.com",
    GITLAB_PROJECT_ID: "123",
    DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/test",
    REDIS_URL: "redis://localhost:6379",
    ...envOverrides,
  };

  return { originalEnv, mockEnv };
}

/**
 * Sets up test environment by modifying process.env directly
 * Compatible with Bun test environment
 */
export function setupTestEnvironment(
  mockEnv: Record<string, string>,
): TestEnvironment {
  // Store original environment variables
  const originalEnv: NodeJS.ProcessEnv = {};

  // Only store environment variables that we're about to change
  for (const key of Object.keys(mockEnv)) {
    if (key in process.env) {
      originalEnv[key] = process.env[key];
    }
  }

  // Set the mock environment variables directly on process.env
  for (const [key, value] of Object.entries(mockEnv)) {
    process.env[key] = value;
  }

  return { originalEnv, mockEnv };
}

/**
 * Restores original environment variables after test
 * Compatible with Bun test environment
 */
export function restoreTestEnvironment(originalEnv: NodeJS.ProcessEnv): void {
  // Restore only the environment variables we modified
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

/**
 * Creates mock error objects for testing error scenarios
 */
export function createMockErrors() {
  return {
    networkError: new Error("Network request failed"),
    authError: new Error("Authentication failed - invalid token"),
    notFoundError: new Error("Resource not found - 404"),
    rateLimit: new Error("Rate limit exceeded - 429"),
    serverError: new Error("Internal server error - 500"),
    timeoutError: new Error("Request timeout"),
    validationError: new Error("Validation failed - invalid input"),
  };
}

/**
 * Creates mock file system structures for testing
 */
export function createMockFileSystem() {
  return {
    files: {
      "src/test.ts": "console.log('hello world');",
      "src/utils/helper.ts": "export const helper = () => 'test';",
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
      }),
      "README.md": "# Test Project",
    },
    directories: ["src", "src/utils", "test", "dist"],
  };
}

/**
 * Creates mock Redis client responses
 */
export function createMockRedisResponses() {
  return {
    zRemRangeByScore: 0,
    zCard: 5,
    zAdd: 1,
    expire: 1,
    connect: Promise.resolve(),
    disconnect: Promise.resolve(),
  };
}

/**
 * Creates mock Discord webhook responses
 */
export function createMockDiscordResponses() {
  return {
    success: {
      id: "123456789",
      type: 0,
      content: "Pipeline notification sent",
      channel_id: "987654321",
      author: {
        id: "bot123",
        username: "GitLab Bot",
        bot: true,
      },
    },
    error: new Error("Discord webhook failed"),
  };
}

/**
 * Utility to create parameterized test cases
 */
export function createTestCases<T>(
  scenarios: Array<{
    description: string;
    input: T;
    expected: unknown;
    shouldThrow?: boolean;
  }>,
) {
  return scenarios;
}

/**
 * Async test utilities for handling promises and timeouts
 */
export const asyncTestUtils = {
  /**
   * Waits for a promise to resolve or reject within timeout
   */
  waitFor: async <T>(
    promise: Promise<T>,
    timeoutMs: number = 5000,
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Test timeout")), timeoutMs),
      ),
    ]);
  },

  /**
   * Creates a delayed promise for testing async operations
   */
  delay: (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Creates a promise that rejects after a delay
   */
  delayedReject: (ms: number, error: Error): Promise<never> =>
    new Promise((_, reject) => setTimeout(() => reject(error), ms)),
};
