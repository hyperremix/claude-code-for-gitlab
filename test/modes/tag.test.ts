import { beforeEach, describe, expect, test } from "bun:test";
import type { ParsedGitLabContext } from "../../src/gitlab/context";
import { tagMode } from "../../src/modes/tag";

describe("Tag Mode", () => {
  let mockContext: ParsedGitLabContext;

  beforeEach(() => {
    mockContext = {
      projectId: "123",
      host: "https://gitlab.com",
      commitSha: "abc123",
      commitBranch: "main",
      userName: "test-user",
      userEmail: "test@example.com",
      mrIid: "1",
      issueIid: "1",
      triggerSource: "web",
    } as ParsedGitLabContext;
  });

  test("tag mode has correct properties", () => {
    expect(tagMode.name).toBe("tag");
    expect(tagMode.description).toBe(
      "Traditional implementation mode triggered by @claude mentions",
    );
    expect(tagMode.shouldCreateTrackingComment()).toBe(true);
  });

  test("shouldTrigger delegates to checkContainsTrigger", () => {
    // Mock environment variables for GitLab webhook payload
    const originalEnv = process.env.GITLAB_WEBHOOK_PAYLOAD;

    // Test with trigger phrase
    process.env.GITLAB_WEBHOOK_PAYLOAD = JSON.stringify({
      object_kind: "note",
      object_attributes: {
        note: "Hey @claude, can you help?",
        noteable_type: "MergeRequest",
      },
    });

    expect(tagMode.shouldTrigger(mockContext)).toBe(true);

    // Test without trigger phrase
    process.env.GITLAB_WEBHOOK_PAYLOAD = JSON.stringify({
      object_kind: "note",
      object_attributes: {
        note: "This is just a regular comment",
      },
    });

    expect(tagMode.shouldTrigger(mockContext)).toBe(false);

    // Test with no payload
    delete process.env.GITLAB_WEBHOOK_PAYLOAD;
    expect(tagMode.shouldTrigger(mockContext)).toBe(false);

    // Restore original environment
    if (originalEnv) {
      process.env.GITLAB_WEBHOOK_PAYLOAD = originalEnv;
    }
  });

  test("prepareContext includes all required data", () => {
    const data = {
      commentId: 123,
      baseBranch: "main",
      claudeBranch: "claude/fix-bug",
    };

    const context = tagMode.prepareContext(mockContext, data);

    expect(context.mode).toBe("tag");
    expect(context.gitlabContext).toBe(mockContext);
    expect(context.commentId).toBe(123);
    expect(context.baseBranch).toBe("main");
    expect(context.claudeBranch).toBe("claude/fix-bug");
  });

  test("prepareContext works without data", () => {
    const context = tagMode.prepareContext(mockContext);

    expect(context.mode).toBe("tag");
    expect(context.gitlabContext).toBe(mockContext);
    expect(context.commentId).toBeUndefined();
    expect(context.baseBranch).toBeUndefined();
    expect(context.claudeBranch).toBeUndefined();
  });

  test("getAllowedTools returns empty array", () => {
    expect(tagMode.getAllowedTools()).toEqual([]);
  });

  test("getDisallowedTools returns empty array", () => {
    expect(tagMode.getDisallowedTools()).toEqual([]);
  });
});
