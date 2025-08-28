/**
 * Core pipeline orchestration logic extracted from gitlab_entrypoint.ts
 * This class contains the main business logic for the GitLab Claude pipeline
 * with all external dependencies injected for testability
 */

import type {
  ICommandExecutionService,
  IEnvironmentService,
  IFileSystemService,
  IGitLabService,
  ILoggerService,
  ITempDirectoryService,
} from "../interfaces";
import { EnvVar } from "../types";

export type PhaseResult = {
  success: boolean;
  error?: string;
  commentId?: number;
  outputFile?: string;
};

export type PipelineContext = {
  resourceType?: string;
  resourceId?: string;
  projectPath?: string;
  serverUrl?: string;
  userLogin?: string;
  defaultBranch?: string;
  sourceBranch?: string;
  timeoutMinutes?: string;
  claudeModel?: string;
  allowedTools?: string;
  disallowedTools?: string;
  maxTurns?: string;
  claudeEnv?: string;
  fallbackModel?: string;
  anthropicApiKey?: string;
  gitlabToken?: string;
  serverHost?: string;
};

export class GitLabEntrypointOrchestrator {
  constructor(
    private logger: ILoggerService,
    private environment: IEnvironmentService,
    private fileSystem: IFileSystemService,
    private commandExecution: ICommandExecutionService,
    private tempDirectoryService: ITempDirectoryService,
    private gitLabService: IGitLabService,
  ) {}

  /**
   * Runs the complete pipeline: prepare, execute, and update phases
   */
  async run(): Promise<number> {
    let exitCode = 0;
    let prepareResult: PhaseResult = { success: false };
    let executeResult: PhaseResult = { success: false };

    try {
      // Extract context from environment
      const context = this.extractPipelineContext();

      // Phase 1: Prepare
      prepareResult = await this.runPreparePhase();

      if (!prepareResult.success) {
        // Exit early if prepare failed (no trigger found is not an error)
        if (prepareResult.error === "No trigger found") {
          this.logger.info("No Claude trigger found in the request");
          return 0;
        }
        throw new Error(`Prepare phase failed: ${prepareResult.error}`);
      }

      // Phase 2: Execute
      executeResult = await this.runExecutePhase(context);

      if (!executeResult.success) {
        exitCode = 1;
        this.logger.error(`Execute phase failed: ${executeResult.error}`);
      }

      // Phase 3: Update (always run after execution completes)
      const updateResult = await this.runUpdatePhase(
        context,
        prepareResult,
        executeResult,
      );
      if (!updateResult.success) {
        this.logger.error("Warning: Failed to update comment");
        // Don't fail the entire job just because update failed
      }
    } catch (error) {
      exitCode = 1;
      this.logger.error("Fatal error:", error);

      // Even on fatal error, try to update if we have a comment
      if (prepareResult.commentId) {
        try {
          const context = this.extractPipelineContext();
          const updateResult = await this.runUpdatePhase(
            context,
            prepareResult,
            executeResult,
          );
          if (!updateResult.success) {
            this.logger.error(
              "Warning: Failed to update comment after fatal error",
            );
          }
        } catch (updateError) {
          this.logger.error("Error during emergency update:", updateError);
        }
      }
    }

    return exitCode;
  }

  /**
   * Extracts pipeline context from environment variables
   */
  private extractPipelineContext(): PipelineContext {
    return {
      resourceType: this.environment.get(EnvVar.CLAUDE_RESOURCE_TYPE),
      resourceId: this.environment.get(EnvVar.CLAUDE_RESOURCE_ID),
      projectPath: this.environment.get(EnvVar.CI_PROJECT_PATH),
      serverUrl: this.environment.get(EnvVar.CI_SERVER_URL),
      userLogin: this.environment.get(EnvVar.GITLAB_USER_LOGIN),
      defaultBranch: this.environment.get(EnvVar.CI_DEFAULT_BRANCH),
      sourceBranch: this.environment.get(
        EnvVar.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME,
      ),
      timeoutMinutes: this.environment.get(EnvVar.TIMEOUT_MINUTES),
      claudeModel: this.environment.get(EnvVar.CLAUDE_MODEL),
      allowedTools: this.environment.get(EnvVar.ALLOWED_TOOLS),
      disallowedTools: this.environment.get(EnvVar.DISALLOWED_TOOLS),
      maxTurns: this.environment.get(EnvVar.MAX_TURNS),
      claudeEnv: this.environment.get(EnvVar.CLAUDE_ENV),
      fallbackModel: this.environment.get(EnvVar.FALLBACK_MODEL),
      anthropicApiKey: this.environment.get(EnvVar.ANTHROPIC_API_KEY),
      gitlabToken:
        this.environment.get(EnvVar.CLAUDE_CODE_GL_ACCESS_TOKEN) ||
        this.environment.get(EnvVar.CI_JOB_TOKEN),
      serverHost: this.environment.get(EnvVar.CI_SERVER_HOST),
    };
  }

  /**
   * Phase 1: Preparation - run prepare.ts and capture results
   */
  private async runPreparePhase(): Promise<PhaseResult> {
    try {
      this.logger.info("=========================================");
      this.logger.info("Phase 1: Preparing Claude Code for GitLab...");
      this.logger.info("=========================================");

      // Run prepare.ts and capture output
      const prepareScript = this.fileSystem.join(
        __dirname,
        "../entrypoints/prepare.ts",
      );
      const prepareResult = await this.commandExecution.executeQuiet(
        `bun run ${prepareScript}`,
      );

      // Print the output for debugging
      this.logger.info(prepareResult.stdout);

      if (prepareResult.exitCode !== 0) {
        this.logger.error("Prepare step failed:", prepareResult.stderr);
        return {
          success: false,
          error: prepareResult.stderr || "Prepare step failed",
        };
      }

      // Check if trigger was found by examining output
      if (prepareResult.stdout.includes("No trigger found")) {
        this.logger.info("No trigger found, exiting...");
        return {
          success: false,
          error: "No trigger found",
        };
      }

      // Extract comment ID from file written by prepare.ts
      let commentId: number | undefined;
      try {
        if (this.fileSystem.existsSync("/tmp/claude-comment-id.txt")) {
          const commentIdStr = await this.fileSystem.readFile(
            "/tmp/claude-comment-id.txt",
          );
          if (commentIdStr.trim()) {
            commentId = parseInt(commentIdStr.trim(), 10);
            this.logger.info(`Extracted comment ID from file: ${commentId}`);
          }
        }
      } catch (error) {
        this.logger.error("Error reading comment ID file:", error);
      }

      return {
        success: true,
        commentId,
      };
    } catch (error) {
      this.logger.error("Error in prepare phase:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Phase 2: Execution - install and run Claude Code
   */
  private async runExecutePhase(
    context: PipelineContext,
  ): Promise<PhaseResult> {
    try {
      this.logger.info("=========================================");
      this.logger.info("Phase 2: Installing Claude Code...");
      this.logger.info("=========================================");

      // Install Claude Code globally
      const installResult = await this.commandExecution.execute(
        "bun install -g @anthropic-ai/claude-code@1.0.60",
      );
      this.logger.info(installResult.stdout);

      if (installResult.exitCode !== 0) {
        throw new Error(
          `Failed to install Claude Code: ${installResult.stderr}`,
        );
      }

      this.logger.info("=========================================");
      this.logger.info("Phase 3: Running Claude Code...");
      this.logger.info("=========================================");

      // Get paths from temp directory utility
      const promptPath = `${this.tempDirectoryService.getClaudePromptsDirectory()}/claude-prompt.txt`;
      const outputPath =
        this.tempDirectoryService.getClaudeExecutionOutputPath();

      // Check if prompt file exists and read its content
      let promptContent = "";
      try {
        if (this.fileSystem.existsSync(promptPath)) {
          promptContent = await this.fileSystem.readFile(promptPath);
          this.logger.info(
            `Prompt file loaded, size: ${promptContent.length} characters`,
          );

          // Debug: Show first 500 chars of prompt
          if (promptContent.length > 0) {
            this.logger.info("Prompt preview (first 500 chars):");
            this.logger.info(promptContent.substring(0, 500));
            this.logger.info("...");
          }
        }
      } catch (error) {
        this.logger.error("Failed to read prompt file:", error);
      }

      // Build Claude Code CLI arguments
      const args = [
        "claude",
        "--prompt-file",
        promptPath,
        "--timeout",
        context.timeoutMinutes || "30",
        "--model",
        context.claudeModel || "sonnet",
        "--output-jsonl",
        outputPath,
      ];

      // Add optional arguments if environment variables are set
      if (context.allowedTools) {
        args.push("--allowed-tools", context.allowedTools);
      }

      if (context.disallowedTools) {
        args.push("--disallowed-tools", context.disallowedTools);
      }

      if (context.maxTurns) {
        args.push("--max-turns", context.maxTurns);
      }

      if (context.claudeEnv) {
        args.push("--claude-env", context.claudeEnv);
      }

      if (context.fallbackModel) {
        args.push("--fallback-model", context.fallbackModel);
      }

      // Set up environment for Claude Code CLI
      const env: Record<string, string> = {
        DETAILED_PERMISSION_MESSAGES: "1",
      };

      // Only add ANTHROPIC_API_KEY if it exists
      if (context.anthropicApiKey) {
        env.ANTHROPIC_API_KEY = context.anthropicApiKey;
      }

      this.logger.info(`Running Claude Code with args: ${args.join(" ")}`);

      // Run Claude Code CLI directly
      const executeResult = await this.commandExecution.execute(
        args.join(" "),
        { env },
      );

      // Print output regardless of exit code
      this.logger.info(executeResult.stdout);
      if (executeResult.stderr) {
        this.logger.error(executeResult.stderr);
      }

      return {
        success: executeResult.exitCode === 0,
        error:
          executeResult.exitCode !== 0 ? "Claude execution failed" : undefined,
        outputFile: outputPath,
      };
    } catch (error) {
      this.logger.error("Error in execute phase:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Phase 3: Update - handle git changes or post responses
   */
  private async runUpdatePhase(
    context: PipelineContext,
    prepareResult: PhaseResult,
    executeResult: PhaseResult,
  ): Promise<PhaseResult> {
    try {
      // Check if there are any git changes
      const hasChanges = await this.checkGitStatus();

      if (hasChanges) {
        this.logger.info("Git changes detected - creating merge request");
        await this.createMergeRequest(context, prepareResult, executeResult);
      } else {
        this.logger.info("No git changes detected - posting Claude's response");
        await this.postClaudeResponse(context, prepareResult);
      }

      // Also update the tracking comment if we have one
      if (!prepareResult.commentId) {
        this.logger.info("No comment ID available, skipping comment update");
        return { success: true };
      }

      this.logger.info("=========================================");
      this.logger.info("Phase 5: Updating tracking comment...");
      this.logger.info("=========================================");

      // Set up environment for update script
      const env = {
        CLAUDE_COMMENT_ID: prepareResult.commentId.toString(),
        CLAUDE_SUCCESS: executeResult.success ? "true" : "false",
        PREPARE_SUCCESS: prepareResult.success ? "true" : "false",
        OUTPUT_FILE: executeResult.outputFile || "",
        CI_ISSUE_IID: "",
      };

      // If we're in issue context, ensure CI_ISSUE_IID is set
      if (context.resourceType === "issue" && context.resourceId) {
        env.CI_ISSUE_IID = context.resourceId;
      }

      // Run update script
      const updateScript = this.fileSystem.join(
        __dirname,
        "../entrypoints/update-comment-gitlab.ts",
      );
      const updateResult = await this.commandExecution.execute(
        `bun run ${updateScript}`,
        { env },
      );

      this.logger.info(updateResult.stdout);

      if (updateResult.exitCode !== 0) {
        this.logger.error("Failed to update comment:", updateResult.stderr);
        return {
          success: false,
          error: "Failed to update comment",
        };
      }

      return { success: true };
    } catch (error) {
      this.logger.error("Error in update phase:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Checks if there are uncommitted git changes
   */
  private async checkGitStatus(): Promise<boolean> {
    try {
      // Clean up any temporary output files before checking git status
      const tempFiles = ["output.txt", "*.log", "*.tmp"];
      for (const pattern of tempFiles) {
        try {
          await this.commandExecution.executeQuiet(`rm -f ${pattern}`);
        } catch {
          // Ignore errors if files don't exist
        }
      }

      const result = await this.commandExecution.executeQuiet(
        "git status --porcelain",
      );
      return result.stdout.trim().length > 0;
    } catch (error) {
      this.logger.error("Error checking git status:", error);
      return false;
    }
  }

  /**
   * Creates a merge request with the changes
   */
  private async createMergeRequest(
    context: PipelineContext,
    prepareResult: PhaseResult,
    _executeResult: PhaseResult,
  ): Promise<void> {
    try {
      this.logger.info("=========================================");
      this.logger.info("Creating GitLab Merge Request...");
      this.logger.info("=========================================");

      // Get branch name based on context
      const timestamp = Date.now();
      const branchName =
        context.sourceBranch ||
        `claude-${context.resourceType}-${context.resourceId}-${timestamp}`;

      // Configure git
      await this.commandExecution.executeQuiet(
        'git config user.name "Claude[bot]"',
      );
      await this.commandExecution.executeQuiet(
        'git config user.email "claude-bot@noreply.gitlab.com"',
      );

      // Create and checkout new branch
      await this.commandExecution.executeQuiet(`git checkout -b ${branchName}`);
      this.logger.info(`Created branch: ${branchName}`);

      // Add all changes
      await this.commandExecution.executeQuiet("git add -A");

      // Show what files were changed
      this.logger.info("Files to be committed:");
      const statusResult =
        await this.commandExecution.executeQuiet("git status --short");
      this.logger.info(statusResult.stdout);

      // Commit with descriptive message
      const commitMessage = `fix: Apply Claude's suggestions for ${context.resourceType} #${context.resourceId}

This commit was automatically generated by Claude AI in response to a request.
See the original ${context.resourceType} for context.`;

      await this.commandExecution.executeQuiet(
        `git commit -m "${commitMessage}"`,
      );
      this.logger.info("Committed changes");

      // Push with GitLab push options to create MR
      const targetBranch = context.defaultBranch || "main";
      const mrTitle = `Apply Claude's suggestions for ${context.resourceType} #${context.resourceId}`;

      const resourceUrl = `${context.serverUrl}/${context.projectPath}/-/${
        context.resourceType === "issue" ? "issues" : "merge_requests"
      }/${context.resourceId}`;
      const mrDescription = `Automated MR by Claude AI. See ${resourceUrl} for context. /cc @${
        context.userLogin || "claude"
      }`;

      // Set up git remote with proper authentication
      const tokenType = this.environment.get(EnvVar.CLAUDE_CODE_GL_ACCESS_TOKEN)
        ? "oauth2"
        : "gitlab-ci-token";

      this.logger.info(`Using ${tokenType} for git authentication`);

      const gitRemoteUrl = `https://${tokenType}:${context.gitlabToken}@${context.serverHost}/${context.projectPath}.git`;
      await this.commandExecution.executeQuiet(
        `git remote set-url origin ${gitRemoteUrl}`,
      );

      // Push with MR creation options
      const pushCommand = `git push \\
        -o merge_request.create \\
        -o merge_request.target=${targetBranch} \\
        -o merge_request.title="${mrTitle}" \\
        -o merge_request.description="${mrDescription}" \\
        -o merge_request.remove_source_branch \\
        origin ${branchName}`;

      const pushResult = await this.commandExecution.executeQuiet(pushCommand);
      this.logger.info(pushResult.stdout);

      // Extract MR URL from push output
      const mrUrlMatch = pushResult.stdout.match(
        /https:\/\/[^\s]+\/merge_requests\/\d+/,
      );
      if (mrUrlMatch) {
        this.logger.info(`✅ Merge request created: ${mrUrlMatch[0]}`);

        // Post comment on original issue/MR about the new MR
        if (prepareResult.commentId) {
          await this.gitLabService.createComment(
            `🎯 I've created a merge request with the changes: ${mrUrlMatch[0]}\n\nPlease review and merge if the changes look good.`,
          );
        }
      }
    } catch (error) {
      this.logger.error("Error creating merge request:", error);
      throw error;
    }
  }

  /**
   * Posts Claude's response as a comment when no code changes were made
   */
  private async postClaudeResponse(
    _context: PipelineContext,
    executeResult: PhaseResult,
  ): Promise<void> {
    try {
      this.logger.info("=========================================");
      this.logger.info("Posting Claude's response to GitLab...");
      this.logger.info("=========================================");

      // Read the output file
      const outputPath =
        executeResult.outputFile ||
        this.tempDirectoryService.getClaudeExecutionOutputPath();

      try {
        const outputContent = await this.fileSystem.readFile(outputPath);

        // Parse the JSONL output (multiple JSON objects separated by newlines)
        const lines = outputContent.trim().split("\n");
        let claudeMessage = "";

        // Process each line as a separate JSON object
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const output = JSON.parse(line);

            // Look for the result in the final result object
            if (output.type === "result" && output.result) {
              claudeMessage = output.result;
              break;
            }

            // Also check assistant messages
            if (output.type === "assistant" && output.message?.content) {
              let tempMessage = "";
              for (const content of output.message.content) {
                if (content.type === "text") {
                  tempMessage += `${content.text}\n`;
                }
              }
              if (tempMessage) {
                claudeMessage = tempMessage.trim();
              }
            }
          } catch (parseError) {
            this.logger.error("Error parsing line:", parseError);
          }
        }

        if (!claudeMessage) {
          this.logger.info("No message found in Claude's output");
          this.logger.info("Output content:", outputContent.substring(0, 500));
          return;
        }

        // Post the response as a comment
        const formattedMessage = `## 🤖 Claude's Response

${claudeMessage}

---
*This response was generated by Claude AI. No code changes were made.*`;

        await this.gitLabService.createComment(formattedMessage);
        this.logger.info("✅ Posted Claude's response to GitLab");
      } catch (fileError) {
        this.logger.error("Error reading output file:", fileError);
        this.logger.error("Output path:", outputPath);
        return;
      }
    } catch (error) {
      this.logger.error("Error posting Claude's response:", error);
    }
  }
}
