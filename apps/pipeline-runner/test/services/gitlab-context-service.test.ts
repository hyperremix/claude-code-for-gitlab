import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GitLabContextService } from "../../src/services/gitlab-context.service";

describe("GitLabContextService", () => {
  let contextService: GitLabContextService;

  let mockEnvironmentService: any;

  beforeEach(() => {
    // Create mock environment service using bun:test mock functions
    mockEnvironmentService = {
      vars: {} as Record<string, string>,
      get: mock((key: string) => mockEnvironmentService.vars[key]),
      require: mock((key: string) => {
        const value = mockEnvironmentService.vars[key];
        if (!value) {
          throw new Error(`Required environment variable not found: ${key}`);
        }
        return value;
      }),
      set: mock((key: string, value: string) => {
        mockEnvironmentService.vars[key] = value;
      }),
      setVar: mock((key: string, value: string) => {
        mockEnvironmentService.vars[key] = value;
      }),
    };

    contextService = new GitLabContextService(mockEnvironmentService);

    // Reset the module-level cache in the GitLabContextService
    // This is needed because the service caches context and webhook payload at module level
    contextService.resetCache();
  });

  test("parseContext with explicit environment variables", () => {
    mockEnvironmentService.vars = {
      CI_PROJECT_ID: "123",
      CI_MERGE_REQUEST_IID: "45",
      CI_SERVER_URL: "https://gitlab.example.com",
      CI_PIPELINE_URL: "https://gitlab.example.com/project/-/pipelines/789",
    };

    const context = contextService.getContext();

    expect(context).toEqual({
      projectId: "123",
      mrIid: "45",
      issueIid: undefined,
      host: "https://gitlab.example.com",
      pipelineUrl: "https://gitlab.example.com/project/-/pipelines/789",
      commitSha: "",
      commitBranch: "",
      userName: "",
      userEmail: "",
      triggerSource: undefined,
    });
  });

  test("parseContext from environment variables", () => {
    mockEnvironmentService.vars = {
      CI_PROJECT_ID: "456",
      CI_MERGE_REQUEST_IID: "78",
      CI_SERVER_URL: "https://gitlab.company.com",
      CI_PIPELINE_URL: "https://gitlab.company.com/project/-/pipelines/999",
      GITLAB_USER_NAME: "Test User",
      GITLAB_USER_EMAIL: "test@example.com",
      CI_COMMIT_SHA: "abc123def456",
      CI_COMMIT_REF_NAME: "feature-branch",
      CI_PIPELINE_SOURCE: "push",
    };

    const context = contextService.getContext();

    expect(context).toEqual({
      projectId: "456",
      mrIid: "78",
      issueIid: undefined,
      host: "https://gitlab.company.com",
      pipelineUrl: "https://gitlab.company.com/project/-/pipelines/999",
      userName: "Test User",
      userEmail: "test@example.com",
      commitSha: "abc123def456",
      commitBranch: "feature-branch",
      triggerSource: "push",
    });
  });

  test("defaults to gitlab.com when no host specified", () => {
    mockEnvironmentService.vars = {
      CI_PROJECT_ID: "123",
    };

    const context = contextService.getContext();

    expect(context.host).toBe("https://gitlab.com");
  });

  test("handles missing optional fields", () => {
    mockEnvironmentService.vars = {
      CI_PROJECT_ID: "123",
    };

    const context = contextService.getContext();

    expect(context).toEqual({
      projectId: "123",
      mrIid: undefined,
      issueIid: undefined,
      host: "https://gitlab.com",
      pipelineUrl: undefined,
      commitSha: "",
      commitBranch: "",
      userName: "",
      userEmail: "",
      triggerSource: undefined,
    });
  });

  test("prioritizes explicit parameters over environment variables", () => {
    mockEnvironmentService.vars = {
      CI_PROJECT_ID: "explicit-id",
      CI_MERGE_REQUEST_IID: "explicit-mr",
    };

    const context = contextService.getContext();

    expect(context.projectId).toBe("explicit-id");
    expect(context.mrIid).toBe("explicit-mr");
  });

  test("parseWebhookPayload with merge request payload", () => {
    const payload = {
      object_kind: "merge_request" as const,
      user: {
        username: "testuser",
        name: "Test User",
      },
      project: {
        id: 123,
        path_with_namespace: "group/project",
      },
      object_attributes: {
        iid: 45,
        title: "Test MR",
        description: "Test description",
        state: "opened",
        source_branch: "feature",
        target_branch: "main",
      },
    };

    mockEnvironmentService.vars = {
      GITLAB_WEBHOOK_PAYLOAD: JSON.stringify(payload),
    };

    const parsed = contextService.parseWebhookPayload();

    expect(parsed).toEqual(payload);
  });

  test("parseWebhookPayload returns null when no payload exists", () => {
    mockEnvironmentService.vars = {};

    const parsed = contextService.parseWebhookPayload();

    expect(parsed).toBeNull();
  });

  test("parseWebhookPayload returns null for invalid JSON", () => {
    mockEnvironmentService.vars = {
      GITLAB_WEBHOOK_PAYLOAD: "invalid json",
    };

    const parsed = contextService.parseWebhookPayload();

    expect(parsed).toBeNull();
  });

  test("parseWebhookPayload handles empty payload", () => {
    mockEnvironmentService.vars = {
      GITLAB_WEBHOOK_PAYLOAD: "",
    };

    const parsed = contextService.parseWebhookPayload();

    expect(parsed).toBeNull();
  });
});
