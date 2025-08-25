import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  sendPipelineNotification,
  sendRateLimitNotification,
} from "../../gitlab-app/src/discord";
import { setupTestEnvironment } from "../test-utils/fixtures";

// Mock logger
const mockLogger = {
  debug: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

mock.module("../../gitlab-app/src/logger", () => ({
  logger: mockLogger,
}));

// Mock fetch globally
const mockFetch = mock((_url: string, _options?: RequestInit) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
  } as Response);
});

// @ts-expect-error - Global fetch mock
global.fetch = mockFetch;

describe("Discord Notification System", () => {
  beforeEach(() => {
    // Reset all mocks
    mockFetch.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();

    // Clear environment
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  describe("sendPipelineNotification", () => {
    const baseOptions = {
      projectPath: "test/project",
      authorUsername: "testuser",
      resourceType: "issue",
      resourceId: "123",
      branch: "main",
      pipelineId: 456,
      gitlabUrl: "https://gitlab.example.com",
      triggerPhrase: "@claude",
      directPrompt: "Help me fix this bug",
    };

    test("should not send notification when DISCORD_WEBHOOK_URL is not set", () => {
      sendPipelineNotification(baseOptions);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test("should send notification when DISCORD_WEBHOOK_URL is set", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification(baseOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }),
      );
    });

    test("should construct correct embed for issue resource", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        resourceType: "issue",
        issueTitle: "Test Issue Title",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      expect(embed.title).toBe("🤖 Claude Pipeline Triggered");
      expect(embed.url).toBe(
        "https://gitlab.example.com/test/project/-/pipelines/456",
      );
      expect(embed.color).toBe(0xfc6d26);

      // Check specific fields
      const projectField = embed.fields.find((f: any) => f.name === "Project");
      expect(projectField?.value).toBe("test/project");

      const authorField = embed.fields.find(
        (f: any) => f.name === "Triggered By",
      );
      expect(authorField?.value).toBe("@testuser");

      const resourceField = embed.fields.find(
        (f: any) => f.name === "Resource",
      );
      expect(resourceField?.value).toBe("Issue #123 - Test Issue Title");

      const branchField = embed.fields.find((f: any) => f.name === "Branch");
      expect(branchField?.value).toBe("`main`");

      const pipelineField = embed.fields.find(
        (f: any) => f.name === "Pipeline ID",
      );
      expect(pipelineField?.value).toBe(
        "[#456](https://gitlab.example.com/test/project/-/pipelines/456)",
      );

      const triggerField = embed.fields.find((f: any) => f.name === "Trigger");
      expect(triggerField?.value).toBe("@claude");
    });

    test("should construct correct embed for merge request resource", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        resourceType: "merge_request",
        resourceId: "42",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const resourceField = embed.fields.find(
        (f: any) => f.name === "Resource",
      );
      expect(resourceField?.value).toBe("Merge Request !42");

      // Should include resource link for merge request
      const resourceLinkField = embed.fields.find(
        (f: any) => f.name === "View Resource",
      );
      expect(resourceLinkField?.value).toBe(
        "[Open in GitLab](https://gitlab.example.com/test/project/-/merge_requests/42)",
      );
    });

    test("should handle unknown resource type", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        resourceType: "unknown",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const resourceField = embed.fields.find(
        (f: any) => f.name === "Resource",
      );
      expect(resourceField?.value).toBe("Unknown");

      // Should not include resource link for unknown type
      const resourceLinkField = embed.fields.find(
        (f: any) => f.name === "View Resource",
      );
      expect(resourceLinkField).toBeUndefined();
    });

    test("should include prompt field when directPrompt is provided", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        directPrompt: "This is a test prompt",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const promptField = embed.fields.find((f: any) => f.name === "Prompt");
      expect(promptField?.value).toBe("This is a test prompt");
      expect(promptField?.inline).toBe(false);
    });

    test("should truncate long prompts", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      const longPrompt = "A".repeat(150);
      sendPipelineNotification({
        ...baseOptions,
        directPrompt: longPrompt,
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const promptField = embed.fields.find((f: any) => f.name === "Prompt");
      expect(promptField?.value).toBe(`${"A".repeat(100)}...`);
    });

    test("should not include prompt field when directPrompt is empty", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        directPrompt: "",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const promptField = embed.fields.find((f: any) => f.name === "Prompt");
      expect(promptField).toBeUndefined();
    });

    test("should include resource link for issue", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        resourceType: "issue",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const resourceLinkField = embed.fields.find(
        (f: any) => f.name === "View Resource",
      );
      expect(resourceLinkField?.value).toBe(
        "[Open in GitLab](https://gitlab.example.com/test/project/-/issues/123)",
      );
      expect(resourceLinkField?.inline).toBe(false);
    });

    test("should include footer and timestamp", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification(baseOptions);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      expect(embed.footer.text).toBe("GitLab Claude Webhook");
      expect(embed.footer.icon_url).toBe(
        "https://about.gitlab.com/images/press/logo/png/gitlab-icon-rgb.png",
      );
      expect(embed.timestamp).toBeDefined();
      expect(new Date(embed.timestamp)).toBeInstanceOf(Date);
    });

    test("should handle issue without title", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification({
        ...baseOptions,
        resourceType: "issue",
        // issueTitle not provided
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      const resourceField = embed.fields.find(
        (f: any) => f.name === "Resource",
      );
      expect(resourceField?.value).toBe("Issue #123");
    });

    test("should log debug message on successful notification", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendPipelineNotification(baseOptions);

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Discord notification sent successfully",
      );
    });

    test("should log warning on failed HTTP request", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      // Mock failed response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: "Bad Request",
        } as Response),
      );

      sendPipelineNotification(baseOptions);

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Discord notification failed",
        {
          status: 400,
          statusText: "Bad Request",
        },
      );
    });

    test("should log error on network failure", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      // Mock network error
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("Network error")),
      );

      sendPipelineNotification(baseOptions);

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error sending Discord notification",
        {
          error: "Network error",
        },
      );
    });
  });

  describe("sendRateLimitNotification", () => {
    test("should not send notification when DISCORD_WEBHOOK_URL is not set", () => {
      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test("should send rate limit notification when DISCORD_WEBHOOK_URL is set", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }),
      );
    });

    test("should construct correct rate limit embed", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendRateLimitNotification(
        "test/project",
        "testuser",
        "merge_request",
        "42",
      );

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      expect(embed.title).toBe("⚠️ Rate Limit Exceeded");
      expect(embed.color).toBe(0xff0000);
      expect(embed.description).toBe(
        "Claude requests have been rate-limited for @testuser",
      );

      // Check fields
      const projectField = embed.fields.find((f: any) => f.name === "Project");
      expect(projectField?.value).toBe("test/project");

      const userField = embed.fields.find((f: any) => f.name === "User");
      expect(userField?.value).toBe("@testuser");

      const resourceField = embed.fields.find(
        (f: any) => f.name === "Resource",
      );
      expect(resourceField?.value).toBe("merge_request 42");
    });

    test("should include correct footer for rate limit notification", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      expect(embed.footer.text).toBe("GitLab Claude Webhook - Rate Limited");
      expect(embed.footer.icon_url).toBe(
        "https://about.gitlab.com/images/press/logo/png/gitlab-icon-rgb.png",
      );
      expect(embed.timestamp).toBeDefined();
    });

    test("should log warning on failed rate limit notification", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      // Mock failed response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        } as Response),
      );

      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Discord rate limit notification failed",
        {
          status: 429,
        },
      );
    });

    test("should log error on network failure for rate limit notification", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      // Mock network error
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("Connection timeout")),
      );

      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error sending Discord rate limit notification",
        {
          error: "Connection timeout",
        },
      );
    });

    test("should handle errors in rate limit payload preparation", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      // Force an error by mocking JSON.stringify to throw
      const originalStringify = JSON.stringify;
      JSON.stringify = mock(() => {
        throw new Error("JSON stringify error");
      });

      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to prepare Discord rate limit notification",
        {
          error: "JSON stringify error",
        },
      );

      // Restore original JSON.stringify
      JSON.stringify = originalStringify;
    });

    test("should handle all inline field properties correctly", () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs?.[1]?.body as string);
      const embed = payload.embeds[0];

      // All fields should be inline for rate limit notifications
      embed.fields.forEach((field: any) => {
        expect(field.inline).toBe(true);
      });
    });
  });

  describe("Error Handling Integration", () => {
    test("should handle simultaneous notifications gracefully", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      const options = {
        projectPath: "test/project",
        authorUsername: "testuser",
        resourceType: "issue",
        resourceId: "123",
        branch: "main",
        pipelineId: 456,
        gitlabUrl: "https://gitlab.example.com",
        triggerPhrase: "@claude",
        directPrompt: "Test prompt",
      };

      // Send multiple notifications simultaneously
      sendPipelineNotification(options);
      sendRateLimitNotification("test/project", "testuser", "issue", "123");

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Wait for all promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not cause any conflicts
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test("should handle non-Error objects in catch blocks", async () => {
      const webhookUrl = "https://discord.com/api/webhooks/test";
      setupTestEnvironment({ DISCORD_WEBHOOK_URL: webhookUrl });

      // Mock fetch to throw non-Error object
      mockFetch.mockImplementationOnce(() => Promise.reject("String error"));

      sendPipelineNotification({
        projectPath: "test/project",
        authorUsername: "testuser",
        resourceType: "issue",
        resourceId: "123",
        branch: "main",
        pipelineId: 456,
        gitlabUrl: "https://gitlab.example.com",
        triggerPhrase: "@claude",
        directPrompt: "Test",
      });

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error sending Discord notification",
        {
          error: "String error",
        },
      );
    });
  });
});
