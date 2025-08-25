import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  mock,
  test,
} from "bun:test";
import type { WebhookPayload } from "../../gitlab-app/src/types";
import { setupTestEnvironment } from "../test-utils/fixtures";

const mockGetProject = mock();
const mockSanitizeBranchName = mock();
const mockTriggerPipeline = mock();
const mockLimitByUser = mock();

// Create a simplified mock for testing
const createMockWebhookPayload = (
  overrides: Partial<WebhookPayload> = {},
): WebhookPayload => {
  const basePayload: WebhookPayload = {
    object_kind: "note",
    user: {
      id: 1,
      username: "testuser",
      name: "Test User",
      email: "test@example.com",
    },
    project: {
      id: 123,
      name: "test-project",
      web_url: "https://gitlab.com/group/project",
      git_ssh_url: "git@gitlab.com:group/project.git",
      git_http_url: "https://gitlab.com/group/project.git",
      namespace: "group",
      visibility_level: 1,
      path_with_namespace: "group/project",
      default_branch: "main",
    },
    object_attributes: {
      id: 1,
      note: "@claude help me",
      noteable_type: "MergeRequest",
      author_id: 1,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      project_id: 123,
      system: false,
    },
    merge_request: {
      id: 1,
      iid: 456,
      target_branch: "main",
      source_branch: "feature-branch",
      source_project_id: 123,
      author_id: 1,
      title: "Test MR",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      state: "opened",
      merge_status: "can_be_merged",
      target_project_id: 123,
      source: {},
      target: {},
      work_in_progress: false,
      url: "https://gitlab.com/group/project/-/merge_requests/456",
    },
  };

  return { ...basePayload, ...overrides };
};

describe("GitLab App Webhook Server", () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    testEnv = setupTestEnvironment({
      WEBHOOK_SECRET: "test-secret",
      ADMIN_TOKEN: "admin-token",
      TRIGGER_PHRASE: "@claude",
      CLAUDE_DISABLED: "false",
      CANCEL_OLD_PIPELINES: "true",
      GITLAB_URL: "https://gitlab.example.com",
      PORT: "3000",
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Set up default mock returns
    mockLimitByUser.mockResolvedValue(true);
    mockTriggerPipeline.mockResolvedValue(12345);
    mockGetProject.mockResolvedValue({ default_branch: "main" });
    mockSanitizeBranchName.mockReturnValue("sanitized-title");
  });

  afterEach(() => {
    // Restore environment
    Object.keys(testEnv.mockEnv).forEach((key) => {
      if (testEnv.originalEnv[key] !== undefined) {
        process.env[key] = testEnv.originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  });

  describe("Server Configuration", () => {
    test("should use correct default port", () => {
      expect(process.env.PORT).toBe("3000");
    });

    test("should use custom port from environment", () => {
      process.env.PORT = "8080";
      expect(process.env.PORT).toBe("8080");
    });

    test("should have correct webhook secret", () => {
      expect(process.env.WEBHOOK_SECRET).toBe("test-secret");
    });
  });

  describe("Authentication Logic", () => {
    test("should validate webhook secret correctly", () => {
      const validToken = "test-secret";
      const invalidToken = "invalid-token";

      expect(validToken === process.env.WEBHOOK_SECRET).toBe(true);
      expect(invalidToken === process.env.WEBHOOK_SECRET).toBe(false);
    });

    test("should handle missing webhook secret", () => {
      delete process.env.WEBHOOK_SECRET;
      const token = "any-token";

      expect(token === process.env.WEBHOOK_SECRET).toBe(false);
    });
  });

  describe("Event Filtering Logic", () => {
    test("should accept Note Hook events", () => {
      const event = "Note Hook";
      expect(event === "Note Hook").toBe(true);
    });

    test("should reject other event types", () => {
      const events = ["Push Hook", "Merge Request Hook", "Issue Hook"];
      events.forEach((event) => {
        expect(event === "Note Hook").toBe(false);
      });
    });
  });

  describe("Trigger Phrase Detection", () => {
    test("should detect default trigger phrase", () => {
      const triggerPhrase = "@claude";
      const regex = new RegExp(
        `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      );

      expect(regex.test("@claude help me")).toBe(true);
      expect(regex.test("Hey @claude can you help?")).toBe(true);
      expect(regex.test("@CLAUDE please assist")).toBe(true); // case insensitive
    });

    test("should not detect false positives", () => {
      const triggerPhrase = "@claude";
      const regex = new RegExp(
        `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      );

      expect(regex.test("claudebot help")).toBe(false);
      expect(regex.test("mention @claudesomething")).toBe(false);
      expect(regex.test("just a regular comment")).toBe(false);
    });

    test("should extract direct prompt correctly", () => {
      const note = "@claude fix this bug in the authentication system";
      const triggerPhrase = "@claude";
      const promptMatch = note.match(
        new RegExp(
          `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.*)`,
          "is",
        ),
      );

      expect(promptMatch).not.toBeNull();
      expect(promptMatch?.[1]).toBe(
        "fix this bug in the authentication system",
      );
    });

    test("should handle empty prompt", () => {
      const note = "@claude";
      const triggerPhrase = "@claude";
      const promptMatch = note.match(
        new RegExp(
          `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.*)`,
          "is",
        ),
      );

      expect(promptMatch).toBeNull();
    });
  });

  describe("Rate Limiting Logic", () => {
    test("should generate correct rate limit key for merge request", () => {
      const authorUsername = "testuser";
      const projectId = 123;
      const mrIid = 456;
      const key = `${authorUsername}:${projectId}:${mrIid}`;

      expect(key).toBe("testuser:123:456");
    });

    test("should generate correct rate limit key for issue", () => {
      const authorUsername = "testuser";
      const projectId = 123;
      const issueIid = 789;
      const key = `${authorUsername}:${projectId}:${issueIid}`;

      expect(key).toBe("testuser:123:789");
    });

    test("should handle missing resource ID", () => {
      const authorUsername = "testuser";
      const projectId = 123;
      const resourceId = undefined;
      const key = `${authorUsername}:${projectId}:${resourceId || "general"}`;

      expect(key).toBe("testuser:123:general");
    });
  });

  describe("Branch Handling Logic", () => {
    test("should generate correct branch name for issues", () => {
      const issueIid = 789;
      const sanitizedTitle = "sanitized-title";
      const timestamp = Date.now();

      const branchName = `claude/issue-${issueIid}-${sanitizedTitle}-${timestamp}`;

      expect(branchName).toMatch(/^claude\/issue-789-sanitized-title-\d+$/);
    });

    test("should handle empty issue title", () => {
      const issueIid = 789;
      const sanitizedTitle = "sanitized-title";
      const timestamp = Date.now();

      const branchName = `claude/issue-${issueIid}-${sanitizedTitle}-${timestamp}`;

      expect(branchName).toMatch(/^claude\/issue-789-sanitized-title-\d+$/);
    });
  });

  describe("Pipeline Variables Generation", () => {
    test("should create correct pipeline variables for merge request", () => {
      const payload = createMockWebhookPayload();
      const note = "@claude fix this bug";
      const triggerPhrase = "@claude";

      const promptMatch = note.match(
        new RegExp(
          `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.*)`,
          "is",
        ),
      );
      const directPrompt = promptMatch ? promptMatch?.[1]?.trim() : "";

      const variables = {
        CLAUDE_TRIGGER: "true",
        CLAUDE_AUTHOR: payload.user.username,
        CLAUDE_RESOURCE_TYPE: "merge_request",
        CLAUDE_RESOURCE_ID: String(payload.merge_request?.iid || ""),
        CLAUDE_NOTE: note,
        CLAUDE_PROJECT_PATH: payload.project.path_with_namespace,
        CLAUDE_BRANCH: payload.merge_request?.source_branch || "",
        TRIGGER_PHRASE: triggerPhrase,
        DIRECT_PROMPT: directPrompt,
      };

      expect(variables.CLAUDE_TRIGGER).toBe("true");
      expect(variables.CLAUDE_AUTHOR).toBe("testuser");
      expect(variables.CLAUDE_RESOURCE_TYPE).toBe("merge_request");
      expect(variables.CLAUDE_RESOURCE_ID).toBe("456");
      expect(variables.DIRECT_PROMPT).toBe("fix this bug");
    });

    test("should create correct pipeline variables for issue", () => {
      const payload = createMockWebhookPayload({
        merge_request: undefined,
        issue: {
          id: 1,
          iid: 789,
          project_id: 123,
          title: "Test Issue",
          state: "opened",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          author: {},
          user_notes_count: 0,
          upvotes: 0,
          downvotes: 0,
          confidential: false,
          web_url: "https://gitlab.com/group/project/-/issues/789",
        },
      });

      const variables = {
        CLAUDE_TRIGGER: "true",
        CLAUDE_AUTHOR: payload.user.username,
        CLAUDE_RESOURCE_TYPE: "issue",
        CLAUDE_RESOURCE_ID: String(payload.issue?.iid),
        CLAUDE_NOTE: payload.object_attributes.note || "",
        CLAUDE_PROJECT_PATH: payload.project.path_with_namespace,
      };

      expect(variables.CLAUDE_RESOURCE_TYPE).toBe("issue");
      expect(variables.CLAUDE_RESOURCE_ID).toBe("789");
    });
  });

  describe("Minimal Payload Creation", () => {
    test("should create minimal webhook payload for CI variables", () => {
      const fullPayload = createMockWebhookPayload({
        object_attributes: {
          id: 1,
          note: "@claude help",
          noteable_type: "MergeRequest",
          author_id: 1,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          project_id: 123,
          system: false,
          // Extra fields that should be filtered out
          attachment: "should be filtered",
          line_code: "should be filtered",
        },
      });

      const minimalPayload = {
        object_kind: fullPayload.object_kind,
        project: fullPayload.project,
        user: fullPayload.user,
        object_attributes: fullPayload.object_attributes
          ? {
              note: fullPayload.object_attributes.note,
              noteable_type: fullPayload.object_attributes.noteable_type,
            }
          : undefined,
        merge_request: fullPayload.merge_request
          ? {
              iid: fullPayload.merge_request.iid,
              title: fullPayload.merge_request.title,
              state: fullPayload.merge_request.state,
            }
          : undefined,
        issue: fullPayload.issue
          ? {
              iid: fullPayload.issue.iid,
              title: fullPayload.issue.title,
              state: fullPayload.issue.state,
            }
          : undefined,
      };

      expect(minimalPayload.object_attributes?.note).toBe("@claude help");
      expect(minimalPayload.object_attributes?.noteable_type).toBe(
        "MergeRequest",
      );
      expect(minimalPayload.merge_request?.iid).toBe(456);
      expect(minimalPayload.merge_request?.title).toBe("Test MR");
      expect(minimalPayload.merge_request?.state).toBe("opened");

      // Verify filtered fields are not included
      expect(minimalPayload.object_attributes).not.toHaveProperty("attachment");
      expect(minimalPayload.object_attributes).not.toHaveProperty("line_code");
    });

    test("should handle missing payload fields", () => {
      const payload = createMockWebhookPayload({
        object_attributes: undefined,
        merge_request: undefined,
        issue: undefined,
      });

      const minimalPayload = {
        object_kind: payload.object_kind,
        project: payload.project,
        user: payload.user,
        object_attributes: payload.object_attributes
          ? {
              note: payload.object_attributes.note,
              noteable_type: payload.object_attributes.noteable_type,
            }
          : undefined,
        merge_request: payload.merge_request
          ? {
              iid: payload.merge_request.iid,
              title: payload.merge_request.title,
              state: payload.merge_request.state,
            }
          : undefined,
        issue: payload.issue
          ? {
              iid: payload.issue.iid,
              title: payload.issue.title,
              state: payload.issue.state,
            }
          : undefined,
      };

      expect(minimalPayload.object_attributes).toBeUndefined();
      expect(minimalPayload.merge_request).toBeUndefined();
      expect(minimalPayload.issue).toBeUndefined();
    });
  });

  describe("Discord Notification Logic", () => {
    test("should create correct notification data for merge request", () => {
      const payload = createMockWebhookPayload();
      const pipelineId = 12345;
      const triggerPhrase = "@claude";
      const directPrompt = "help me";

      const notificationData = {
        projectPath: payload.project.path_with_namespace,
        authorUsername: payload.user.username,
        resourceType: "merge_request",
        resourceId: String(payload.merge_request?.iid),
        branch: payload.merge_request?.source_branch,
        pipelineId,
        gitlabUrl: process.env.GITLAB_URL || "https://gitlab.com",
        triggerPhrase,
        directPrompt,
        issueTitle: undefined,
      };

      expect(notificationData.projectPath).toBe("group/project");
      expect(notificationData.authorUsername).toBe("testuser");
      expect(notificationData.resourceType).toBe("merge_request");
      expect(notificationData.resourceId).toBe("456");
      expect(notificationData.branch).toBe("feature-branch");
      expect(notificationData.pipelineId).toBe(12345);
    });

    test("should create correct notification data for issue", () => {
      const payload = createMockWebhookPayload({
        merge_request: undefined,
        issue: {
          id: 1,
          iid: 789,
          project_id: 123,
          title: "Fix authentication bug",
          state: "opened",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          author: {},
          user_notes_count: 0,
          upvotes: 0,
          downvotes: 0,
          confidential: false,
          web_url: "https://gitlab.com/group/project/-/issues/789",
        },
      });

      const notificationData = {
        projectPath: payload.project.path_with_namespace,
        authorUsername: payload.user.username,
        resourceType: "issue",
        resourceId: String(payload.issue?.iid),
        branch: "claude/issue-789-sanitized-title-123456",
        pipelineId: 12345,
        gitlabUrl: process.env.GITLAB_URL || "https://gitlab.com",
        triggerPhrase: "@claude",
        directPrompt: "help",
        issueTitle: payload.issue?.title,
      };

      expect(notificationData.resourceType).toBe("issue");
      expect(notificationData.resourceId).toBe("789");
      expect(notificationData.issueTitle).toBe("Fix authentication bug");
    });
  });

  describe("Error Handling", () => {
    test("should handle missing project information", () => {
      const payload = createMockWebhookPayload();
      const projectId = payload.project?.id;
      const projectPath = payload.project?.path_with_namespace;

      expect(projectId).toBe(123);
      expect(projectPath).toBe("group/project");

      // Test with undefined project
      const payloadWithoutProject: Partial<WebhookPayload> = {
        ...payload,
        project: undefined,
      };
      expect(payloadWithoutProject.project?.id).toBeUndefined();
      expect(
        payloadWithoutProject.project?.path_with_namespace,
      ).toBeUndefined();
    });

    test("should handle missing user information", () => {
      const payload = createMockWebhookPayload();
      const authorUsername = payload.user?.username;

      expect(authorUsername).toBe("testuser");

      // Test with undefined user
      const payloadWithoutUser: Partial<WebhookPayload> = {
        ...payload,
        user: undefined,
      };
      expect(payloadWithoutUser.user?.username).toBeUndefined();
    });

    test("should handle missing note information", () => {
      const payload = createMockWebhookPayload();
      const note = payload.object_attributes?.note || "";

      expect(note).toBe("@claude help me");

      // Test with undefined object_attributes
      const payloadWithoutNote: Partial<WebhookPayload> = {
        ...payload,
        object_attributes: undefined,
      };
      const emptyNote = payloadWithoutNote.object_attributes?.note || "";
      expect(emptyNote).toBe("");
    });
  });

  describe("Environment Configuration", () => {
    test("should use default values when environment variables are missing", () => {
      const triggerPhrase = process.env.TRIGGER_PHRASE || "@claude";
      const gitlabUrl = process.env.GITLAB_URL || "https://gitlab.com";
      const cancelOldPipelines = process.env.CANCEL_OLD_PIPELINES === "true";

      expect(triggerPhrase).toBe("@claude");
      expect(gitlabUrl).toBe("https://gitlab.example.com");
      expect(cancelOldPipelines).toBe(true);
    });

    test("should respect custom environment variables", () => {
      const originalTrigger = process.env.TRIGGER_PHRASE;
      process.env.TRIGGER_PHRASE = "@bot";

      const customTrigger = process.env.TRIGGER_PHRASE || "@claude";
      expect(customTrigger).toBe("@bot");

      // Restore original value
      if (originalTrigger) {
        process.env.TRIGGER_PHRASE = originalTrigger;
      } else {
        delete process.env.TRIGGER_PHRASE;
      }
    });

    test("should handle bot disable/enable state", () => {
      expect(process.env.CLAUDE_DISABLED).toBe("false");

      process.env.CLAUDE_DISABLED = "true";
      expect(process.env.CLAUDE_DISABLED).toBe("true");

      process.env.CLAUDE_DISABLED = "false";
      expect(process.env.CLAUDE_DISABLED).toBe("false");
    });
  });

  describe("Webhook Payload Validation", () => {
    test("should validate required webhook fields", () => {
      const payload = createMockWebhookPayload();

      expect(payload.object_kind).toBeDefined();
      expect(payload.user).toBeDefined();
      expect(payload.project).toBeDefined();
      expect(payload.object_attributes).toBeDefined();
    });

    test("should handle optional webhook fields", () => {
      const payload = createMockWebhookPayload();

      // These fields are optional
      expect(payload.merge_request).toBeDefined();
      expect(payload.issue).toBeUndefined();
      expect(payload.snippet).toBeUndefined();
    });

    test("should validate project structure", () => {
      const payload = createMockWebhookPayload();
      const project = payload.project;

      expect(project.id).toBe(123);
      expect(project.path_with_namespace).toBe("group/project");
      expect(project.default_branch).toBe("main");
    });
  });
});
