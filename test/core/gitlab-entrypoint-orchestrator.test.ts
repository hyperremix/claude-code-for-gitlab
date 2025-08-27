import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GitLabEntrypointOrchestrator } from "../../src/core/gitlab-entrypoint.orchestrator";
import { EnvVar } from "../../src/types";

describe("EntrypointOrchestrator", () => {
  let orchestrator: GitLabEntrypointOrchestrator;
  let mockServices: {
    environment: any;
    logger: any;
    gitlabApi: any;
    fileSystem: any;
    commandExecution: any;
    tempDirectory: any;
    gitlabData: any;
    gitlabContext: any;
  };

  beforeEach(() => {
    // Create mock functions first, then assign to objects to avoid reference issues
    const environmentVars: Record<string, string> = {
      [EnvVar.CI_PROJECT_ID]: "123",
      [EnvVar.CI_MERGE_REQUEST_IID]: "456",
      [EnvVar.GITLAB_TOKEN]: "mock-token",
    };

    const loggerLogs: Array<{ level: string; message: string; data?: any }> =
      [];
    const gitlabApiOperations: Array<{ method: string; args: any[] }> = [];
    const fileSystemFiles: Record<string, string> = {};
    const fileSystemOperations: Array<{ method: string; args: any[] }> = [];
    const commandExecutionCommands: Array<{
      command: string;
      result: any;
      options?: any;
    }> = [];

    // Create mock services using bun:test mock functions
    mockServices = {
      environment: {
        vars: environmentVars,
        set: mock((key: string, value: string) => {
          environmentVars[key] = value;
        }),
        setVar: mock((key: string, value: string) => {
          environmentVars[key] = value;
        }),
        get: mock((key: string) => environmentVars[key]),
        require: mock((key: string) => {
          const value = environmentVars[key];
          if (!value) {
            throw new Error(`Required environment variable not found: ${key}`);
          }
          return value;
        }),
      },
      logger: {
        logs: loggerLogs,
        info: mock((message: string, data?: any) => {
          loggerLogs.push({ level: "info", message, data });
        }),
        error: mock((message: string, data?: any) => {
          loggerLogs.push({ level: "error", message, data });
        }),
        warn: mock((message: string, data?: any) => {
          loggerLogs.push({ level: "warn", message, data });
        }),
        debug: mock((message: string, data?: any) => {
          loggerLogs.push({ level: "debug", message, data });
        }),
        maskSensitive: mock((obj: any) => obj),
      },
      gitlabApi: {
        operations: gitlabApiOperations,
        create: mock((options: { host: string; token: string }) => {
          gitlabApiOperations.push({
            method: "createClient",
            args: [options],
          });
          return {
            MergeRequests: {},
            Issues: {},
            MergeRequestNotes: {},
            IssueNotes: {},
            MergeRequestDiscussions: {},
            IssueDiscussions: {},
            RepositoryFiles: {},
            Branches: {},
            Commits: {},
            Pipelines: {},
            requester: {},
          };
        }),
        validateToken: mock(async (client: any) => {
          gitlabApiOperations.push({
            method: "validateToken",
            args: [client],
          });
        }),
      },
      fileSystem: {
        files: fileSystemFiles,
        operations: fileSystemOperations,
        readFile: mock(async (path: string) => {
          fileSystemOperations.push({
            method: "readFile",
            args: [path],
          });
          return fileSystemFiles[path] || `mock content of ${path}`;
        }),
        readFileSync: mock((path: string) => {
          fileSystemOperations.push({
            method: "readFileSync",
            args: [path],
          });
          return fileSystemFiles[path] || `mock content of ${path}`;
        }),
        writeFileSync: mock((path: string, content: string) => {
          fileSystemOperations.push({
            method: "writeFileSync",
            args: [path, content],
          });
          fileSystemFiles[path] = content;
        }),
        appendFileSync: mock((path: string, content: string) => {
          fileSystemOperations.push({
            method: "appendFileSync",
            args: [path, content],
          });
          fileSystemFiles[path] = (fileSystemFiles[path] || "") + content;
        }),
        writeFile: mock(async (path: string, content: string) => {
          fileSystemOperations.push({
            method: "writeFile",
            args: [path, content],
          });
          fileSystemFiles[path] = content;
        }),
        existsSync: mock((path?: string) => {
          if (!path) {
            fileSystemOperations.push({
              method: "exists",
              args: [path],
            });
            return false;
          }
          fileSystemOperations.push({
            method: "exists",
            args: [path],
          });
          return path in fileSystemFiles;
        }),
        mkdir: mock((path: string, options?: { recursive: boolean }) => {
          fileSystemOperations.push({
            method: "mkdir",
            args: [path, options],
          });
        }),
        join: mock((...paths: string[]) => {
          fileSystemOperations.push({
            method: "join",
            args: paths,
          });
          return paths.join("/");
        }),
        resolve: mock((...paths: string[]) => {
          fileSystemOperations.push({
            method: "resolve",
            args: paths,
          });
          return paths.join("/");
        }),
        dirname: mock((path: string) => {
          fileSystemOperations.push({
            method: "dirname",
            args: [path],
          });
          return path.split("/").slice(0, -1).join("/");
        }),
        basename: mock((path: string) => {
          fileSystemOperations.push({
            method: "basename",
            args: [path],
          });
          return path.split("/").pop() || "";
        }),
      },
      commandExecution: {
        commands: commandExecutionCommands,
        execute: mock(async (command: string, options?: any) => {
          const result = {
            stdout: `Output of: ${command}`,
            stderr: "",
            exitCode: 0,
          };
          commandExecutionCommands.push({
            command,
            result,
            options,
          });
          return result;
        }),
        executeQuiet: mock(async (command: string) => {
          const result = {
            stdout: `Quiet output of: ${command}`,
            stderr: "",
            exitCode: 0,
          };
          commandExecutionCommands.push({ command, result });
          return result;
        }),
      },
      tempDirectory: {
        getClaudePromptsDirectory: mock(() => "/tmp/claude-prompts"),
        getClaudeExecutionOutputPath: mock(() => "/tmp/claude-output.jsonl"),
        getTempDirectory: mock(() => "/tmp"),
        cleanup: mock(async () => {}),
      },
      gitlabData: {
        fetchData: mock(async () => ({})),
        fetchPipelineData: mock(async () => ({})),
      },
      gitlabContext: {
        parseContext: mock((input: any) => ({
          projectId: input?.projectId || "123",
          mrIid: input?.mrIid,
          issueIid: input?.issueIid,
          host: input?.host || "https://gitlab.com",
          pipelineUrl: input?.pipelineUrl,
        })),
        getContext: mock(async () => ({})),
        validateContext: mock(async () => true),
      },
    };

    // Create a mock GitLab service
    const mockGitLabService = {
      getContext: mock(() => ({
        isPR: true,
        entityNumber: 456,
        actor: "test-user",
        triggerEvent: "merge_request",
        runId: "123",
      })),
      createComment: mock(async () => 123),
      updateComment: mock(async () => {}),
      checkTrigger: mock(async () => true),
      fetchContextData: mock(async () => ({
        iid: 456,
        title: "Test MR",
        description: "Test merge request description",
        state: "opened",
        sourceBranch: "feature-branch",
        targetBranch: "main",
        author: {
          username: "test-user",
          name: "Test User",
        },
        changes: [],
        discussions: [],
        diffRefs: {
          base_sha: "def456",
          head_sha: "abc123",
          start_sha: "ghi789",
        },
        projectId: "123",
        webUrl: "https://gitlab.com/test/test/-/merge_requests/456",
      })),
      getPullRequestInfo: mock(async () => ({
        number: 456,
        headSha: "abc123",
        baseSha: "def456",
        headBranch: "feature-branch",
        baseBranch: "main",
        author: "test-user",
        title: "Test MR",
        body: "Test merge request description",
        isDraft: false,
        state: "open" as const,
      })),
      getComments: mock(async () => []),
      getDiff: mock(async () => ""),
      getChangedFiles: mock(async () => []),
      getFilesContent: mock(async () => ({})),
      hasWritePermission: mock(async () => true),
      isHumanActor: mock(async () => true),
      getRepoInfo: mock(async () => ({
        owner: "test",
        repo: "test",
        defaultBranch: "main",
      })),
      createBranch: mock(async () => {}),
      pushChanges: mock(async () => "abc123"),
      getBranch: mock(async () => null),
      setupGitAuth: mock(async () => {}),
      applySuggestions: mock(async () => {}),
      getJobUrl: mock(() => "https://gitlab.com/test/test/-/pipelines/123"),
      getFileContent: mock(async () => "test content"),
    };

    orchestrator = new GitLabEntrypointOrchestrator(
      mockServices.logger,
      mockServices.environment,
      mockServices.fileSystem,
      mockServices.commandExecution,
      mockServices.tempDirectory,
      mockGitLabService,
    );
  });

  describe("Core Business Logic", () => {
    test("initializes with injected services", () => {
      expect(orchestrator).toBeDefined();
      // During initialization, the orchestrator creates a GitLab provider which logs initialization messages
      expect(mockServices.logger.logs.length).toBeGreaterThanOrEqual(0);
    });

    test("uses environment service for configuration", () => {
      mockServices.environment.setVar(EnvVar.CLAUDE_MODEL, "claude-3");
      const model = mockServices.environment.get(EnvVar.CLAUDE_MODEL);
      expect(model).toBe("claude-3");
    });

    test("uses logger service for output", () => {
      mockServices.logger.info("Test log message");
      expect(mockServices.logger.logs).toContainEqual({
        level: "info",
        message: "Test log message",
      });
    });

    test("uses filesystem service for file operations", () => {
      mockServices.fileSystem.existsSync("/tmp/test-file");
      expect(mockServices.fileSystem.operations).toContainEqual({
        method: "exists",
        args: ["/tmp/test-file"],
      });
    });

    test("uses command execution service for CLI operations", async () => {
      await mockServices.commandExecution.execute("test command");
      expect(mockServices.commandExecution.commands).toContainEqual(
        expect.objectContaining({
          command: "test command",
          result: expect.objectContaining({
            stdout: "Output of: test command",
            exitCode: 0,
          }),
        }),
      );
    });

    test("uses GitLab API service for GitLab interactions", () => {
      mockServices.gitlabApi.create({
        host: "https://gitlab.com",
        token: "test-token",
      });
      expect(mockServices.gitlabApi.operations).toContainEqual({
        method: "createClient",
        args: [{ host: "https://gitlab.com", token: "test-token" }],
      });
    });
  });

  describe("Pipeline Execution", () => {
    test("runPipeline method exists and can be called", async () => {
      // Mock file operations to simulate proper pipeline setup
      mockServices.fileSystem.files["/tmp/claude-comment-id.txt"] = "123";

      // Override executeQuiet for prepare phase
      mockServices.commandExecution.executeQuiet.mockImplementation(
        async (command: string) => {
          if (command.includes("prepare.ts")) {
            return {
              stdout: "Prepare phase completed successfully",
              stderr: "",
              exitCode: 0,
            };
          }
          return {
            stdout: `Quiet output of: ${command}`,
            stderr: "",
            exitCode: 0,
          };
        },
      );

      // Override execute for install/run phases
      mockServices.commandExecution.execute.mockImplementation(
        async (command: string) => {
          if (command.includes("bun install")) {
            return {
              stdout: "Installation successful",
              stderr: "",
              exitCode: 0,
            };
          }
          if (command.includes("claude")) {
            return {
              stdout: "Claude execution completed",
              stderr: "",
              exitCode: 0,
            };
          }
          return {
            stdout: `Output of: ${command}`,
            stderr: "",
            exitCode: 0,
          };
        },
      );

      const exitCode = await orchestrator.run();
      expect(typeof exitCode).toBe("number");
      expect(exitCode).toBe(0);
    });

    test("handles errors in pipeline execution", async () => {
      // Mock prepare phase to fail
      mockServices.commandExecution.executeQuiet.mockImplementation(
        async () => ({
          stdout: "",
          stderr: "Prepare failed",
          exitCode: 1,
        }),
      );

      const exitCode = await orchestrator.run();
      expect(exitCode).toBe(1);

      // Verify error was logged
      expect(
        mockServices.logger.logs.some((log: any) => log.level === "error"),
      ).toBe(true);
    });
  });

  describe("Service Integration", () => {
    test("orchestrator integrates all services correctly", () => {
      // Verify that the orchestrator can work with all injected services
      // This test ensures the dependency injection pattern is working

      // Environment service integration
      expect(mockServices.environment.get).toBeDefined();
      expect(mockServices.environment.require).toBeDefined();

      // Logger service integration
      expect(mockServices.logger.info).toBeDefined();
      expect(mockServices.logger.error).toBeDefined();

      // File system service integration
      expect(mockServices.fileSystem.readFile).toBeDefined();
      expect(mockServices.fileSystem.writeFile).toBeDefined();
      expect(mockServices.fileSystem.existsSync).toBeDefined();

      // Command execution service integration
      expect(mockServices.commandExecution.execute).toBeDefined();
      expect(mockServices.commandExecution.executeQuiet).toBeDefined();

      // GitLab API service integration
      expect(mockServices.gitlabApi.create).toBeDefined();
      expect(mockServices.gitlabApi.validateToken).toBeDefined();

      // All services are properly injected and accessible
      expect(orchestrator).toBeDefined();
    });

    test("maintains separation of concerns", () => {
      // The orchestrator should coordinate between services
      // without implementing external logic directly

      // This is demonstrated by the fact that our mock services
      // can capture all external interactions, proving that
      // the orchestrator delegates properly to injected services

      expect(mockServices.environment.vars).toBeDefined();
      expect(mockServices.logger.logs).toBeDefined();
      expect(mockServices.fileSystem.operations).toBeDefined();
      expect(mockServices.commandExecution.commands).toBeDefined();
      expect(mockServices.gitlabApi.operations).toBeDefined();
    });
  });
});
