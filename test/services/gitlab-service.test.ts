import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GitLabService } from "../../src/services/gitlab.service";

describe("GitLabService", () => {
  let provider: GitLabService;

  let logger: any;
  let environment: any;
  let gitLabClient: any;
  let commandExecution: any;
  let gitLabContext: any;
  let gitLabData: any;
  let tokenService: any;

  beforeEach(() => {
    // Create mock services using bun:test mock functions with proper references
    const mockEnvironmentVars = {
      GITLAB_TOKEN: "test-token",
      CI_PROJECT_ID: "123",
      CI_MERGE_REQUEST_IID: "45",
      NODE_ENV: "test",
      BUN_TEST: "1",
    } as Record<string, string>;

    logger = {
      info: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {}),
      maskSensitive: mock((obj: any) => obj),
    };

    environment = {
      vars: mockEnvironmentVars,
      get: mock((key: string) => mockEnvironmentVars[key]),
      require: mock((key: string) => {
        const value = mockEnvironmentVars[key];
        if (!value) {
          throw new Error(`Required environment variable not found: ${key}`);
        }
        return value;
      }),
      set: mock(() => {}),
      setVar: mock(() => {}),
    };

    gitLabClient = {
      // Current user methods
      showCurrentUser: mock(() =>
        Promise.resolve({ id: 1, username: "testuser", name: "Test User" }),
      ),

      // Project methods
      showProject: mock(() =>
        Promise.resolve({
          id: 123,
          path_with_namespace: "test/project",
          default_branch: "main",
        }),
      ),

      // Merge request methods
      showMergeRequest: mock(() =>
        Promise.resolve({
          iid: 45,
          title: "Test MR",
          sha: "abc123",
          diff_refs: { base_sha: "def456" },
          source_branch: "feature",
          target_branch: "main",
          author: { username: "testuser" },
          description: "Test description",
          draft: false,
          work_in_progress: false,
          state: "opened",
        }),
      ),
      showMergeRequestChanges: mock(() =>
        Promise.resolve({
          changes: [
            {
              old_path: "test.ts",
              new_path: "test.ts",
              diff: "--- a/test.ts\n+++ b/test.ts\n@@ -1,3 +1,3 @@\n-old line\n+new line",
            },
          ],
        }),
      ),
      createMergeRequestNote: mock(() =>
        Promise.resolve({ id: 1, body: "test comment" }),
      ),
      editMergeRequestNote: mock(() =>
        Promise.resolve({ id: 1, body: "updated comment" }),
      ),
      createMergeRequestDiscussion: mock(() => Promise.resolve({ id: 1 })),
      allMergeRequestDiscussions: mock(() => Promise.resolve([])),

      // Issue methods
      editIssueNote: mock(() =>
        Promise.resolve({ id: 1, body: "updated comment" }),
      ),
      allIssueDiscussions: mock(() => Promise.resolve([])),

      // Repository file methods
      showRepositoryFile: mock(() => Promise.resolve({ content: "dGVzdA==" })),

      // Branch methods
      createBranch: mock(() => Promise.resolve({ name: "test-branch" })),
      showBranch: mock(() =>
        Promise.resolve({ name: "test-branch", commit: { id: "abc123" } }),
      ),

      // Commit methods
      createCommit: mock(() => Promise.resolve({ id: "abc123" })),

      // User methods
      allUsers: mock(() =>
        Promise.resolve([
          {
            id: 1,
            username: "testuser",
            user_type: "regular",
            state: "active",
          },
        ]),
      ),
      getMember: mock(() => Promise.resolve({ access_level: 40 })),
    };

    commandExecution = {
      execute: mock(() =>
        Promise.resolve({ stdout: "", stderr: "", exitCode: 0 }),
      ),
      executeQuiet: mock(() =>
        Promise.resolve({ stdout: "", stderr: "", exitCode: 0 }),
      ),
    };

    gitLabContext = {
      getContext: mock(() => ({
        projectId: "123",
        mrIid: "45",
        issueIid: undefined,
        host: "https://gitlab.com",
        pipelineUrl: "https://gitlab.com/project/-/pipelines/789",
        userName: "testuser",
        userEmail: "testuser@example.com",
        commitSha: "abc123",
        commitBranch: "main",
        triggerSource: undefined,
      })),
      parseWebhookPayload: mock(() => null),
      resetCache: mock(() => {}),
    };

    gitLabData = {
      fetchGitLabMRData: mock(() =>
        Promise.resolve({
          projectId: "123",
          host: "https://gitlab.com",
          userName: "testuser",
        }),
      ),
      fetchGitLabIssueData: mock(() =>
        Promise.resolve({
          projectId: "123",
          host: "https://gitlab.com",
          userName: "testuser",
        }),
      ),
      fetchPipelineData: mock(() => Promise.resolve({})),
    };

    tokenService = {
      getToken: mock(() => "test-token"),
    };

    provider = new GitLabService(
      logger,
      environment,
      gitLabClient,
      commandExecution,
      gitLabData,
      gitLabContext,
      tokenService,
    );
  });

  describe("Context management", () => {
    test("getContext returns SCM context for merge request", () => {
      const context = provider.getContext();

      expect(context).toMatchObject({
        actor: "testuser",
        isPR: true,
        entityNumber: 45,
        runId: "789",
        triggerEvent: "manual",
      });
    });

    test("getContext returns SCM context without merge request", () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: "https://gitlab.com/project/-/pipelines/789",
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      const context = providerNoMR.getContext();

      expect(context).toMatchObject({
        isPR: false,
        entityNumber: 0,
        actor: "testuser",
        triggerEvent: "manual",
      });
    });
  });

  describe("Self-hosted GitLab support", () => {
    test("works with custom GitLab host", () => {
      // Create a mock context with custom host
      const customHostContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: "45",
          issueIid: undefined,
          host: "https://gitlab.company.com",
          pipelineUrl: "https://gitlab.company.com/project/-/pipelines/789",
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const selfHostedProvider = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        customHostContext,
        tokenService,
      );

      const context = (selfHostedProvider as any).context;
      expect(context.host).toBe("https://gitlab.company.com");
    });
  });

  describe("Feature parity with GitHub", () => {
    test("getJobUrl returns pipeline URL", () => {
      const url = provider.getJobUrl();
      expect(url).toBe("https://gitlab.com/project/-/pipelines/789");
    });

    test("getJobUrl returns default URL when pipeline URL not available", () => {
      // Create a mock context without pipeline URL
      const noPipelineContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: "45",
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoPipeline = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noPipelineContext,
        tokenService,
      );

      const url = providerNoPipeline.getJobUrl();
      expect(url).toBe("https://gitlab.com/123/-/pipelines");
    });
  });

  describe("Error handling", () => {
    test("getPullRequestInfo throws without MR context", async () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      await expect(providerNoMR.getPullRequestInfo()).rejects.toThrow(
        "Not in a merge request context",
      );
    });

    test("createComment throws without MR context", async () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      await expect(providerNoMR.createComment("test")).rejects.toThrow(
        "Cannot create comment without merge request or issue context",
      );
    });

    test("updateComment throws without MR context", async () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      await expect(
        providerNoMR.updateComment({ commentId: "1", body: "test" }),
      ).rejects.toThrow(
        "Cannot update comment without merge request or issue context",
      );
    });

    test("getDiff throws without MR context", async () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      await expect(providerNoMR.getDiff()).rejects.toThrow(
        "Not in a merge request context",
      );
    });

    test("getChangedFiles throws without MR context", async () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      await expect(providerNoMR.getChangedFiles()).rejects.toThrow(
        "Not in a merge request context",
      );
    });

    test("applySuggestions throws without MR context", async () => {
      // Create a mock context without MR IID
      const noMrContext = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: undefined,
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerNoMR = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        gitLabData,
        noMrContext,
        tokenService,
      );

      await expect(
        providerNoMR.applySuggestions([
          {
            file: "test.ts",
            line: 10,
            suggestion: "improved code",
          },
        ]),
      ).rejects.toThrow("Suggestions can only be applied to merge requests");
    });
  });

  describe("File operations", () => {
    test("getFilesContent handles errors gracefully", async () => {
      // Mock the client.showRepositoryFile to throw an error
      const mockClientWithError = {
        ...gitLabClient,
        showRepositoryFile: mock(() =>
          Promise.reject(new Error("File not found")),
        ),
      };

      const providerWithErrorClient = new GitLabService(
        logger,
        environment,
        mockClientWithError,
        commandExecution,
        gitLabData,
        gitLabContext,
        tokenService,
      );

      const consoleErrorSpy = mock(() => {});
      const originalConsoleError = console.error;
      console.error = consoleErrorSpy;

      const results = await providerWithErrorClient.getFilesContent(
        ["file1.txt", "file2.txt"],
        "main",
      );

      expect(results).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      console.error = originalConsoleError;
    });
  });

  describe("Trigger validation", () => {
    test("checkTrigger returns true for direct prompt", async () => {
      const result = await provider.checkTrigger("@claude", "Fix the bug");
      expect(result).toBe(true);
    });
  });

  describe("Context data fetching", () => {
    test("fetchContextData returns basic context when not in MR", async () => {
      // Mock the gitLabData to return null for non-MR contexts
      const mockGitLabData = {
        fetchGitLabMRData: mock(() => Promise.resolve(null)),
        fetchGitLabIssueData: mock(() => Promise.resolve(null)),
        fetchPipelineData: mock(() => Promise.resolve({})),
      };

      // Create a mock context that returns the expected basic context
      const mockContextForBasicData = {
        getContext: mock(() => ({
          projectId: "123",
          mrIid: undefined,
          issueIid: undefined,
          host: "https://gitlab.com",
          pipelineUrl: "https://gitlab.com/project/-/pipelines/789",
          userName: "testuser",
          userEmail: "testuser@example.com",
          commitSha: "abc123",
          commitBranch: "main",
          triggerSource: undefined,
        })),
        parseWebhookPayload: mock(() => null),
        resetCache: mock(() => {}),
      };

      const providerWithMockData = new GitLabService(
        logger,
        environment,
        gitLabClient,
        commandExecution,
        mockGitLabData,
        mockContextForBasicData,
        tokenService,
      );

      const contextData = await providerWithMockData.fetchContextData();

      expect(contextData).toEqual({
        projectId: "123",
        host: "https://gitlab.com",
        userName: "testuser",
      });
    });
  });
});
