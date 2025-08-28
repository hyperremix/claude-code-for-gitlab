import type { IEnvironmentService, IGitLabContextService } from "../interfaces";
import {
  EnvVar,
  type GitLabWebhookPayload,
  type ParsedGitLabContext,
} from "../types";

let context: ParsedGitLabContext | null = null;
let gitLabWebhookPayload: GitLabWebhookPayload | null = null;

export class GitLabContextService implements IGitLabContextService {
  constructor(private environment: IEnvironmentService) {}

  // For testing purposes - reset the module-level cache
  resetCache(): void {
    context = null;
    gitLabWebhookPayload = null;
  }

  getContext(): ParsedGitLabContext {
    if (context !== null) {
      return context;
    }
    const projectId = this.environment.get(EnvVar.CI_PROJECT_ID);
    const mrIid = this.environment.get(EnvVar.CI_MERGE_REQUEST_IID);
    const issueIid = this.environment.get(EnvVar.CLAUDE_RESOURCE_ID);
    const host =
      this.environment.get(EnvVar.CI_SERVER_URL) ?? "https://gitlab.com";
    const pipelineUrl = this.environment.get(EnvVar.CI_PIPELINE_URL);

    // Additional context from GitLab CI variables
    const commitSha = this.environment.get(EnvVar.CI_COMMIT_SHA) ?? "";
    const commitBranch = this.environment.get(EnvVar.CI_COMMIT_REF_NAME) ?? "";
    const userName =
      this.environment.get(EnvVar.GITLAB_USER_NAME) ??
      this.environment.get(EnvVar.CI_COMMIT_AUTHOR) ??
      "";
    const userEmail = this.environment.get(EnvVar.GITLAB_USER_EMAIL) ?? "";
    const triggerSource = this.environment.get(EnvVar.CI_PIPELINE_SOURCE);

    if (!projectId) {
      throw new Error("GitLab project ID is required (CI_PROJECT_ID)");
    }

    context = {
      projectId,
      mrIid,
      issueIid,
      host,
      pipelineUrl,
      commitSha,
      commitBranch,
      userName,
      userEmail,
      triggerSource,
    };
    return context;
  }

  parseWebhookPayload(): GitLabWebhookPayload | null {
    if (gitLabWebhookPayload !== null) {
      return gitLabWebhookPayload;
    }

    const payload = this.environment.get(EnvVar.GITLAB_WEBHOOK_PAYLOAD);
    if (!payload) {
      return null;
    }

    try {
      gitLabWebhookPayload = JSON.parse(payload);
      return gitLabWebhookPayload;
    } catch (error) {
      console.error("Failed to parse GitLab webhook payload:", error);
      return null;
    }
  }
}
