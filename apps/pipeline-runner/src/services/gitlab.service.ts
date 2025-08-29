/**
 * GitLab Provider Implementation
 *
 * Implements the SCM Provider interface for GitLab
 * Refactored to use dependency injection for external services
 */

import type {
  BranchSchema,
  CommitAction,
  DiscussionNotePositionOptions,
  DiscussionNoteSchema,
  DiscussionSchema,
  IssueNoteSchema,
  MergeRequestNoteSchema,
} from "@gitbeaker/rest";
import type {
  ICommandExecutionService,
  IEnvironmentService,
  IGitLabAdapter,
  IGitLabContextService,
  IGitLabDataService,
  IGitLabService,
  ILoggerService,
  ITokenService,
} from "../interfaces";
import {
  EnvVar,
  type FileChange,
  type GitLabIssueData,
  type GitLabMRData,
  type ParsedGitLabContext,
  type PullRequestInfo,
  type RepoInfo,
  type SCMContext,
} from "../types";
import { checkGitLabTriggerAction } from "../validation/trigger";

export class GitLabService implements IGitLabService {
  private context: ParsedGitLabContext;
  private _mrInfo: PullRequestInfo | null = null; // Cache for MR info

  constructor(
    private logger: ILoggerService,
    private environment: IEnvironmentService,
    private client: IGitLabAdapter,
    private commandExecution: ICommandExecutionService,
    private gitLabData: IGitLabDataService,
    private gitLabContext: IGitLabContextService,
    private tokenService: ITokenService,
  ) {
    this.logger = logger;
    this.context = gitLabContext.getContext();

    this.logger.info("GitLab Provider initialized:", {
      host: this.context.host,
      projectId: this.context.projectId,
    });

    // Test token validity on initialization (skip in test environments)
    const nodeEnv = this.environment.get(EnvVar.NODE_ENV);
    const bunTest = this.environment.get(EnvVar.BUN_TEST);
    if (nodeEnv !== "test" && !bunTest) {
      this.validateToken().catch((error) => {
        this.logger.error(
          "Token validation failed during initialization:",
          error,
        );
      });
    }
  }

  private async validateToken(): Promise<void> {
    try {
      console.log("Testing token validity...");
      // Use showCurrentUser() to get current user in @gitbeaker
      const user = await this.client.showCurrentUser();
      console.log(
        `Token is valid. Authenticated as: ${user.username} (${user.name})`,
      );

      // Test project access
      try {
        const project = await this.client.showProject(this.context.projectId);
        console.log(`Project access confirmed: ${project.path_with_namespace}`);
      } catch (projectError: any) {
        console.error(
          `Cannot access project ${this.context.projectId}:`,
          projectError.message,
        );
        if (projectError.response?.status) {
          console.error(
            `Project access error status: ${projectError.response.status}`,
          );
        }
      }
    } catch (error: any) {
      console.error(`Token validation failed:`, error.message);
      if (error.response?.status) {
        console.error(
          `Token validation error status: ${error.response.status}`,
        );
      }
      throw new Error(`Invalid GitLab token: ${error.message}`);
    }
  }

  async getRepoInfo(): Promise<RepoInfo> {
    const project = await this.client.showProject(this.context.projectId);
    const [owner, repo] = project.path_with_namespace.split("/");

    return {
      owner: owner || "",
      repo: repo || "",
      defaultBranch: project.default_branch,
    };
  }

  getContext(): SCMContext {
    const webhook = this.gitLabContext.parseWebhookPayload();
    const isMR =
      !!this.context.mrIid || webhook?.object_kind === "merge_request";
    const entityNumber = this.context.mrIid
      ? parseInt(this.context.mrIid, 10)
      : this.context.issueIid
        ? parseInt(this.context.issueIid, 10)
        : 0;

    return {
      isPR: isMR,
      entityNumber,
      actor: this.context.userName || webhook?.user?.username || "",
      runId: this.context.pipelineUrl?.split("/").pop(),
      triggerEvent: webhook?.object_kind || "manual",
    };
  }

  async hasWritePermission(username: string): Promise<boolean> {
    // Skip permission checks if CC_SKIP_PRE_CHECK is set
    if (this.environment.get(EnvVar.CC_SKIP_PRE_CHECK) === "1") {
      console.log("Skipping permission check due to CC_SKIP_PRE_CHECK=1");
      return true;
    }

    // When using access tokens, we don't validate against specific usernames
    // Access tokens already have their own permissions
    if (this.environment.get(EnvVar.CLAUDE_CODE_GL_ACCESS_TOKEN)) {
      console.log("Using GitLab access token - skipping username validation");
      return true;
    }

    if (!username) {
      return false;
    }
    try {
      // 1. Find the user by username to get their ID
      console.log(`Looking up user by username: ${username}`);
      const users = await this.client.allUsers(username);

      if (users.length === 0) {
        console.log(`User '${username}' not found on GitLab instance.`);
        return false;
      }
      const user = users[0];
      if (!user) {
        return false;
      }
      const userId = user.id;
      console.log(`Found user ID: ${userId} for username: ${username}`);

      // 2. Use direct API call to check member including inherited permissions
      try {
        console.log(
          `Checking membership for project ${this.context.projectId} and user ${userId}`,
        );
        const member = await this.client.getMember({
          projectId: this.context.projectId,
          userId: userId,
        });
        console.log(`Member access level: ${member.access_level}`);
        // Developer (30), Maintainer (40), Owner (50) have write access
        return member.access_level >= 30;
      } catch (error: any) {
        console.error(`Error checking project membership:`, error);
        if ((error as any).response?.status === 404) {
          console.log(
            "User is not a member (direct or inherited) - 404 response",
          );
          return false;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error checking permissions for '${username}':`, error);
      return false;
    }
  }

  async isHumanActor(username: string): Promise<boolean> {
    try {
      console.log(`Checking if user is human: ${username}`);
      const users = await this.client.allUsers(username);

      if (users.length === 0) {
        console.log(`User '${username}' not found for human check`);
        return false; // User not found
      }
      const user = users[0];
      console.log(`User type: ${user?.user_type}, state: ${user?.state}`);
      // In GitLab, bot users have user_type 'project_bot' or similar
      // The `bot` property is a GitLab v16.0+ feature
      const isHuman =
        user?.user_type !== "project_bot" && user?.state === "active";
      console.log(`Human check result: ${isHuman}`);
      return isHuman;
    } catch (error) {
      console.error(`Error checking if user is human:`, error);
      return false;
    }
  }

  async getPullRequestInfo(): Promise<PullRequestInfo> {
    // Return cached info if available
    if (this._mrInfo) {
      return this._mrInfo;
    }

    if (!this.context.mrIid) {
      throw new Error("Not in a merge request context");
    }

    const mr = await this.client.showMergeRequest({
      projectId: this.context.projectId,
      mergeRequestIid: this.context.mrIid,
    });

    // Cache the MR info
    this._mrInfo = {
      number: mr.iid,
      headSha: mr.sha,
      baseSha: mr.diff_refs?.base_sha || mr.sha,
      headBranch: mr.source_branch,
      baseBranch: mr.target_branch,
      author: mr.author.username,
      title: mr.title,
      body: mr.description || "",
      isDraft: mr.draft || mr.work_in_progress || false,
      state:
        mr.state === "opened"
          ? "open"
          : mr.state === "merged"
            ? "merged"
            : "closed",
    };

    return this._mrInfo;
  }

  async getComments(): Promise<DiscussionNoteSchema[]> {
    let discussions: DiscussionSchema[];

    if (this.context.mrIid) {
      // Get comments from merge request
      discussions = await this.client.allMergeRequestDiscussions({
        projectId: this.context.projectId,
        mergeRequestIid: this.context.mrIid,
      });
    } else if (this.context.issueIid) {
      // Get comments from issue
      discussions = await this.client.allIssueDiscussions({
        projectId: this.context.projectId,
        issueIid: this.context.issueIid,
      });
    } else {
      return [];
    }

    const comments: DiscussionNoteSchema[] = [];
    for (const discussion of discussions) {
      for (const note of discussion.notes || []) {
        if (!note.system) {
          // Exclude system notes
          comments.push(note);
        }
      }
    }

    return comments;
  }

  async createComment(body: string): Promise<number> {
    console.log(`Creating comment for project ${this.context.projectId}`);
    console.log(
      `Context: MR IID=${this.context.mrIid}, Issue IID=${this.context.issueIid}`,
    );

    let note: MergeRequestNoteSchema | IssueNoteSchema;

    try {
      if (this.context.mrIid) {
        // Create comment on merge request using @gitbeaker
        console.log(
          `Creating MR comment for project ${this.context.projectId}, MR ${this.context.mrIid}`,
        );
        note = await this.client.createMergeRequestNote({
          projectId: this.context.projectId,
          mergeRequestIid: this.context.mrIid,
          body,
        });
      } else if (this.context.issueIid) {
        // Create comment on issue using raw fetch API for better control
        const token = this.tokenService.getToken();

        console.log(
          `Creating issue comment using raw API for project ${this.context.projectId}, issue ${this.context.issueIid}`,
        );
        console.log(
          `Token being used: length=${
            token.length
          }, prefix="${token.substring(0, 10)}..."`,
        );

        const url = `${this.context.host}/api/v4/projects/${this.context.projectId}/issues/${this.context.issueIid}/notes`;
        console.log(`API URL: ${url}`);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Try both authentication methods
        if (token.startsWith("glpat-") || token.startsWith("gloas-")) {
          headers.Authorization = `Bearer ${token}`;
          console.log("Using Bearer token authentication");
        } else {
          headers["PRIVATE-TOKEN"] = token;
          console.log("Using PRIVATE-TOKEN authentication");
        }

        console.log(`Request headers: ${JSON.stringify(Object.keys(headers))}`);

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ body }),
        });

        console.log(`Response status: ${response.status}`);
        console.log(
          `Response headers: ${JSON.stringify(
            Object.fromEntries(response.headers.entries()),
          )}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error response: ${errorText}`);
          throw new Error(
            `GitLab API error: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        note = (await response.json()) as IssueNoteSchema;
      } else {
        throw new Error(
          "Cannot create comment without merge request or issue context",
        );
      }

      console.log(`Comment created successfully with ID: ${note.id}`);
      return note.id;
    } catch (error: any) {
      console.error(`Failed to create comment:`, error.message);
      if (error.response?.status) {
        console.error(`API response status: ${error.response.status}`);
        console.error(`API response URL: ${error.response.url}`);
      }
      if (error.cause?.response?.headers) {
        console.error(
          `Response headers:`,
          Object.fromEntries(error.cause.response.headers.entries()),
        );
      }
      throw error;
    }
  }

  async updateComment({
    commentId,
    body,
  }: {
    commentId: string;
    body: string;
  }): Promise<void> {
    if (this.context.mrIid) {
      // Update comment on merge request
      await this.client.editMergeRequestNote({
        projectId: this.context.projectId,
        mergeRequestIid: this.context.mrIid,
        noteId: commentId,
        body,
      });
    } else if (this.context.issueIid) {
      // Update comment on issue
      await this.client.editIssueNote({
        projectId: this.context.projectId,
        issueIid: this.context.issueIid,
        noteId: commentId,
        body,
      });
    } else {
      throw new Error(
        "Cannot update comment without merge request or issue context",
      );
    }
  }

  async getDiff(): Promise<string> {
    if (!this.context.mrIid) {
      throw new Error("Not in a merge request context");
    }

    // GitLab changes endpoint needs special handling
    const mr = await this.client.showMergeRequestChanges({
      projectId: this.context.projectId,
      mergeRequestIid: this.context.mrIid,
    });

    // Combine all file diffs
    return mr.changes
      .map((change) => {
        const header = `diff --git a/${change.old_path} b/${change.new_path}\n`;
        return header + change.diff;
      })
      .join("\n");
  }

  async getFileContent(path: string, ref: string): Promise<string> {
    try {
      const file = await this.client.showRepositoryFile({
        projectId: this.context.projectId,
        filePath: path,
        ref,
      });

      // GitLab returns base64 encoded content
      return Buffer.from(file.content, "base64").toString("utf-8");
    } catch (error) {
      if ((error as any).response?.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async getFilesContent(
    paths: string[],
    ref: string,
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    // Batch fetch using Promise.all
    await Promise.all(
      paths.map(async (path) => {
        try {
          results[path] = await this.getFileContent(path, ref);
        } catch (error) {
          console.error(`Failed to fetch ${path}:`, error);
        }
      }),
    );

    return results;
  }

  async getChangedFiles(): Promise<FileChange[]> {
    if (!this.context.mrIid) {
      throw new Error("Not in a merge request context");
    }

    // GitLab changes endpoint needs special handling
    const mr = await this.client.showMergeRequestChanges({
      projectId: this.context.projectId,
      mergeRequestIid: this.context.mrIid,
    });

    return mr.changes.map((change) => {
      // More robust diff parsing that ignores diff headers
      const diffLines = change.diff.split("\n");
      let additions = 0;
      let deletions = 0;
      let inDiffBody = false;

      for (const line of diffLines) {
        if (line.startsWith("@@")) {
          inDiffBody = true;
          continue;
        }
        if (inDiffBody) {
          if (line.startsWith("+") && !line.startsWith("+++")) additions++;
          if (line.startsWith("-") && !line.startsWith("---")) deletions++;
        }
      }

      return {
        path: change.new_path,
        additions,
        deletions,
        patch: change.diff,
      };
    });
  }

  async createBranch(name: string, baseSha: string): Promise<void> {
    await this.client.createBranch({
      projectId: this.context.projectId,
      branchName: name,
      ref: baseSha,
    });
  }

  async pushChanges(
    branch: string,
    message: string,
    files: Record<string, string>,
  ): Promise<string> {
    // Create a commit with multiple files
    const actions: CommitAction[] = Object.entries(files).map(
      ([path, content]) => ({
        action: "update",
        filePath: path,
        content,
      }),
    );

    const commit = await this.client.createCommit({
      projectId: this.context.projectId,
      branch,
      commitMessage: message,
      actions,
    });

    return commit.id;
  }

  async getBranch(name: string): Promise<BranchSchema | null> {
    try {
      const branch = await this.client.showBranch({
        projectId: this.context.projectId,
        branchName: name,
      });

      return branch;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async setupGitAuth(): Promise<void> {
    // Configure git with GitLab credentials
    await this.commandExecution.executeQuiet(
      `git config --global user.name "${this.context.userName}"`,
    );
    await this.commandExecution.executeQuiet(
      `git config --global user.email "${this.context.userEmail}"`,
    );

    // Set up authentication for push
    const token = this.tokenService.getToken();
    const encodedToken = encodeURIComponent(token);
    const repoUrl = `https://oauth2:${encodedToken}@${this.context.host.replace(
      "https://",
      "",
    )}`;
    await this.commandExecution.executeQuiet(
      `git remote set-url origin ${repoUrl}/${this.context.projectId}.git`,
    );
  }

  async applySuggestions(
    suggestions: Array<{
      file: string;
      line: number;
      suggestion: string;
      description?: string;
    }>,
  ): Promise<void> {
    if (!this.context.mrIid) {
      throw new Error("Suggestions can only be applied to merge requests");
    }

    // Fetch and cache MR info if not already done to get the correct SHAs
    const { baseSha, headSha } = await this.getPullRequestInfo();

    // GitLab uses discussions with suggestions
    for (const s of suggestions) {
      const position: DiscussionNotePositionOptions = {
        baseSha: baseSha,
        startSha: headSha, // For new suggestions, start_sha is the same as head_sha
        headSha: headSha,
        oldPath: s.file,
        newPath: s.file,
        positionType: "text",
        newLine: s.line.toString(),
      };

      const body = `${s.description || "Suggestion"}

\`\`\`suggestion
${s.suggestion}
\`\`\``;

      await this.client.createMergeRequestDiscussion({
        projectId: this.context.projectId,
        mergeRequestIid: this.context.mrIid,
        body,
        options: { position },
      });
    }
  }

  getJobUrl(): string {
    return (
      this.context.pipelineUrl ||
      `${this.context.host}/${this.context.projectId}/-/pipelines`
    );
  }

  async checkTrigger(
    triggerPhrase: string,
    directPrompt?: string,
  ): Promise<boolean> {
    const payload = this.gitLabContext.parseWebhookPayload();
    if (!payload) {
      console.log("No GitLab webhook payload found");
      return !!directPrompt;
    }

    return checkGitLabTriggerAction({
      payload,
      triggerPhrase,
      directPrompt,
    });
  }

  async fetchContextData(): Promise<
    | GitLabMRData
    | GitLabIssueData
    | { projectId: string; host: string; userName: string }
    | null
  > {
    const mrData = await this.gitLabData.fetchGitLabMRData();
    if (mrData !== null) {
      return mrData;
    }
    const issueData = await this.gitLabData.fetchGitLabIssueData();

    if (issueData !== null) {
      return issueData;
    }

    // Return basic context if not in MR or Issue
    return {
      projectId: this.context.projectId,
      host: this.context.host,
      userName: this.context.userName,
    };
  }
}
