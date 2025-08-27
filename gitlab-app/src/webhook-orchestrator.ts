import type {
  IEnvironmentService,
  IGitLabAdapter,
  IHttpClient,
  ILoggerService,
} from "../../src/interfaces";
import { EnvVar } from "../../src/types";
import type { IDiscordService, ILimiterService } from "./interfaces";
import type { WebhookPayload } from "./types";

export interface WebhookProcessingResult {
  status: "ignored" | "disabled" | "rate-limited" | "started" | "error";
  message?: string;
  pipelineId?: number;
  branch?: string;
  errorCode?: number;
}

export class WebhookOrchestrator {
  constructor(
    private environment: IEnvironmentService,
    private logger: ILoggerService,
    private httpClient: IHttpClient,
    private gitLabAdapter: IGitLabAdapter,
    private discord: IDiscordService,
    private limiter: ILimiterService,
  ) {}

  async processWebhook(
    gitlabEvent: string | undefined,
    gitlabToken: string | undefined,
    payload: WebhookPayload,
  ): Promise<WebhookProcessingResult> {
    // Verify webhook secret
    const webhookSecret = this.environment.get(EnvVar.WEBHOOK_SECRET);
    if (gitlabToken !== webhookSecret) {
      this.logger.warn("Webhook unauthorized - invalid token");
      return { status: "error", message: "unauthorized", errorCode: 401 };
    }

    // Only handle Note Hook events
    if (gitlabEvent !== "Note Hook") {
      this.logger.debug("Ignoring non-Note Hook event", {
        event: gitlabEvent,
      });
      return { status: "ignored", message: "ignored" };
    }

    // Log webhook payload (with sensitive data masked)
    this.logger.debug("Webhook payload received", {
      payload: this.logger.maskSensitive(payload),
    });

    // Check if bot is disabled
    if (this.environment.get(EnvVar.CLAUDE_DISABLED) === "true") {
      this.logger.warn("Bot is disabled, skipping trigger");
      return { status: "disabled", message: "disabled" };
    }

    // Extract webhook data
    const note = payload.object_attributes?.note || "";
    const projectId = payload.project?.id;
    const projectPath = payload.project?.path_with_namespace;
    const mrIid = payload.merge_request?.iid;
    const issueIid = payload.issue?.iid;
    const issueTitle = payload.issue?.title;
    const authorUsername = payload.user?.username;

    // Get trigger phrase from environment or use default
    const triggerPhrase =
      this.environment.get(EnvVar.TRIGGER_PHRASE) || "@claude";
    const triggerRegex = new RegExp(
      `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    );

    // Check for trigger phrase mention
    if (!triggerRegex.test(note)) {
      this.logger.debug(`No ${triggerPhrase} mention found in note`);
      return { status: "ignored", message: "skipped" };
    }

    // Rate limit check
    const resourceId = mrIid || issueIid || "general";
    const key = `${authorUsername}:${projectId}:${resourceId}`;

    if (!(await this.limiter.limitByUser(key))) {
      this.logger.warn("Rate limit exceeded", {
        key,
        author: authorUsername,
      });

      // Send Discord notification for rate limit
      this.discord.sendRateLimitNotification(
        projectPath,
        authorUsername,
        mrIid ? "merge_request" : issueIid ? "issue" : "unknown",
        String(mrIid || issueIid || ""),
      );

      return {
        status: "rate-limited",
        message: "rate-limited",
        errorCode: 429,
      };
    }

    this.logger.info(`${triggerPhrase} triggered`, {
      project: projectPath,
      author: authorUsername,
      resourceType: mrIid ? "merge_request" : issueIid ? "issue" : "unknown",
      resourceId: mrIid || issueIid,
    });

    try {
      // Determine branch ref
      const ref = await this.determineBranchRef(
        payload,
        projectId,
        issueIid,
        issueTitle,
      );

      // Extract the prompt after the trigger phrase
      const promptMatch = note.match(
        new RegExp(
          `${triggerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.*)`,
          "is",
        ),
      );
      const directPrompt = promptMatch ? promptMatch[1].trim() : "";

      // Create minimal webhook payload for CI/CD variable (10KB limit)
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

      // Trigger pipeline with variables
      const variables = {
        CLAUDE_TRIGGER: "true",
        CLAUDE_AUTHOR: authorUsername,
        CLAUDE_RESOURCE_TYPE: mrIid ? "merge_request" : "issue",
        CLAUDE_RESOURCE_ID: String(mrIid || issueIid || ""),
        CLAUDE_NOTE: note,
        CLAUDE_PROJECT_PATH: projectPath,
        CLAUDE_BRANCH: ref,
        TRIGGER_PHRASE: triggerPhrase,
        DIRECT_PROMPT: directPrompt,
        GITLAB_WEBHOOK_PAYLOAD: JSON.stringify(minimalPayload),
      };

      this.logger.info("Triggering pipeline", {
        projectId,
        ref,
        variables: this.logger.maskSensitive(variables),
      });

      const pipelineId = await this.triggerPipeline(projectId, ref, variables);

      this.logger.info("Pipeline triggered successfully", {
        pipelineId,
        projectId,
        ref,
      });

      // Send Discord notification (fire-and-forget)
      this.discord.sendPipelineNotification({
        projectPath,
        authorUsername,
        resourceType: mrIid ? "merge_request" : issueIid ? "issue" : "unknown",
        resourceId: String(mrIid || issueIid || ""),
        branch: ref,
        pipelineId,
        gitlabUrl:
          this.environment.get(EnvVar.GITLAB_URL) || "https://gitlab.com",
        triggerPhrase,
        directPrompt,
        issueTitle: issueTitle || undefined,
      });

      // Cancel old pipelines if configured
      if (this.environment.get(EnvVar.CANCEL_OLD_PIPELINES) === "true") {
        await this.cancelOldPipelines(projectId, pipelineId, ref);
      }

      return { status: "started", pipelineId, branch: ref };
    } catch (error) {
      this.logger.error("Failed to trigger pipeline", {
        error: error instanceof Error ? error.message : error,
        projectId: payload.project?.id,
      });
      return {
        status: "error",
        message: "Failed to trigger pipeline",
        errorCode: 500,
      };
    }
  }

  private async determineBranchRef(
    payload: WebhookPayload,
    projectId: number,
    issueIid?: number,
    issueTitle?: string,
  ): Promise<string> {
    let ref = payload.merge_request?.source_branch;

    // For issues, create a branch
    if (issueIid && !payload.merge_request?.iid) {
      // Get project details for default branch
      const project = await this.getProject(projectId);
      const defaultBranch = project.default_branch || "main";

      // Generate branch name with timestamp to ensure uniqueness
      const timestamp = Date.now();
      const branchName = `claude/issue-${issueIid}-${this.sanitizeBranchName(
        issueTitle || "",
      )}-${timestamp}`;

      this.logger.info("Creating branch for issue", {
        issueIid,
        branchName,
        fromBranch: defaultBranch,
      });

      // Try to create the branch
      await this.createBranch(projectId, branchName, defaultBranch);
      ref = branchName;
    } else if (!ref) {
      // For merge requests without a source branch, fail
      this.logger.error("No branch ref determined for merge request");
      throw new Error("No branch ref determined for merge request");
    }

    return ref;
  }

  private async triggerPipeline(
    projectId: number,
    ref: string,
    variables?: Record<string, string>,
  ): Promise<number> {
    try {
      this.logger.debug("Creating pipeline", {
        projectId,
        ref,
        variables: this.logger.maskSensitive(variables),
      });

      const gitlabUrl =
        this.environment.get(EnvVar.GITLAB_URL) || "https://gitlab.com";
      const token = this.environment.require(EnvVar.GITLAB_TOKEN);

      // Transform variables to GitLab API format
      const pipelineVariables = variables
        ? Object.entries(variables).map(([key, value]) => ({ key, value }))
        : [];

      const requestBody = {
        ref,
        variables: pipelineVariables,
      };

      this.logger.debug("Pipeline request body", {
        url: `${gitlabUrl}/api/v4/projects/${projectId}/pipeline`,
        body: {
          ...requestBody,
          variables: this.logger.maskSensitive(pipelineVariables),
        },
      });

      const response = await this.httpClient.fetch(
        `${gitlabUrl}/api/v4/projects/${projectId}/pipeline`,
        {
          method: "POST",
          headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        this.logger.error("Failed to parse pipeline response", {
          status: response.status,
          statusText: response.statusText,
          responseText,
        });
        throw new Error(
          `Pipeline API returned invalid JSON: ${response.statusText}`,
        );
      }

      if (!response.ok) {
        this.logger.error("Pipeline creation failed", {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseData,
          projectId,
          ref,
        });
        throw new Error(
          responseData.message ||
            responseData.error ||
            `Pipeline creation failed: ${response.statusText}`,
        );
      }

      this.logger.info("Pipeline created successfully", {
        pipelineId: responseData.id,
        webUrl: responseData.web_url,
        status: responseData.status,
      });

      return responseData.id;
    } catch (error) {
      this.logger.error("Failed to create pipeline", {
        error: error instanceof Error ? error.message : error,
        projectId,
        ref,
      });
      throw error;
    }
  }

  private async cancelOldPipelines(
    projectId: number,
    keepPipelineId: number,
    ref: string,
  ): Promise<void> {
    try {
      this.logger.debug("Fetching pipelines for cancellation", {
        projectId,
        ref,
      });

      // List pipelines for the ref
      const pipelines = await this.gitLabAdapter.allPipelines({
        projectId,
        options: {
          ref,
          status: "pending",
        },
      });

      // Cancel old pipelines
      const cancelPromises = pipelines
        .filter((p) => p.id !== keepPipelineId)
        .map((p) =>
          this.gitLabAdapter
            .cancelPipeline({ projectId, pipelineId: p.id })
            .catch((err) => {
              this.logger.warn(`Failed to cancel pipeline ${p.id}:`, {
                error: err instanceof Error ? err.message : err,
              });
            }),
        );

      await Promise.all(cancelPromises);
      this.logger.info("Old pipelines cancelled", {
        count: cancelPromises.length,
      });
    } catch (error) {
      this.logger.error("Error cancelling old pipelines:", {
        error: error instanceof Error ? error.message : error,
      });
      // Don't throw - this is not critical
    }
  }

  private async getProject(projectId: number): Promise<{
    id: number;
    default_branch: string;
    path_with_namespace: string;
  }> {
    try {
      this.logger.debug("Fetching project details", { projectId });

      const project = await this.gitLabAdapter.showProject(projectId);

      return {
        id: project.id,
        default_branch: project.default_branch || "main",
        path_with_namespace: project.path_with_namespace,
      };
    } catch (error) {
      this.logger.error("Failed to fetch project", {
        error: error instanceof Error ? error.message : error,
        projectId,
      });
      throw error;
    }
  }

  private async createBranch(
    projectId: number,
    branchName: string,
    ref: string,
  ): Promise<void> {
    try {
      this.logger.info("Creating new branch", {
        projectId,
        branchName,
        ref,
      });

      const gitlabUrl =
        this.environment.get(EnvVar.GITLAB_URL) || "https://gitlab.com";
      const token = this.environment.require(EnvVar.GITLAB_TOKEN);

      const response = await this.httpClient.fetch(
        `${gitlabUrl}/api/v4/projects/${projectId}/repository/branches`,
        {
          method: "POST",
          headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            branch: branchName,
            ref: ref,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Branch creation failed: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use raw error text if not JSON
          errorMessage = errorText || errorMessage;
        }

        this.logger.error("Branch creation API error", {
          status: response.status,
          errorMessage,
          projectId,
          branchName,
          ref,
        });

        throw new Error(errorMessage);
      }

      this.logger.info("Branch created successfully", {
        projectId,
        branchName,
      });
    } catch (error) {
      this.logger.error("Failed to create branch", {
        error: error instanceof Error ? error.message : error,
        projectId,
        branchName,
        ref,
      });
      throw error;
    }
  }

  private sanitizeBranchName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-") // Replace non-alphanumeric chars with dashes
      .replace(/-+/g, "-") // Replace multiple dashes with single dash
      .replace(/^-|-$/g, "") // Remove leading/trailing dashes
      .substring(0, 50); // Limit length
  }
}
